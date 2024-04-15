import { useContext, useMemo } from "react";
import { StyleProp, StyleSheet } from "react-native";
import { StoreContext, StylesArray } from "../style-sheet";
import { Style } from "../style-sheet/runtime";
import { StateBitOptions } from "../utils/selector";

export interface UseTailwindOptions<T extends Style> extends StateBitOptions {
  className: string;
  inlineStyles?: StyleProp<T>;
  additionalStyles?: StylesArray<T>;
  flatten?: boolean;
}

export function useTailwind<T extends Style>({
  className,
  inlineStyles,
  additionalStyles,
  flatten,
}: UseTailwindOptions<T>): StylesArray<T> {
  const store = useContext(StoreContext);
  const selector = useMemo(() => store.prepare(className), [className]);
  const styles = store.snapshot[selector];

  return useMemo(() => {
    const stylesArray: StylesArray = [];

    if (styles) {
      stylesArray.push(...styles);
    }

    if (additionalStyles) {
      stylesArray.push(...additionalStyles);
    }
    if (inlineStyles) {
      stylesArray.push(inlineStyles);
    }

    if (flatten) {
      return [StyleSheet.flatten(stylesArray)];
    }

    return stylesArray;
  }, [styles, inlineStyles, additionalStyles, flatten]) as StylesArray<T>;
}
