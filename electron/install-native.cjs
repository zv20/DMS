const { execFileSync } = require('node:child_process');
const path = require('node:path');

const electronVersion = require('electron/package.json').version;
const packageRoot = path.resolve(__dirname, '..');
const prebuildInstall = path.join(packageRoot, 'node_modules', 'prebuild-install', 'bin.js');

execFileSync(process.execPath, [
  prebuildInstall,
  '--runtime', 'electron',
  '--target', electronVersion,
  '--arch', process.arch,
  '--platform', process.platform
], {
  cwd: path.join(packageRoot, 'node_modules', 'better-sqlite3'),
  stdio: 'inherit'
});
