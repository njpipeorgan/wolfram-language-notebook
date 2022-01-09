const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { DefinePlugin } = require('webpack');
const path = require('path');

const makeConfig = (argv, { entry, out, target, library = 'commonjs' }) => ({
  mode: argv.mode,
  devtool: argv.mode === 'production' ? false : 'inline-source-map',
  entry,
  target,
  output: {
    path: path.join(__dirname, path.dirname(out)),
    filename: path.basename(out),
    publicPath: '',
    libraryTarget: library,
    chunkFormat: library,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css']
  },
  experiments: {
    outputModule: true,
  },
  externals: {
    "vscode": "commonjs vscode",
    "vscode-test": "commonjs vscode-test",
    "util": "commonjs util",
    "zeromq": "commonjs zeromq",
    "path": "commonjs path",
    "child_process": "commonjs child_process",
    "fs": "commonjs fs",
    "uuid": "commonjs uuid",
    "markdown-it": "commonjs markdown-it",
    "path": "commonjs path",
    "mathjax": "commonjs mathjax"
  },
  module: {
    rules: [
      // Allow importing ts(x) files:
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          configFile: path.join(path.dirname(entry), 'tsconfig.json'),
          // transpileOnly enables hot-module-replacement
          transpileOnly: true,
          compilerOptions: {
            // Overwrite the noEmit from the client's tsconfig
            noEmit: false,
          },
        },
      },
      // Allow importing CSS modules:
      {
        test: /\.css$/,
        use: ["style-loader", 'css-loader'],
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        use: 'file-loader'
      }
    ],
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        configFile: path.join(path.dirname(entry), 'tsconfig.json'),
      },
    }),
    new DefinePlugin({
      // Path from the output filename to the output directory
      __webpack_relative_entrypoint_to_root__: JSON.stringify(
        path.posix.relative(path.posix.dirname(`/index.js`), '/'),
      ),
      scriptUrl: 'import.meta.url',
    }),
  ],
});

module.exports = (env, argv) => [
  makeConfig(argv, { entry: './src/client/index.ts', out: './out/client/index.js', target: 'web', library: 'module' }),
  makeConfig(argv, { entry: './src/extension/extension.ts', out: './out/extension/extension.js', target: 'node' }),
  // makeConfig(argv, { entry: './src/test/runTest.ts', out: './out/test/runTest.js', target: 'node' }),
  // makeConfig(argv, { entry: './src/test/suite/index.ts', out: './out/test/suite/index.js', target: 'node' }),
  // makeConfig(argv, { entry: './src/test/suite/extension.test.ts', out: './out/test/suite/extension.test.js', target: 'node' }),
  // makeConfig(argv, { entry: './src/extension/extension.ts', out: './out/extension/extension.web.js', target: 'webworker' }),
];
