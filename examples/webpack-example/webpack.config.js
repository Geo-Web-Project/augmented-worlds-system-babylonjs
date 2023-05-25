const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./bootstrap.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.bundle.js",
  },
  mode: "development",
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: path.join(__dirname, "src"),
        use: "ts-loader",
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js", ".wasm"],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "./index.html" }],
    }),
  ],
  experiments: {
    syncWebAssembly: true,
  },
};
