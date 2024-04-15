import {
  StyleSheet,
  Dimensions,
  Appearance,
  ScaledSize,
  EmitterSubscription,
  NativeEventSubscription,
  TextStyle,
  ImageStyle,
  ViewStyle,
  Platform,
  StyleProp,
  PlatformColor,
  PixelRatio,
} from "react-native";

import { matchAtRule } from "./match-at-rule";
import { createAtRuleSelector } from "../utils/selector";
import { MediaRecord } from "../types/common";
import { ColorSchemeStore } from "./color-scheme";

export type { ColorSchemeSystem, ColorSchemeName } from "./color-scheme";
export type Style = ViewStyle | ImageStyle | TextStyle;
export type InlineStyle<T extends Style> = T;
export type AtRuleStyle<T extends Style> = T & { atRules: unknown[] };
export type CompiledStyle = { [key: string]: string } & { $$css: boolean };
export type EitherStyle<T extends Style = Style> =
  | AtRuleStyle<T>
  | CompiledStyle
  | InlineStyle<T>
  | StyleProp<T>;

export type Snapshot = Record<string, StylesArray>;

const emptyStyles: StylesArray = Object.assign([], {});

export type StylesArray<T extends Style = Style> = Array<EitherStyle<T>>;

/**
 * Tailwind styles are strings of atomic classes. eg "a b" compiles to [a, b]
 *
 * If the styles are static we can simply cache them and return a stable result
 *
 * However, if the styles are dynamic (have atRules) there are two things we need to do
 *  - Update the atomic style
 *  - Update the dependencies of the atomic style
 *
 * This is performed by each style subscribing to a atRule topic. The atomic styles are updated
 * before the parent styles.
 *
 * The advantage of this system is that styles are only updated once, no matter how many components
 * are on using them
 *
 * The disadvantages are
 * - Is that the store doesn't purge unused styles, so the listeners will continue to grow
 * - UI states (hover/active/focus) are considered separate styles
 *
 * If you are interested in helping me build a more robust store, please create an issue on Github.
 *
 */
export class StyleSheetRuntime extends ColorSchemeStore {
  snapshot: Snapshot = { "": emptyStyles };
  listeners = new Set<() => void>();
  atRuleListeners = new Set<(topics: string[]) => void>();

  dimensionListener?: EmitterSubscription;
  appearanceListener?: NativeEventSubscription;
  dangerouslyCompileStyles?: (
    className: string,
    store: StyleSheetRuntime
  ) => void;

  styles: Record<string, Style> = {};
  atRules: MediaRecord = {};
  transforms: Record<string, true> = {};

  platform: typeof Platform.OS = Platform.OS;
  window: ScaledSize = Dimensions.get("window");
  orientation: OrientationLockType = "portrait";

  constructor() {
    super();
    this.setDimensions(Dimensions);
    this.setAppearance(Appearance);
    this.setPlatform(Platform.OS);
  }

  setDimensions(dimensions: Dimensions) {
    this.window = dimensions.get("window");
    this.orientation =
      this.window.height >= this.window.width ? "portrait" : "landscape";

    this.dimensionListener?.remove();
    this.dimensionListener = dimensions.addEventListener(
      "change",
      ({ window }) => {
        const topics: string[] = ["window"];

        if (window.width !== this.window.width) topics.push("width");
        if (window.height !== this.window.height) topics.push("height");

        this.window = window;

        const orientation =
          window.height >= window.width ? "portrait" : "landscape";
        if (orientation !== this.orientation) topics.push("orientation");
        this.orientation = orientation;

        this.notifyMedia(topics);
      }
    );
  }

  setAppearance(appearance: typeof Appearance) {
    this.appearanceListener?.remove();
    this.appearanceListener = appearance.addChangeListener(
      ({ colorScheme }) => {
        if (this.colorSchemeSystem === "system") {
          this.colorScheme = colorScheme || "light";
          this.notifyMedia(["colorScheme"]);
        }
      }
    );
  }

  setPlatform(platform: typeof Platform.OS) {
    this.platform = platform;
  }

  setDangerouslyCompileStyles(
    dangerouslyCompileStyles: (
      className: string,
      store: StyleSheetRuntime
    ) => void
  ) {
    this.dangerouslyCompileStyles = dangerouslyCompileStyles;
  }

  getSnapshot = () => {
    return this.snapshot;
  };

  getServerSnapshot() {
    return this.snapshot;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  destroy() {
    this.dimensionListener?.remove();
    this.appearanceListener?.remove();
  }

  notify() {
    for (const l of this.listeners) l();
  }

  subscribeMedia(listener: (topics: string[]) => void) {
    this.atRuleListeners.add(listener);
    return () => this.atRuleListeners.delete(listener);
  }

  notifyMedia(topics: string[]) {
    for (const l of this.atRuleListeners) l(topics);
    this.notify();
  }

  isEqual(a: StylesArray, b: StylesArray): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((style, index) => Object.is(style, b[index]));
  }

  prepare(composedClassName?: string): string {
    if (typeof composedClassName !== "string") {
      return "";
    }

    const snapshotKey = `(${composedClassName})`;
    if (this.snapshot[snapshotKey]) return snapshotKey;

    this.dangerouslyCompileStyles?.(composedClassName, this);

    const classNames = composedClassName.split(/\s+/);

    this.reEvaluate(snapshotKey, classNames);

    return snapshotKey;
  }

  reEvaluate = (snapshotKey: string, classNames: string[]) => {
    const styleArray: StylesArray = [];
    const transformStyles: ViewStyle["transform"] = [];

    for (const className of classNames) {
      const classNameStyles = this.upsertAtomicStyle(className);

      // Group transforms
      if (this.transforms[className]) {
        for (const a of classNameStyles) {
          // @ts-expect-error transform is not in the ViewStyle type
          transformStyles.push(...(a as ViewStyle).transform);
        }
      } else {
        styleArray.push(...classNameStyles);
      }
    }

    if (transformStyles.length > 0) {
      styleArray.push({
        transform: transformStyles,
      });
    }

    this.snapshot =
      styleArray.length > 0
        ? {
            ...this.snapshot,
            [snapshotKey]: styleArray,
          }
        : {
            ...this.snapshot,
            [snapshotKey]: styleArray,
          };
  };

  /**
   * ClassNames are made of multiple atomic styles. eg "a b" are the styles [a, b]
   *
   * This function will be called for each atomic style
   */
  upsertAtomicStyle(className: string): StylesArray {
    // This atomic style has already been processed, we can skip it
    if (this.snapshot[className]) return this.snapshot[className];

    // To keep things consistent, even atomic styles are arrays
    const styleArray = this.styles[className] ? [this.styles[className]] : [];

    const atRulesTuple = this.atRules[className];

    // If there are no atRules, this style is static.
    // We can add it to the snapshot and early exit.
    if (!atRulesTuple) {
      this.snapshot =
        styleArray.length > 0
          ? { ...this.snapshot, [className]: styleArray }
          : { ...this.snapshot, [className]: emptyStyles };
      return styleArray;
    }

    // When a topic has new information, this function will be called.
    const reEvaluate = () => {
      const newStyles: StylesArray = [...styleArray];

      for (const [index, atRules] of atRulesTuple.entries()) {
        const atRulesResult = atRules.every(([rule, params]) => {
          if (rule === "selector") {
            // These atRules shouldn't be on the atomic styles, they only
            // apply to childStyles
            return false;
          }

          return matchAtRule({
            rule,
            params,
            width: this.window.width,
            height: this.window.height,
            orientation: this.orientation,
          });
        });

        if (!atRulesResult) {
          continue;
        }

        const ruleSelector = createAtRuleSelector(className, index);
        newStyles.push(this.styles[ruleSelector]);
      }

      this.snapshot =
        newStyles.length > 0
          ? { ...this.snapshot, [className]: newStyles }
          : { ...this.snapshot, [className]: emptyStyles };

      return newStyles;
    };

    return reEvaluate();
  }

  create({
    styles,
    atRules,
    transforms,
  }: Partial<Pick<StyleSheetRuntime, "styles" | "atRules" | "transforms">>) {
    if (atRules) Object.assign(this.atRules, atRules);
    if (transforms) Object.assign(this.transforms, transforms);
    if (styles) {
      Object.assign(this.styles, styles);
      // for (const className of Object.keys(styles)) {
      //   this.upsertAtomicStyle(className);
      // }
    }
  }

  platformSelect = Platform.select;

  platformColor(color: string) {
    // RWN does not implement PlatformColor
    // https://github.com/necolas/react-native-web/issues/2128
    return PlatformColor ? PlatformColor(color) : color;
  }

  hairlineWidth() {
    return StyleSheet.hairlineWidth;
  }

  pixelRatio(value: number | Record<string, number>) {
    const ratio = PixelRatio.get();
    return typeof value === "number" ? ratio * value : value[ratio] ?? ratio;
  }

  fontScale(value: number | Record<string, number>) {
    const scale = PixelRatio.getFontScale();
    return typeof value === "number" ? scale * value : value[scale] ?? scale;
  }

  getPixelSizeForLayoutSize = PixelRatio.getPixelSizeForLayoutSize;

  roundToNearestPixel = PixelRatio.getPixelSizeForLayoutSize;
}
