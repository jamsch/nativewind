import { parse } from "url";
import { createElement, useState, useEffect } from "react";
import { StyleSheet } from "nativewind";
import getDevServer from "react-native/Libraries/Core/Devtools/getDevServer";
import { unstable_styled } from "react-native-css-interop";
import {
  Platform,
  Text as RNText,
  View as RNView,
  Pressable as RNPressable,
} from "react-native";

const { hostname } = parse(getDevServer().url);

/*
Expo Snack does not allow setting the JSX runtime to automatic, or running a custom server.
Therefore these demos utilise undocumented & unstable APIs that should not be used!

These examples are for demonstrative purposes only. They have known bugs/issues and are not
representative of NativeWind.

Please do not use these APIs in your own projects.
*/
var tailwindScriptLoaded = false;
const alreadyProcessed = new Set();
if (Platform.OS === "web") {
  var tailwindScript = document.createElement("script");
  tailwindScript.addEventListener("load", () => {
    tailwindScriptLoaded = true;
  });
  tailwindScript.setAttribute("src", "https://cdn.tailwindcss.com");
  document.body.appendChild(tailwindScript);
} else {
  StyleSheet.unstable_hook_onClassName = (content) => {
    content = content
      .split(" ")
      .filter((c) => !alreadyProcessed.has(c))
      .join(" ");

    if (!content) return;

    fetch(`http:${hostname}:3000/api/compile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    })
      .then((response) => response.json())
      .then((body) => {
        content.split(" ").forEach((c) => alreadyProcessed.add(c));
        StyleSheet.register(body);
      })
      .catch(() =>
        console.error("Error connecting to NativeWind snack server"),
      );
  };
}

const render = (element, { children, ...props }, key) => {
  children = Array.isArray(children) ? children : [children];
  return createElement(element, { key, ...props }, ...children);
};
export const View = unstable_styled(RNView, render);
export const Text = unstable_styled(RNText, render);
export const Pressable = unstable_styled(RNPressable, render);

export function withExpoSnack(Component) {
  return function WithExpoSnack() {
    const [, rerender] = useState(false);
    useEffect(() => {
      return tailwindScript?.addEventListener("load", () => {
        rerender(true);
      });
    }, []);

    return Platform.OS === "web" ? (
      tailwindScriptLoaded ? (
        <Component />
      ) : (
        <></>
      )
    ) : (
      <Component />
    );
  };
}