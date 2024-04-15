import { match } from "css-mediaquery";
import { Platform } from "react-native";

interface MatchAtRuleOptions {
  rule: string;
  params?: string;
  width: number;
  height: number;
  orientation: OrientationLockType;
}

export function matchAtRule({
  rule,
  params,
  width,
  height,
  orientation,
}: MatchAtRuleOptions) {
  if (rule === "media" && params) {
    return match(params, {
      type: Platform.OS,
      "aspect-ratio": width / height,
      "device-aspect-ratio": width / height,
      width,
      height,
      "device-width": width,
      "device-height": width,
      orientation,
    });
  }

  return false;
}

export interface MatchChildAtRuleOptions {
  nthChild?: number;
}

export function matchChildAtRule(
  rule: string,
  params = "",
  { nthChild = -1 }: MatchChildAtRuleOptions
) {
  if (
    rule === "selector" &&
    params === "(> *:not(:first-child))" &&
    nthChild > 1
  ) {
    return true;
  } else if (rule === "selector" && params === "(> *)") {
    return true;
  }

  return false;
}
