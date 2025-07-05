const defaultConfig = require('@wordpress/scripts/config/webpack.config');

module.exports = {
  ...defaultConfig,
  entry: {
    index: './assets/js/admin/index.js'
  },
  output: {
    filename: 'index.js',
    path: __dirname + '/build',
  },
};
