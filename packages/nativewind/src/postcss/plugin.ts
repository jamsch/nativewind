import { Plugin, PluginCreator } from "postcss";
import { createAtRuleSelector, normalizeCssSelector } from "../utils/selector";
import { toReactNative } from "./to-react-native";
import { StyleRecord, Style, StyleError, AtRuleTuple } from "../types/common";
import { outputWriter } from "./fs-writer";
import { getRuntime } from "./get-runtime";

const atRuleSymbol = Symbol("media");
const isForChildrenSymbol = Symbol("children");

declare module "postcss" {
  abstract class Container {
    [atRuleSymbol]: AtRuleTuple[];
    [isForChildrenSymbol]: boolean;
  }
}

export interface ExtractedValues {
  styles: StyleRecord;
  topics: Record<string, Array<string>>;
  childClasses: Record<string, string[]>;
  atRules: Record<string, Array<AtRuleTuple[]>>;
  transforms: Record<string, true>;
}

export interface DoneResult extends ExtractedValues {
  errors: StyleError[];
}

export interface PostcssPluginOptions {
  output?: string;
  done?: (result: DoneResult) => void;
}

export const plugin: PluginCreator<PostcssPluginOptions> = ({
  done,
  output,
} = {}) => {
  const styles: DoneResult["styles"] = {};
  const topics: Record<string, Set<string>> = {};
  const childClasses: Record<string, string[]> = {};
  const atRules: DoneResult["atRules"] = {};
  const transforms: DoneResult["transforms"] = {};
  const errors: DoneResult["errors"] = [];

  return {
    postcssPlugin: "nativewind-style-extractor",
    OnceExit: (root) => {
      root.walk((node) => {
        if (node.type === "atrule") {
          node[atRuleSymbol] ??= node?.parent?.[atRuleSymbol]
            ? [...node.parent[atRuleSymbol]]
            : [];

          if (node.name === "selector" && node.params.startsWith("(>")) {
            node[isForChildrenSymbol] = true;
          }

          node[atRuleSymbol].push([node.name, node.params]);
        } else if (node.type === "rule") {
          let nativeDeclarations: Style = {};

          // Get all the declarations
          node.walkDecls((decl) => {
            nativeDeclarations = {
              ...nativeDeclarations,
              ...toReactNative(decl, {
                onError: (error) => errors.push(error),
              }),
            };
          });

          if (Object.keys(nativeDeclarations).length === 0) {
            return;
          }

          const hasTransformRules = Boolean(nativeDeclarations.transform);

          for (const s of node.selectors) {
            const rules = node.parent?.[atRuleSymbol];

            const { declarations, topics: selectorTopics } = getRuntime(
              s,
              nativeDeclarations,
              rules
            );

            let selector = normalizeCssSelector(s);

            if (hasTransformRules) {
              transforms[selector] = true;
            }

            if (node.parent?.[isForChildrenSymbol]) {
              const childSelector = `${selector}.children`;
              childClasses[selector] ??= [];
              childClasses[selector].push(childSelector);
              selector = childSelector;
            }

            if (selectorTopics) {
              topics[selector] ??= new Set();
              for (const topic of selectorTopics) {
                topics[selector].add(topic);
              }
            }

            if (rules) {
              atRules[selector] ??= [];
              atRules[selector].push(rules);
              selector = createAtRuleSelector(
                selector,
                atRules[selector].length - 1
              );
            }

            styles[selector] = declarations;
          }
        }
      });

      const arrayTopics: DoneResult["topics"] = {};

      for (const [key, value] of Object.entries(topics)) {
        arrayTopics[key] = [...value.values()];
      }

      if (done)
        done({
          styles,
          atRules,
          childClasses,
          transforms,
          topics: arrayTopics,
          errors,
        });

      if (output) {
        outputWriter(output, {
          styles,
          atRules,
          childClasses,
          transforms,
          topics: arrayTopics,
        });
      }
    },
  } as Plugin;
};

plugin.postcss = true;

export default plugin;
