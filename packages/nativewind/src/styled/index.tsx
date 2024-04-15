import {
  createElement,
  ReactNode,
  ComponentType,
  forwardRef,
  RefAttributes,
  ForwardedRef,
  ClassAttributes,
  ForwardRefExoticComponent,
  PropsWithoutRef,
} from "react";
import { withStyledProps } from "./with-styled-props";
import { useTailwind } from "./use-tailwind";
import { StyleProp } from "react-native";
import { Style } from "../types/common";

export interface StyledOptions<
  T,
  P extends keyof T = never,
  C extends keyof T = never
> {
  props?: Partial<Record<P, keyof Style | true>>;
  classProps?: C[];
  baseClassName?: string;
}

export type StyledProps<P> = P & {
  className?: string;
  tw?: string;
  baseClassName?: string;
  baseTw?: string;
};

type ForwardRef<T, P> = ForwardRefExoticComponent<
  PropsWithoutRef<P> & RefAttributes<T>
>;

type InferRef<T> = T extends RefAttributes<infer R> | ClassAttributes<infer R>
  ? R
  : unknown;

/**
 * Default
 */
export function styled<T>(
  Component: ComponentType<T>
): ForwardRef<InferRef<T>, StyledProps<T>>;

/**
 * Base className
 */
export function styled<T>(
  Component: ComponentType<T>,
  baseClassName: string
): ForwardRef<InferRef<T>, StyledProps<T>>;

/**
 * Only options
 */
export function styled<T, P extends keyof T, C extends keyof T>(
  Component: ComponentType<T>,
  options: StyledOptions<T, P, C>
): ForwardRef<
  InferRef<T>,
  StyledProps<{ [key in keyof T]: key extends P ? T[key] | string : T[key] }>
>;

/**
 * Base className w/ options
 */
export function styled<T, P extends keyof T, C extends keyof T>(
  Component: ComponentType<T>,
  baseClassName: string,
  options: StyledOptions<T, P, C>
): ForwardRef<
  InferRef<T>,
  StyledProps<{ [key in keyof T]: key extends P ? T[key] | string : T[key] }>
>;

/**
 * Actual implementation
 */
export function styled<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { style?: StyleProp<any>; children?: ReactNode | undefined },
  P extends keyof T,
  C extends keyof T
>(
  Component: ComponentType<T>,
  styledBaseClassNameOrOptions?: string | StyledOptions<T, P, C>,
  maybeOptions: StyledOptions<T, P, C> = {}
) {
  const { props: propsToTransform, classProps } =
    typeof styledBaseClassNameOrOptions === "object"
      ? styledBaseClassNameOrOptions
      : maybeOptions;

  const baseClassName =
    typeof styledBaseClassNameOrOptions === "string"
      ? styledBaseClassNameOrOptions
      : maybeOptions?.baseClassName;

  function Styled(
    {
      className: propClassName = "",
      tw: twClassName,
      style: inlineStyles,
      children: componentChildren,
      ...componentProps
    }: StyledProps<T>,
    ref: ForwardedRef<unknown>
  ) {
    const classNameWithDefaults = baseClassName
      ? `${baseClassName} ${twClassName ?? propClassName}`
      : twClassName ?? propClassName;

    /**
     * Resolve the props/classProps/spreadProps options
     */
    const { styledProps, className } = withStyledProps<T, P, C>({
      className: classNameWithDefaults,
      propsToTransform,
      classProps,
      componentProps: componentProps as Record<P | C | string, string>,
    });

    /**
     * Resolve the className->style
     */
    const style = useTailwind({
      className,
      inlineStyles,
    });

    const element = createElement(Component, {
      ...componentProps,
      ...styledProps,
      style: style.length > 0 ? style : undefined,
      children: componentChildren,
      ref,
    } as T);

    return element;
  }

  if (typeof Component !== "string") {
    Styled.displayName = `NativeWind.${
      Component.displayName || Component.name || "NoName"
    }`;
  }

  return forwardRef(Styled);
}
