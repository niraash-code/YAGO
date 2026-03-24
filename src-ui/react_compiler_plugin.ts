import { type BunPlugin } from "bun";
import { transformAsync } from "@babel/core";
import reactCompiler from "babel-plugin-react-compiler";

export const reactCompilerPlugin: BunPlugin = {
  name: "react-compiler-plugin",
  setup(build) {
    build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
      const text = await Bun.file(args.path).text();
      
      const result = await transformAsync(text, {
        filename: args.path,
        plugins: [
          [reactCompiler, { target: "19" }] // Targeting React 19 as per package.json
        ],
        presets: [
          ["@babel/preset-typescript", { isTSX: true, allExtensions: true }]
        ],
        babelrc: false,
        configFile: false,
      });

      return {
        contents: result?.code || text,
        loader: "tsx",
      };
    });
  },
};
