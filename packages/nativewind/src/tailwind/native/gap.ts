import { CustomPluginFunction } from "./types";

export const gap: CustomPluginFunction = ({ matchUtilities, theme }) => {
  matchUtilities(
    {
      gap: (value: string) => {
        value = value === "0" ? "0px" : value;
        value = value === "px" ? "1px" : value;

        return {
          gap: value,
        };
      },
      "gap-x": (value: string) => {
        value = value === "0" ? "0px" : value;
        value = value === "px" ? "1px" : value;

        return {
          columnGap: value,
        };
      },
      "gap-y": (value: string) => {
        value = value === "0" ? "0px" : value;
        value = value === "px" ? "1px" : value;

        return {
          rowGap: value,
        };
      },
    },
    { values: theme("gap") }
  );
};
