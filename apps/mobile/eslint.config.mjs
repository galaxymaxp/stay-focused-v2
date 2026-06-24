import expoConfig from "eslint-config-expo/flat.js";

export default [
  {
    ignores: [".expo/**", "dist/**", "node_modules/**", "expo-env.d.ts"],
  },
  ...expoConfig,
];
