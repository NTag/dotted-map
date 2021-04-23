const path = require('path');
const fs = require('fs');

class CleanOutput {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('CleanOutput', () => {
      if (fs.existsSync('./index.js')) {
        fs.rmSync('./index.js');
      }
      if (fs.existsSync('./without-countries.js')) {
        fs.rmSync('./without-countries.js');
      }
    });
  }
}

module.exports = {
  entry: {
    index: './src/with-countries.js',
    'without-countries': './src/without-countries.js',
  },
  mode: 'production',
  output: {
    path: path.resolve(__dirname),
    filename: '[name].js',
    library: {
      name: 'dotted-map',
      type: 'umd',
    },
    globalObject: 'this',
  },
  externals: {
    '@turf/boolean-point-in-polygon': '@turf/boolean-point-in-polygon',
    proj4: 'proj4',
  },
  plugins: [new CleanOutput()],
};
