const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const root = path.join(__dirname, "..");
  const from = path.join(root, ".desktop-build", "next", "node_modules");
  const to = path.join(context.appOutDir, "resources", "next", "node_modules");

  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true, verbatimSymlinks: true });
};
