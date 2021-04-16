const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'dotted-map.js',
    library: {
      name: 'dotted-map',
      type: 'umd',
    },
    globalObject: 'this',
    clean: true,
  },
};
