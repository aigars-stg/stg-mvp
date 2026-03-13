/**
 * Finds unused translation keys by scanning source code for references.
 *
 * Usage: node scripts/find-unused-translations.js [--remove]
 *   --remove  Actually remove unused keys from en.json and lv.json
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'packages', 'marketplace', 'messages');
const SRC_DIR = path.join(__dirname, '..', 'packages', 'marketplace');

const EN_PATH = path.join(MESSAGES_DIR, 'en.json');
const LV_PATH = path.join(MESSAGES_DIR, 'lv.json');

const removeMode = process.argv.includes('--remove');

// ── Helpers ──

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getAllSourceFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', 'messages', '.git'].includes(entry.name)) continue;
      getAllSourceFiles(fullPath, files);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function deleteNestedKey(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) return;
    current = current[parts[i]];
  }
  delete current[parts[parts.length - 1]];

  // Clean up empty parent objects
  cleanEmptyObjects(obj, parts);
}

function cleanEmptyObjects(obj, parts) {
  for (let depth = parts.length - 2; depth >= 0; depth--) {
    let current = obj;
    for (let i = 0; i < depth; i++) {
      if (!current[parts[i]]) return;
      current = current[parts[i]];
    }
    const child = current[parts[depth]];
    if (typeof child === 'object' && child !== null && Object.keys(child).length === 0) {
      delete current[parts[depth]];
    }
  }
}

// ── Main ──

const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
const allKeys = flattenKeys(en);
console.log(`Total translation keys in en.json: ${allKeys.length}\n`);

// Collect all source files
const sourceFiles = getAllSourceFiles(SRC_DIR);

const allKeysSet = new Set(allKeys);

// Track which namespaces are used and how
const usedNamespaces = new Set();
const literalKeys = new Set();        // Full keys referenced literally (namespace.key)
const dynamicPrefixes = new Set();    // Prefixes where dynamic access prevents static analysis

for (const filePath of sourceFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Build a map of variable name → namespace for this file
  // e.g. { t: 'Auth', tCommon: 'Common', tSections: 'Sell.sections' }
  const varToNamespace = new Map();

  const assignmentPatterns = [
    // const t = useTranslations('Namespace')
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?useTranslations\(\s*['"]([^'"]+)['"]\s*\)/g,
    // const t = await getTranslations('Namespace')
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?getTranslations\(\s*['"]([^'"]+)['"]\s*\)/g,
    // const t = await getTranslations({ locale, namespace: 'Namespace' })
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?getTranslations\(\s*\{[^}]*namespace:\s*['"]([^'"]+)['"]/g,
  ];

  for (const pattern of assignmentPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const varName = match[1];
      const ns = match[2];
      varToNamespace.set(varName, ns);
      usedNamespaces.add(ns);
    }
  }

  // Also catch destructured or unassigned getTranslations (e.g., inside Promise.all)
  const unassignedPatterns = [
    /getTranslations\(\s*\{[^}]*namespace:\s*['"]([^'"]+)['"]/g,
    /getTranslations\(\s*['"]([^'"]+)['"]\s*\)/g,
    /useTranslations\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of unassignedPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      usedNamespaces.add(match[1]);
    }
  }

  // For each translation variable, find its key references
  for (const [varName, ns] of varToNamespace) {
    // Escape varName for regex
    const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Dynamic key patterns: varName(`prefix.${variable}`)
    const dynRegex = new RegExp(`\\b${escaped}\\(\\s*\`([^\`]*\\$\\{[^\`]*)\`\\s*\\)`, 'g');
    let dynMatch;
    while ((dynMatch = dynRegex.exec(content)) !== null) {
      const template = dynMatch[1];
      const staticPrefix = template.split('${')[0];
      if (staticPrefix) {
        dynamicPrefixes.add(`${ns}.${staticPrefix}`);
      } else {
        // Template starts with ${...} — all children of this namespace are dynamic
        dynamicPrefixes.add(`${ns}.`);
      }
    }

    // Literal key references: varName('key'), varName.rich('key'), etc.
    const litRegex = new RegExp(`\\b${escaped}(?:\\.(?:rich|markup|raw|has))?\\(\\s*['"]([^'"]+)['"]`, 'g');
    let litMatch;
    while ((litMatch = litRegex.exec(content)) !== null) {
      const key = litMatch[1];
      literalKeys.add(`${ns}.${key}`);
    }

  }

  // Broader pass: find ALL quoted strings in this file that look like translation keys
  // and check if they match any valid key path for namespaces used in this file.
  // This catches ternary expressions, variables, computed keys, etc.
  const allStrings = new Set();
  const stringPattern = /['"]([a-zA-Z][a-zA-Z0-9_.]*)['"]/g;
  let strMatch;
  while ((strMatch = stringPattern.exec(content)) !== null) {
    allStrings.add(strMatch[1]);
  }

  for (const str of allStrings) {
    for (const [, ns] of varToNamespace) {
      const fullKey = `${ns}.${str}`;
      // Only add if it's actually a valid key in the JSON
      if (allKeysSet.has(fullKey)) {
        literalKeys.add(fullKey);
      }
    }
  }
}

// Determine which keys are unused
const unusedKeys = [];
const keptByDynamic = [];
const keptByLiteral = [];

for (const key of allKeys) {
  // Get the top-level namespace
  const topNamespace = key.split('.')[0];

  // Check if any used namespace is a prefix of this key
  let namespaceUsed = false;
  for (const ns of usedNamespaces) {
    if (key === ns || key.startsWith(ns + '.')) {
      namespaceUsed = true;
      break;
    }
  }

  if (!namespaceUsed) {
    unusedKeys.push({ key, reason: 'namespace_not_referenced' });
    continue;
  }

  // Check if this key is covered by a dynamic prefix
  let isDynamic = false;
  for (const prefix of dynamicPrefixes) {
    if (key.startsWith(prefix)) {
      isDynamic = true;
      keptByDynamic.push(key);
      break;
    }
  }
  if (isDynamic) continue;

  // Check if this key (or a parent) is literally referenced
  let isLiteral = false;
  for (const lit of literalKeys) {
    if (key === lit || key.startsWith(lit + '.')) {
      isLiteral = true;
      break;
    }
  }
  if (isLiteral) {
    keptByLiteral.push(key);
    continue;
  }

  // Not referenced by dynamic or literal — likely unused
  unusedKeys.push({ key, reason: 'no_reference_found' });
}

// ── Report ──

const byNamespace = {};
for (const { key, reason } of unusedKeys) {
  const ns = key.split('.')[0];
  if (!byNamespace[ns]) byNamespace[ns] = [];
  byNamespace[ns].push({ key, reason });
}

console.log('=== UNUSED TRANSLATION KEYS ===\n');

const unreferencedNamespaces = [];
const unusedInActiveNamespaces = [];

for (const [ns, keys] of Object.entries(byNamespace).sort(([a], [b]) => a.localeCompare(b))) {
  const allNamespaceUnreferenced = keys.every(k => k.reason === 'namespace_not_referenced');
  if (allNamespaceUnreferenced) {
    unreferencedNamespaces.push({ ns, count: keys.length, keys: keys.map(k => k.key) });
  } else {
    unusedInActiveNamespaces.push({ ns, count: keys.length, keys: keys.map(k => k.key) });
  }
}

if (unreferencedNamespaces.length > 0) {
  console.log('── ENTIRE NAMESPACES NOT REFERENCED (safe to remove) ──');
  for (const { ns, count } of unreferencedNamespaces) {
    console.log(`  ${ns} (${count} keys)`);
  }
  console.log();
}

if (unusedInActiveNamespaces.length > 0) {
  console.log('── INDIVIDUAL UNUSED KEYS IN ACTIVE NAMESPACES ──');
  for (const { ns, keys } of unusedInActiveNamespaces) {
    console.log(`\n  [${ns}] (${keys.length} keys):`);
    for (const k of keys) {
      // Show the key relative to namespace for readability
      const relKey = k.key || k;
      console.log(`    - ${relKey}`);
    }
  }
  console.log();
}

console.log('── SUMMARY ──');
console.log(`  Total keys:                ${allKeys.length}`);
console.log(`  Kept (literal reference):  ${keptByLiteral.length}`);
console.log(`  Kept (dynamic reference):  ${keptByDynamic.length}`);
console.log(`  Unused (removable):        ${unusedKeys.length}`);
console.log(`  Unreferenced namespaces:   ${unreferencedNamespaces.length}`);
console.log();

// ── Remove mode ──

if (removeMode && unusedKeys.length > 0) {
  console.log('Removing unused keys from en.json and lv.json...\n');

  const lv = JSON.parse(fs.readFileSync(LV_PATH, 'utf-8'));

  for (const { key } of unusedKeys) {
    deleteNestedKey(en, key);
    deleteNestedKey(lv, key);
  }

  fs.writeFileSync(EN_PATH, JSON.stringify(en, null, 2) + '\n', 'utf-8');
  fs.writeFileSync(LV_PATH, JSON.stringify(lv, null, 2) + '\n', 'utf-8');

  const remainingKeys = flattenKeys(en);
  console.log(`Done. Removed ${unusedKeys.length} keys.`);
  console.log(`Remaining keys: ${remainingKeys.length}`);
} else if (unusedKeys.length > 0) {
  console.log('Run with --remove to delete these keys from en.json and lv.json');
}
