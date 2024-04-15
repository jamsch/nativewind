import { CustomPluginFunction } from "./types";

export const space: CustomPluginFunction = (
  { matchUtilities, theme },
  notSupported
) => {
  matchUtilities(
    {
      "space-x": () => {
        return notSupported("space-x")();
      },
      "space-y": () => {
        return notSupported("space-y")();
      },
    },
    { values: { ...theme("space"), reverse: "reverse" } }
  );
};
