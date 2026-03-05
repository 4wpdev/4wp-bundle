const defaultConfig = require('@wordpress/scripts/config/webpack.config');

module.exports = {
  ...defaultConfig,
  entry: {
    index: './assets/js/admin/index.js',
    'addons/show-more/index': './addons/show-more/index.js',
    'addons/show-more/view': './addons/show-more/view.js',
  },
  output: {
    filename: '[name].js',
    path: __dirname + '/build',
  },
};
