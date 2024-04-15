import { expectError, createTests, tailwindRunner } from "./runner";

const expectedValues: Record<string, number | string> = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  96: 384,
  "1/2": "50%",
  "1/3": "33.333333%",
  "2/3": "66.666667%",
  "1/4": "25%",
  "2/4": "50%",
  "3/4": "75%",
  full: "100%",
  "[18px]": 18,
};

tailwindRunner(
  "Layout - Top Right Bottom Left",
  // @ts-expect-error number is expected
  createTests("inset-x", expectedValues, (n) => ({ right: n, left: n })),
  // @ts-expect-error number is expected
  createTests("inset-y", expectedValues, (n) => ({ top: n, bottom: n })),
  // @ts-expect-error number is expected
  createTests("top", expectedValues, (n) => ({ top: n })),
  // @ts-expect-error number is expected
  createTests("right", expectedValues, (n) => ({ right: n })),
  // @ts-expect-error number is expected
  createTests("bottom", expectedValues, (n) => ({ bottom: n })),
  // @ts-expect-error number is expected
  createTests("left", expectedValues, (n) => ({ left: n })),
  createTests("inset", expectedValues, (n) => ({
    // @ts-expect-error number is expected
    top: n,
    // @ts-expect-error number is expected
    right: n,
    // @ts-expect-error number is expected
    bottom: n,
    // @ts-expect-error number is expected
    left: n,
  })),

  expectError([
    "inset-auto",
    "inset-x-auto",
    "inset-y-auto",
    "top-auto",
    "right-auto",
    "bottom-auto",
    "left-auto",
  ])
);
