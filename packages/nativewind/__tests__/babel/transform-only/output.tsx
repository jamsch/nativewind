import { StyledComponent as _StyledComponent } from "nativewind";
import { Text, View } from "react-native";
export function Test() {
  return (
    <_StyledComponent className="container" component={View}>
      <Text tw="font-bold">Hello world!</Text>
    </_StyledComponent>
  );
}
