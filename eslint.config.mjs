import globals from "globals";
import pluginJs from "@eslint/js";


export default [
  {
    languageOptions: { globals: globals.node },
    rules: {
        semi: "error",
    },
    plugins: ["jest"],
  },
  pluginJs.configs.recommended,
];
