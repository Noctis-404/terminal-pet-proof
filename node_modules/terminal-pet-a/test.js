const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const packageJson = require('./package.json');

assert.strictEqual(packageJson.version, '1.0.0');
assert.strictEqual(packageJson.bin.mypet, './index.js');

const result = spawnSync(process.execPath, [path.join(__dirname, 'index.js')], {
  encoding: 'utf8',
});

assert.ifError(result.error);
assert.strictEqual(result.status, 0, result.stderr);
assert.match(result.stdout, /Welcome to your terminal pet!/);
console.log('Package initialization test passed.');
