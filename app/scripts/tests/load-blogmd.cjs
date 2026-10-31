// Compiles src/lib/blogMarkdown.ts on the fly so the tests run against the real file.
const path = require('path');
const { buildSync } = require('esbuild');
const out = buildSync({ entryPoints: [path.join(__dirname, '../../src/lib/blogMarkdown.ts')], bundle: true, format: 'cjs', platform: 'node', write: false });
const m = { exports: {} };
new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
module.exports = m.exports;
