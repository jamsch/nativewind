import type { PlatformOSType } from "react-native";

const makePseudoClassTest = (pseudoClass: string) => {
  const regex = new RegExp(`\\S+::${pseudoClass}(:|\\s|$)`);
  return regex.test.bind(regex);
};
export const hasDarkPseudoClass = makePseudoClassTest("dark");

export function normalizeCssSelector(selector: string) {
  selector = selector.trim().replace(/^\.|\\/g, "");
  selector = selector.split("::")[0];
  selector = selector.split(" ").pop() as string;

  return selector;
}

export interface StateBitOptions {
  darkMode?: boolean;
  platform?: PlatformOSType;
  rtl?: boolean;

  // Used By expo-snack
  baseBit?: number;
}

export function createAtRuleSelector(className: string, atRuleIndex: number) {
  return `${className}@${atRuleIndex}`;
}
