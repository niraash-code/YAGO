import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactCompiler from "eslint-plugin-react-compiler";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-compiler": reactCompiler,
      "react-hooks": reactHooks,
    },
    rules: {
      "react-compiler/react-compiler": "error",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  }
);
