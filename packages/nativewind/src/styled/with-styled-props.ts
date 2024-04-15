import type { StyledOptions } from ".";
import { useTailwind } from "./use-tailwind";

export interface WithStyledPropsOptions<
  T,
  P extends keyof T,
  C extends keyof T
> {
  className: string;
  propsToTransform?: StyledOptions<T, P, C>["props"];
  componentProps: Record<P | C | string, string>;
  classProps?: C[];
}

export function withStyledProps<T, P extends keyof T, C extends keyof T>({
  propsToTransform,
  componentProps,
  classProps,
  className,
}: WithStyledPropsOptions<T, P, C>) {
  const styledProps: Partial<Record<P | C, unknown>> = {};

  if (classProps) {
    for (const prop of classProps) {
      const style = useTailwind({
        className: componentProps[prop],
        flatten: true,
      });

      Object.assign(styledProps, { [prop]: undefined }, style[0]);
    }
  }

  if (propsToTransform) {
    for (const [prop, styleKey] of Object.entries(propsToTransform)) {
      const styleArray = useTailwind({
        className: componentProps[prop],
        flatten: styleKey !== true,
      });

      if (styleArray.length === 0) {
        continue;
      }

      if (typeof styleKey === "boolean") {
        styledProps[prop as P | C] = styleArray;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        styledProps[prop as P | C] = (styleArray[0] as any)[styleKey as any];
      }
    }
  }

  return { styledProps, className };
}
