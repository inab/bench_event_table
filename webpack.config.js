const path = require('path');

module.exports = {
    entry: './index.js',
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
};
