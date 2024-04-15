import {
  ComponentProps,
  ComponentPropsWithRef,
  forwardRef,
  useMemo,
} from "react";
import { styled, StyledProps } from "./styled";
import { useTailwind } from "./styled/use-tailwind";

export type StyledComponentProps<P> = StyledProps<P> & {
  component: React.ComponentType<P>;
};

export const StyledComponentOld = forwardRef(({ component, ...props }, ref) => {
  const Component = useMemo(() => styled(component), [component]);
  return (
    <Component
      {...(props as ComponentProps<typeof Component>)}
      ref={ref as ComponentPropsWithRef<typeof Component>["ref"]}
    />
  );
}) as <T, P>(
  props: StyledComponentProps<P> & React.RefAttributes<T>
) => React.ReactElement | null;

export const StyledComponent = forwardRef(
  ({ component: Component, className = "", style, ...rest }, ref) => {
    /**
     * Resolve the className->style
     */
    const mergedStyles = useTailwind({
      className,
      inlineStyles: style,
    });

    return (
      <Component
        {...(rest as ComponentProps<typeof Component>)}
        // @ts-expect-error ref is not in the ComponentProps type
        ref={ref as ComponentPropsWithRef<typeof Component>["ref"]}
        style={mergedStyles}
      />
    );
  }
) as <T, P>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: StyledComponentProps<P & { style?: any }> & React.RefAttributes<T>
) => React.ReactElement | null;
