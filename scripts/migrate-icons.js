/**
 * Lucide to Griddy Icons Migration Script
 *
 * Run: node scripts/migrate-icons.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// Icon name transformations (Lucide -> Griddy)
// Format: LucideName -> GriddyName
// The script will import GriddyName as LucideName to keep JSX unchanged
const ICON_RENAMES = {
  'MapPin': 'LocationPin',
  'MessageCircle': 'ChatBubble',
  'MessageSquare': 'Chat',
  'Mail': 'Email',
  'Bell': 'Notification',
  'BellRing': 'NotificationRinging',
  'Clock': 'Time',
  'Sparkles': 'Sparks',
  'Zap': 'Flash',
  'Camera': 'PhotoCamera',
  'ExternalLink': 'LinkExternal',
  'Trash2': 'TrashAlt',
  'Info': 'InfoCircle',
  'XCircle': 'CloseCircle',
  'RotateCcw': 'Undo',
  'CheckCircle2': 'CheckCircleAlt01',
  'Puzzle': 'PuzzlePiece',
  'Building2': 'Building',
  'List': 'ListBulleted',
  'Share2': 'ShareAndroid',
  'Loader2': 'RefreshCw',
  'AtSign': 'At',
  'BarChart3': 'ChartBar',
  'TrendingUp': 'TrendUp',
  'ShoppingCart': 'ShoppingBasket',
  'CircleCheck': 'CheckCircle',
  'Dices': 'PuzzlePiece',
  'Locate': 'LocationMy',
  'SearchX': 'Search',
  // MapIcon is a duplicate - use Map
  'MapIcon': 'Map',
  'TruckIcon': 'Truck',
  // Settings/Sliders variants
  'SlidersHorizontal': 'SettingsAdjustHorizontal',
  'Cog': 'Settings',
  // Typography
  'Type': 'TextFont',
  // Missing icons - need alternatives
  'Pencil': 'Edit',
  'Wrench': 'Tool',
  'Baby': 'User', // No direct equivalent, use User for family audience
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

// Icons that should be kept as direct imports (same name in both libraries)
const DIRECT_ICONS = new Set([
  'Activity', 'AlertCircle', 'AlertTriangle', 'Archive', 'ArrowDown', 'ArrowDownLeft',
  'ArrowDownRight', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowUpLeft', 'ArrowUpRight',
  'Bookmark', 'Calendar', 'Check', 'CheckCircle', 'ChevronDown',
  'ChevronLeft', 'ChevronRight', 'ChevronUp', 'CreditCard', 'Download', 'Edit', 'Eye',
  'EyeOff', 'Filter', 'Globe', 'Grid', 'Heart', 'HelpCircle', 'Home', 'Image', 'Key', 'Link',
  'Lock', 'LogIn', 'LogOut', 'Map', 'Menu', 'Minus', 'MoreHorizontal', 'MoreVertical',
  'Package', 'Plus', 'RefreshCw', 'Search', 'Send', 'Settings', 'Shield', 'ShieldCheck',
  'ShoppingBag', 'Star', 'Tag', 'Trash', 'Truck', 'Upload', 'User', 'Users', 'Wallet', 'X',
  'BookOpen', 'ClipboardCheck', 'Phone', 'Tablet', 'Monitor', 'Wifi', 'WifiOff', 'FileText',
  'Maximize', 'Store', 'ImagePlus'
]);

/**
 * Find all TypeScript/TSX files in a directory recursively
 */
function findFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, dist directories
      if (['node_modules', '.next', 'dist', '.git'].includes(item)) continue;
      findFiles(fullPath, files);
    } else if (stat.isFile() && /\.(tsx?|ts)$/.test(item)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Migrate a single file
 */
function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  const changes = [];

  // Skip if no Lucide imports
  if (!content.includes('lucide-react')) {
    return { changed: false, changes: [] };
  }

  // Step 1: Find and transform the import statement
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;

  content = content.replace(importRegex, (match, iconList) => {
    const icons = iconList.split(',').map(i => i.trim()).filter(Boolean);
    const transformedIcons = [];
    const warningIcons = [];

    icons.forEach(icon => {
      // Handle "Icon as Alias" syntax
      const asMatch = icon.match(/^(\w+)\s+as\s+(\w+)$/);
      let originalName, alias;

      if (asMatch) {
        originalName = asMatch[1];
        alias = asMatch[2];
      } else {
        originalName = icon.trim();
        alias = null;
      }

      // Check if icon needs renaming
      if (ICON_RENAMES[originalName]) {
        const newName = ICON_RENAMES[originalName];
        if (alias) {
          // Already has alias: import { OldName as Alias } -> import { NewName as Alias }
          transformedIcons.push(`${newName} as ${alias}`);
          changes.push(`  Renamed: ${originalName} → ${newName} (kept alias ${alias})`);
        } else {
          // No alias: import { OldName } -> import { NewName as OldName }
          transformedIcons.push(`${newName} as ${originalName}`);
          changes.push(`  Renamed: ${originalName} → ${newName} (aliased to keep JSX unchanged)`);
        }
      } else if (DIRECT_ICONS.has(originalName)) {
        // Direct match, keep as-is
        transformedIcons.push(icon);
      } else {
        // Unknown icon - keep as-is but warn
        transformedIcons.push(icon);
        warningIcons.push(originalName);
      }
    });

    if (warningIcons.length > 0) {
      changes.push(`  ⚠️ Unknown icons (verify manually): ${warningIcons.join(', ')}`);
    }

    changes.push(`  Import: lucide-react → griddy-icons`);
    return `import { ${transformedIcons.join(', ')} } from 'griddy-icons'`;
  });

  // Step 2: Handle strokeWidth prop (Lucide-specific, remove)
  const strokeWidthRegex = /\s+strokeWidth=\{[^}]+\}/g;
  if (strokeWidthRegex.test(content)) {
    content = content.replace(strokeWidthRegex, '');
    changes.push('  Removed: strokeWidth={...} props');
  }

  const strokeWidthStringRegex = /\s+strokeWidth=["'][^"']+["']/g;
  if (strokeWidthStringRegex.test(content)) {
    content = content.replace(strokeWidthStringRegex, '');
    changes.push('  Removed: strokeWidth="..." props');
  }

  // Step 3: Handle absoluteStrokeWidth prop (Lucide-specific, remove)
  const absoluteStrokeWidthRegex = /\s+absoluteStrokeWidth/g;
  if (absoluteStrokeWidthRegex.test(content)) {
    content = content.replace(absoluteStrokeWidthRegex, '');
    changes.push('  Removed: absoluteStrokeWidth props');
  }

  // Step 4: Handle fill prop for toggle states
  // Pattern: fill={condition ? "currentColor" : "none"} → filled={condition}
  const fillToggleRegex = /fill=\{([^}]+)\s*\?\s*["']currentColor["']\s*:\s*["']none["']\}/g;
  if (fillToggleRegex.test(content)) {
    content = content.replace(fillToggleRegex, 'filled={$1}');
    changes.push('  Converted: fill={x ? "currentColor" : "none"} → filled={x}');
  }

  // Reverse pattern: fill={condition ? "none" : "currentColor"} → filled={!(condition)}
  const fillToggleReverseRegex = /fill=\{([^}]+)\s*\?\s*["']none["']\s*:\s*["']currentColor["']\}/g;
  if (fillToggleReverseRegex.test(content)) {
    content = content.replace(fillToggleReverseRegex, 'filled={!($1)}');
    changes.push('  Converted: fill={x ? "none" : "currentColor"} → filled={!(x)}');
  }

  // Step 5: Handle static fill="currentColor" → filled
  const staticFillRegex = /fill=["']currentColor["']/g;
  if (staticFillRegex.test(content)) {
    content = content.replace(staticFillRegex, 'filled');
    changes.push('  Converted: fill="currentColor" → filled');
  }

  // Step 6: Remove fill="none" (it's the default in Griddy)
  const fillNoneRegex = /\s+fill=["']none["']/g;
  if (fillNoneRegex.test(content)) {
    content = content.replace(fillNoneRegex, '');
    changes.push('  Removed: fill="none" (default in Griddy)');
  }

  const changed = content !== originalContent;

  if (changed && !DRY_RUN) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return { changed, changes };
}

/**
 * Main function
 */
async function main() {
  console.log('');
  console.log('🎨 Lucide → Griddy Icons Migration');
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '✏️  LIVE'}`);
  console.log('');

  const packagesDir = path.join(__dirname, '..', 'packages');

  if (!fs.existsSync(packagesDir)) {
    console.error('❌ packages/ directory not found');
    process.exit(1);
  }

  const files = findFiles(packagesDir);
  console.log(`📁 Found ${files.length} TypeScript/TSX files`);
  console.log('');

  let totalChanged = 0;
  let totalWarnings = 0;

  for (const file of files) {
    const { changed, changes } = migrateFile(file);

    if (changed) {
      totalChanged++;
      const relativePath = path.relative(path.join(__dirname, '..'), file);
      console.log(`📝 ${relativePath}`);
      changes.forEach(c => console.log(c));
      console.log('');

      if (changes.some(c => c.includes('⚠️'))) {
        totalWarnings++;
      }
    }
  }

  console.log('─'.repeat(60));
  console.log('');
  console.log(`📊 Summary:`);
  console.log(`   Files ${DRY_RUN ? 'to be ' : ''}modified: ${totalChanged}`);
  console.log(`   Files with warnings: ${totalWarnings}`);

  if (DRY_RUN) {
    console.log('');
    console.log('💡 Run without --dry-run to apply changes:');
    console.log('   node scripts/migrate-icons.js');
  } else {
    console.log('');
    console.log('✅ Migration complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Review changes: git diff');
    console.log('  2. Fix any warnings manually');
    console.log('  3. Handle Heart filled states (className fill-* → filled prop)');
    console.log('  4. Run: pnpm type-check && pnpm build');
    console.log('  5. Test all pages visually');
    console.log('  6. Remove lucide-react: pnpm remove lucide-react');
  }
  console.log('');
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
