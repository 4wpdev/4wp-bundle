const defaultConfig = require('@wordpress/scripts/config/webpack.config');

module.exports = {
  ...defaultConfig,
  entry: {
    index: './assets/js/admin/index.js',
    'addons/show-more/index': './addons/show-more/index.js',
    'addons/show-more/view': './addons/show-more/view.js',
    'addons/swipe-carousel/index': './addons/swipe-carousel/index.js',
    'addons/swipe-carousel/view': './addons/swipe-carousel/view.js',
    'addons/video-lightbox/index': './addons/video-lightbox/index.js',
    'addons/video-lightbox/view': './addons/video-lightbox/view.js',
    'addons/error-scenario/index': './addons/error-scenario/index.js',
    'addons/error-scenario/view': './addons/error-scenario/view.js',
  },
  output: {
    filename: '[name].js',
    path: __dirname + '/build',
  },
};
