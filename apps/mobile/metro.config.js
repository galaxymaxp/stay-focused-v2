const path = require("node:path");

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const existingBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
    ? [config.resolver.blockList]
    : [];

config.resolver.blockList = [
  ...existingBlockList,
  pathPattern(path.resolve(__dirname, "../api/.next")),
];

module.exports = config;

function pathPattern(absolutePath) {
  const platformNeutralPath = absolutePath
    .split(path.sep)
    .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[/\\\\]");
  return new RegExp(`^${platformNeutralPath}(?:[/\\\\].*)?$`);
}
