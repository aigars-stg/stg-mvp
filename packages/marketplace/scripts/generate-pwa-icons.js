#!/usr/bin/env node

/**
 * PWA Icon Generator
 * Generates all required PWA icons from the SVG logo
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '../public/images/logo_nav_mobile.svg');
const ICONS_DIR = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Standard icon sizes for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Background color for icons (snow white)
const BACKGROUND_COLOR = { r: 236, g: 239, b: 244, alpha: 1 };

async function generateIcon(size, filename, options = {}) {
  const { maskable = false } = options;

  try {
    let pipeline = sharp(LOGO_PATH);

    // For maskable icons, we need to add safe padding (20% on each side)
    // This ensures the icon isn't cropped on different devices
    if (maskable) {
      const paddedSize = Math.round(size / 0.8); // Icon takes 80% of canvas
      const padding = Math.round((paddedSize - size) / 2);

      pipeline = pipeline
        .resize(size, size, {
          fit: 'contain',
          background: BACKGROUND_COLOR
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: BACKGROUND_COLOR
        })
        .resize(size, size); // Resize back to target size
    } else {
      pipeline = pipeline
        .resize(size, size, {
          fit: 'contain',
          background: BACKGROUND_COLOR
        });
    }

    await pipeline.png().toFile(path.join(ICONS_DIR, filename));

    console.log(`✓ Generated ${filename} (${size}x${size}${maskable ? ' maskable' : ''})`);
  } catch (error) {
    console.error(`✗ Failed to generate ${filename}:`, error.message);
  }
}

async function generateAllIcons() {
  console.log('🎲 Generating PWA icons from dice logo...\n');

  // Generate standard icons
  for (const size of ICON_SIZES) {
    await generateIcon(size, `icon-${size}x${size}.png`);
  }

  // Generate maskable icon (512x512 with safe padding)
  await generateIcon(512, 'icon-maskable-512x512.png', { maskable: true });

  console.log('\n✅ All PWA icons generated successfully!');
  console.log(`📁 Icons saved to: ${ICONS_DIR}`);
}

// Run the generator
generateAllIcons().catch(error => {
  console.error('❌ Icon generation failed:', error);
  process.exit(1);
});
