const config = require('./app.json');

/**
 * app.json holds everything static; this wrapper adds the one setting that
 * depends on where the build is going.
 *
 * GitHub Pages serves a repository at https://<user>.github.io/<repo>/, so the
 * exported site sits in a subfolder and every asset URL needs that prefix.
 * Set EXPO_BASE_URL to the subfolder ("/Apps") when exporting for Pages; leave
 * it unset for local development and for hosts that serve from the root.
 */
const baseUrl = process.env.EXPO_BASE_URL ?? '';

module.exports = {
  ...config.expo,
  experiments: {
    ...config.expo.experiments,
    ...(baseUrl ? { baseUrl } : {}),
  },
};
