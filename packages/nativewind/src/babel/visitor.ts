import type { Visitor } from "@babel/traverse";

import { getImportBlockedComponents } from "./utils/get-import-blocked-components";
import { someAttributes } from "./utils/has-attribute";

import { AllowPathOptions, TailwindcssReactNativeBabelOptions } from "./types";

import {
  arrayExpression,
  Expression,
  identifier,
  isJSXIdentifier,
  isJSXMemberExpression,
  JSXAttribute,
  jSXAttribute,
  JSXElement,
  jsxExpressionContainer,
  jSXIdentifier,
  JSXOpeningElement,
  memberExpression,
  stringLiteral,
} from "@babel/types";
import { PluginPass } from "@babel/core";

export interface VisitorState extends PluginPass {
  opts: TailwindcssReactNativeBabelOptions;
  filename: string;
  allowModuleTransform: AllowPathOptions;
  allowRelativeModules: AllowPathOptions;
  blockList: Set<string>;
  canCompile: boolean;
  canTransform: boolean;
  didTransform: boolean;
}

export const visitor: Visitor<VisitorState> = {
  ImportDeclaration(path, state) {
    for (const component of getImportBlockedComponents(path, state)) {
      state.blockList.add(component);
    }
  },
  JSXElement: {
    exit: (path, state) => {
      const { blockList, canTransform } = state;

      if (
        isWrapper(path.node) ||
        !canTransform ||
        !someAttributes(path, ["className"])
      ) {
        return;
      }

      const name = getElementName(path.node.openingElement);

      if (blockList.has(name) || name[0] !== name[0].toUpperCase()) {
        return;
      }

      state.didTransform ||= true;

      // path.replaceWith(
      //   jsxElement(
      //     jsxOpeningElement(jsxIdentifier("_StyledComponent"), [
      //       ...path.node.openingElement.attributes,
      //       jSXAttribute(
      //         jSXIdentifier("component"),
      //         jsxExpressionContainer(
      //           toExpression(path.node.openingElement.name)
      //         )
      //       ),
      //     ]),
      //     jsxClosingElement(jsxIdentifier("_StyledComponent")),
      //     path.node.children
      //   )
      // );

      // Find className and style attributes
      const classNameAttribute = path.node.openingElement.attributes.find(
        (attribute) =>
          attribute.type === "JSXAttribute" &&
          attribute.name.name === "className"
      ) as JSXAttribute;

      if (!classNameAttribute) {
        return;
      }
      // Extract className value

      // @ts-expect-error - classNameAttribute is guaranteed to be a JSXAttribute
      const className: string = classNameAttribute.value.value;

      const styleAttribute = path.node.openingElement.attributes.find(
        (attribute) =>
          attribute.type === "JSXAttribute" && attribute.name.name === "style"
      ) as JSXAttribute | undefined;

      // TODO: if class name has multiple tokens, change to an array expression
      const nativewindStylesExpression = memberExpression(
        identifier("NW_STYLES"),
        stringLiteral(className),
        true
      );

      // Create a new style attribute based on whether an existing one is found
      const newStyle =
        styleAttribute &&
        styleAttribute.value &&
        "expression" in styleAttribute.value
          ? jSXAttribute(
              jSXIdentifier("style"),
              jsxExpressionContainer(
                arrayExpression([
                  styleAttribute.value.expression as Expression,
                  nativewindStylesExpression,
                ])
              )
            )
          : jSXAttribute(
              jSXIdentifier("style"),
              jsxExpressionContainer(nativewindStylesExpression)
            );

      // Replace or add the new style attribute
      if (styleAttribute) {
        styleAttribute.value = newStyle.value;
      }

      path.node.openingElement.attributes.push(newStyle);
      // Remove the "className" attribute
      path.node.openingElement.attributes =
        path.node.openingElement.attributes.filter(
          (attribute) => attribute !== classNameAttribute
        );
    },
  },
};

function isWrapper(node: JSXElement) {
  const nameNode = node.openingElement.name;
  if (isJSXIdentifier(nameNode)) {
    return (
      nameNode.name === "_StyledComponent" ||
      nameNode.name === "StyledComponent"
    );
  } else if (isJSXMemberExpression(nameNode)) {
    return (
      nameNode.property.name === "_StyledComponent" ||
      nameNode.property.name === "StyledComponent"
    );
  } else {
    return false;
  }
}

function getElementName({ name }: JSXOpeningElement): string {
  if (isJSXIdentifier(name)) {
    return name.name;
  } else if (isJSXMemberExpression(name)) {
    return name.property.name;
  } else {
    // https://github.com/facebook/jsx/issues/13#issuecomment-54373080
    throw new Error("JSXNamespacedName is not supported by React JSX");
  }
}
