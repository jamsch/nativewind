import {
  arrayExpression,
  assignmentExpression,
  booleanLiteral,
  callExpression,
  Expression,
  identifier,
  isExpression,
  memberExpression,
  nullLiteral,
  numericLiteral,
  objectExpression,
  ObjectProperty,
  objectProperty,
  stringLiteral,
  unaryExpression,
} from "@babel/types";
import { isRuntimeFunction } from "../style-sheet/style-function-helpers";
import { ExtractedValues } from "./plugin";

export function serializer({
  styles: rawStyles,
  atRules,
  topics,
  childClasses,
  transforms,
}: ExtractedValues) {
  const serializedStyles: Record<string, Record<string, unknown>> = {};

  for (const [key, style] of Object.entries(rawStyles)) {
    serializedStyles[key] = {};
    for (const [k, v] of Object.entries(style)) {
      serializedStyles[key][k] = v;
    }
  }

  const styles = babelSerializeLiteral(serializedStyles);

  const objectProperties: ObjectProperty[] = [
    objectProperty(identifier("styles"), styles),
  ];

  const raw: Partial<ExtractedValues> = {
    styles: rawStyles,
  };

  if (Object.keys(atRules).length > 0) {
    raw.atRules = atRules;
    objectProperties.push(
      objectProperty(identifier("atRules"), babelSerializeLiteral(atRules))
    );
  }

  if (Object.keys(transforms).length > 0) {
    raw.transforms = transforms;
    objectProperties.push(
      objectProperty(
        identifier("transforms"),
        babelSerializeLiteral(transforms)
      )
    );
  }

  if (Object.keys(topics).length > 0) {
    raw.topics = topics;
    objectProperties.push(
      objectProperty(identifier("topics"), babelSerializeLiteral(topics))
    );
  }

  if (Object.keys(childClasses).length > 0) {
    raw.childClasses = childClasses;
    objectProperties.push(
      objectProperty(
        identifier("childClasses"),
        babelSerializeLiteral(childClasses)
      )
    );
  }

  const stylesheet = callExpression(
    memberExpression(identifier("_NativeWindStyleSheet"), identifier("create")),
    [objectExpression(objectProperties)]
  );

  // const stylesAssignmentExpression = assignmentExpression(
  //   "=",
  //   identifier("NW_STYLES"),
  //   stylesheet
  // );

  return {
    raw,
    hasStyles: Object.keys(rawStyles).length > 0,
    stylesheetCreateExpression: stylesheet,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function babelSerializeLiteral(literal: any): Expression {
  if (isExpression(literal)) {
    return literal;
  }

  if (literal === null) {
    return nullLiteral();
  }

  switch (typeof literal) {
    case "number":
      return numericLiteral(literal);
    case "string":
      if (isRuntimeFunction(literal)) {
        const { name, args } = JSON.parse(literal.slice(2)) as {
          name: string;
          args: unknown[];
        };

        return callExpression(
          memberExpression(
            identifier("_NativeWindStyleSheet"),
            identifier(name)
          ),
          args.map((argument) => babelSerializeLiteral(argument))
        );
      } else {
        return stringLiteral(literal);
      }
    case "boolean":
      return booleanLiteral(literal);
    case "undefined":
      return unaryExpression("void", numericLiteral(0), true);
    default:
      if (Array.isArray(literal)) {
        return arrayExpression(literal.map((n) => babelSerializeLiteral(n)));
      }

      if (isObject(literal)) {
        return objectExpression(
          Object.keys(literal)
            .filter((k) => {
              return typeof literal[k] !== "undefined";
            })
            .map((k) => {
              return objectProperty(
                stringLiteral(k),
                babelSerializeLiteral(literal[k])
              );
            })
        );
      }

      throw new Error("un-serializable literal");
  }
}

function isObject(literal: unknown): literal is Record<string, unknown> {
  return typeof literal === "object";
}
