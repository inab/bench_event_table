const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    context: path.resolve(__dirname, 'src'),
    entry: './app.js',
    output: {
        path: path.resolve(__dirname, 'build'),
        libraryTarget: 'this',
        filename: 'build.js'
    },
    module: {
        // rules will get concatenated!
        rules: [{
          test: /\.css$/,
          use: [{
              loader: 'style-loader'
            },
            {
              loader: 'css-loader',
              options: {
                minimize: true
              }
            },
          ]
        },
        {
          test: /\.(png|jpg)$/,
          loader: 'url-loader'
        }
        ],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console:false
          }
        }
      })],
  },
};
