// Build the zip from the dist/ directory produced by build.ts.
// Only runtime files live in dist/, so no ignoreFiles needed.
module.exports = {
  sourceDir: "./dist",
  build: {
    filename: "mr-clicky-chrome-v{version}.zip",
    overwriteDest: true,
  },
};
