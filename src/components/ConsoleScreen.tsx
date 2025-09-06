import { forwardRef } from "react";

const ConsoleScreen = forwardRef<HTMLPreElement>((_, ref) => {
  return <pre ref={ref}></pre>;
});

export default ConsoleScreen;
