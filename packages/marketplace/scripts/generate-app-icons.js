#!/usr/bin/env node

/**
 * App Directory Icon Generator
 * Generates icon.png and apple-icon.png for Next.js App Router
 */

const sharp = require('sharp');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '../public/images/logo_nav_mobile.svg');
const APP_DIR = path.join(__dirname, '../app');

// Background color (snow white)
const BACKGROUND_COLOR = { r: 236, g: 239, b: 244, alpha: 1 };

async function generateAppIcon(size, filename) {
  try {
    await sharp(LOGO_PATH)
      .resize(size, size, {
        fit: 'contain',
        background: BACKGROUND_COLOR
      })
      .png()
      .toFile(path.join(APP_DIR, filename));

    console.log(`✓ Generated ${filename} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ Failed to generate ${filename}:`, error.message);
  }
}

async function generateAllAppIcons() {
  console.log('🎲 Generating Next.js App Router icons...\n');

  // icon.png - Used for favicon and default icon (Next.js recommends 32x32 or larger)
  await generateAppIcon(512, 'icon.png');

  // apple-icon.png - Used for Apple touch icon (180x180)
  await generateAppIcon(180, 'apple-icon.png');

  console.log('\n✅ App Router icons generated successfully!');
  console.log(`📁 Icons saved to: ${APP_DIR}`);
}

// Run the generator
generateAllAppIcons().catch(error => {
  console.error('❌ App icon generation failed:', error);
  process.exit(1);
});
