const fs = require('node:fs');
const path = require('node:path');

const originalLine = "        console.warn('bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)');";
const replacementLine =
  "        if (process.env.BIGINT_BUFFER_VERBOSE_BINDINGS === '1') console.warn('bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)');";
const nodeModulesRoot = path.join(__dirname, '..', 'node_modules');

function collectTargets(root) {
  const targets = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const entryPath = path.join(current, entry.name);
      if (entry.name === 'bigint-buffer') {
        targets.push(path.join(entryPath, 'dist', 'node.js'));
        continue;
      }

      if (entry.name === 'node_modules' || entry.name.startsWith('@')) {
        stack.push(entryPath);
      }
    }
  }

  return targets;
}

try {
  if (!fs.existsSync(nodeModulesRoot)) {
    process.exit(0);
  }

  let patchedCount = 0;
  for (const target of collectTargets(nodeModulesRoot)) {
    if (!fs.existsSync(target)) {
      continue;
    }

    const source = fs.readFileSync(target, 'utf8');
    if (!source.includes(originalLine) || source.includes(replacementLine)) {
      continue;
    }

    fs.writeFileSync(target, source.replace(originalLine, replacementLine), 'utf8');
    patchedCount += 1;
  }

  if (patchedCount > 0) {
    console.log(`Patched bigint-buffer warning output in ${patchedCount} file(s).`);
  }
} catch (error) {
  console.warn('Failed to patch bigint-buffer warning output:', error instanceof Error ? error.message : error);
}
