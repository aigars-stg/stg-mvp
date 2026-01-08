/**
 * Fix missing griddy-icons by adding alias imports
 * Run: node scripts/fix-missing-icons.js
 */

const fs = require('fs');
const path = require('path');

// Icon mappings (OldName → NewName)
const ICON_FIXES = {
  'Wrench': 'Tool',
  'Baby': 'User',
  'Lightbulb': 'LightbulbOn',
  'LayoutDashboard': 'Layout',
  'Euro': 'CurrencyEuro',
  'DollarSign': 'CurrencyDollar',
  'Landmark': 'Bank',
  'Smartphone': 'Phone',
  'ZoomIn': 'SearchPlus',
  'ZoomOut': 'SearchMinus',
  'Award': 'Trophy',
};

function findFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (['node_modules', '.next', 'dist', '.git'].includes(item)) continue;
      findFiles(fullPath, files);
    } else if (/\.tsx?$/.test(item)) {
      files.push(fullPath);
    }
  }
  return files;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  const changes = [];

  // Only process files with griddy-icons imports
  if (!content.includes("from 'griddy-icons'")) {
    return { changed: false, changes: [] };
  }

  // Find the import statement
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]griddy-icons['"]/;
  const match = content.match(importRegex);

  if (!match) {
    return { changed: false, changes: [] };
  }

  const importList = match[1];
  let newImportList = importList;

  // Fix each icon that needs to be mapped
  for (const [oldName, newName] of Object.entries(ICON_FIXES)) {
    // Check if this icon is imported without an alias already
    // Pattern: standalone icon name that's not already aliased
    const standaloneRegex = new RegExp(`\\b${oldName}\\b(?!\\s+as)(?!\\s*,\\s*\\w+\\s+as)`, 'g');

    if (standaloneRegex.test(newImportList)) {
      // Replace standalone OldName with NewName as OldName
      newImportList = newImportList.replace(
        new RegExp(`\\b${oldName}\\b(?!\\s+as)`, 'g'),
        `${newName} as ${oldName}`
      );
      changes.push(`  Fixed: ${oldName} → ${newName} as ${oldName}`);
    }
  }

  if (newImportList !== importList) {
    content = content.replace(importRegex, `import { ${newImportList} } from 'griddy-icons'`);
    fs.writeFileSync(filePath, content, 'utf-8');
    return { changed: true, changes };
  }

  return { changed: false, changes: [] };
}

async function main() {
  console.log('🔧 Fixing missing griddy-icons...\n');

  const packagesDir = path.join(__dirname, '..', 'packages');
  const files = findFiles(packagesDir);

  let totalFixed = 0;

  for (const file of files) {
    const { changed, changes } = fixFile(file);
    if (changed) {
      totalFixed++;
      const relativePath = path.relative(path.join(__dirname, '..'), file);
      console.log(`📝 ${relativePath}`);
      changes.forEach(c => console.log(c));
      console.log('');
    }
  }

  console.log(`\n✅ Fixed ${totalFixed} files`);
}

main().catch(console.error);
