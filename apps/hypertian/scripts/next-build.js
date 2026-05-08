const path = require('node:path');
const { spawnSync } = require('node:child_process');

const hookPath = path.join(__dirname, 'silence-bigint-buffer-warning.cjs');
const nodeOptions = [process.env.NODE_OPTIONS, '--require', hookPath].filter(Boolean).join(' ');
const nextBin = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');

const result = spawnSync(process.execPath, [nextBin, 'build'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
