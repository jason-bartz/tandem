#!/usr/bin/env node

/**
 * Generate Emoji-Based Achievement Artwork
 * Creates 512x512px PNG files for all 31 Game Center achievements
 *
 * Requirements:
 * - Node.js 14+
 * - canvas package: npm install canvas
 *
 * Usage:
 * node scripts/generate-achievement-artwork.js
 */

const fs = require('fs');
const path = require('path');

// Check if canvas is installed
let Canvas;
try {
  Canvas = require('canvas');
} catch (error) {
  console.error('❌ canvas package not installed');
  console.log('\nTo install:');
  console.log('npm install canvas\n');
  console.log('Or use online tools like Figma/Canva to create artwork manually.');
  process.exit(1);
}

const { createCanvas, registerFont } = Canvas;

// Achievement definitions with emojis
const achievements = [
  // Streak achievements
  { id: 'first_pedal', emoji: '🔥', name: 'First Pedal' },
  { id: 'finding_rhythm', emoji: '⭐', name: 'Finding Rhythm' },
  { id: 'picking_up_speed', emoji: '💪', name: 'Picking Up Speed' },
  { id: 'steady_cadence', emoji: '🎯', name: 'Steady Cadence' },
  { id: 'cruising_along', emoji: '🚴', name: 'Cruising Along' },
  { id: 'rolling_hills', emoji: '⛰️', name: 'Rolling Hills' },
  { id: 'coast_to_coast', emoji: '🌊', name: 'Coast to Coast' },
  { id: 'monthly_rider', emoji: '🏆', name: 'Monthly Rider' },
  { id: 'swift_cyclist', emoji: '⚡', name: 'Swift Cyclist' },
  { id: 'starlight_ride', emoji: '🌟', name: 'Starlight Ride' },
  { id: 'seaside_route', emoji: '🏖️', name: 'Seaside Route' },
  { id: 'summit_seeker', emoji: '🗻', name: 'Summit Seeker' },
  { id: 'cross_country', emoji: '🎖️', name: 'Cross Country' },
  { id: 'century_ride', emoji: '💯', name: 'Century Ride' },
  { id: 'mountain_pass', emoji: '🦅', name: 'Mountain Pass' },
  { id: 'pathfinder', emoji: '🧭', name: 'Pathfinder' },
  { id: 'coastal_cruiser', emoji: '🌊', name: 'Coastal Cruiser' },
  { id: 'horizon_chaser', emoji: '🌅', name: 'Horizon Chaser' },
  { id: 'grand_tour', emoji: '🌍', name: 'Grand Tour' },
  { id: 'world_traveler', emoji: '🌎', name: 'World Traveler' },
  { id: 'round_the_sun', emoji: '☀️', name: 'Round the Sun' },
  { id: 'infinite_road', emoji: '🛤️', name: 'Infinite Road' },
  { id: 'legendary_journey', emoji: '🌟', name: 'Legendary Journey' }, // Will add 🏆🔥 programmatically

  // Wins achievements
  { id: 'first_win', emoji: '🎉', name: 'First Win' },
  { id: 'getting_hang', emoji: '👍', name: 'Getting the Hang of It' },
  { id: 'puzzle_pal', emoji: '🧩', name: 'Puzzle Pal' },
  { id: 'clever_cookie', emoji: '🍪', name: 'Clever Cookie' },
  { id: 'brainy_buddy', emoji: '🧠', name: 'Brainy Buddy' },
  { id: 'puzzle_whiz', emoji: '⚡', name: 'Puzzle Whiz' },
  { id: 'word_wizard', emoji: '🪄', name: 'Word Wizard' },
  { id: 'puzzle_king', emoji: '👑', name: 'Puzzle King' },
];

// Output directory
const outputDir = path.join(__dirname, '..', 'public', 'achievement-artwork');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Canvas size
const size = 512;

// Generate artwork for each achievement
console.log(`\n🎨 Generating ${achievements.length} achievement artwork files...\n`);

let successCount = 0;

achievements.forEach((achievement) => {
  try {
    // Create canvas
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Create gradient background (sky to teal)
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#0EA5E9'); // Sky blue
    gradient.addColorStop(1, '#14B8A6'); // Teal

    // Fill background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Draw emoji (centered, very large)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Special handling for legendary_journey (3 emojis)
    if (achievement.id === 'legendary_journey') {
      ctx.font = '180px Arial, sans-serif';
      const emojis = '🌟🏆🔥';
      const spacing = 140;
      const startX = size / 2 - spacing;

      ctx.fillText('🌟', startX, size / 2);
      ctx.fillText('🏆', size / 2, size / 2);
      ctx.fillText('🔥', startX + spacing * 2, size / 2);
    } else {
      // Single emoji - very large
      ctx.font = '320px Arial, sans-serif';
      ctx.fillText(achievement.emoji, size / 2, size / 2);
    }

    // Add subtle shadow/border effect
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);

    // Save to file
    const filename = `${achievement.id}.png`;
    const filepath = path.join(outputDir, filename);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);

    console.log(`✓ ${filename.padEnd(30)} - ${achievement.name}`);
    successCount++;
  } catch (error) {
    console.error(`✗ ${achievement.id}.png - Error: ${error.message}`);
  }
});

console.log(`\n✨ Successfully generated ${successCount}/${achievements.length} artwork files`);
console.log(`📁 Output directory: ${outputDir}\n`);

// Create a README in the output directory
const readmeContent = `# Achievement Artwork

Generated emoji-based placeholder artwork for Game Center achievements.

## Specifications
- Size: 512x512px
- Format: PNG with transparency
- Background: Sky-to-teal gradient (#0EA5E9 → #14B8A6)
- Content: Large centered emoji
- Generated: ${new Date().toISOString()}

## Usage

1. Review all 31 images
2. Upload to App Store Connect for each achievement
3. Apple will automatically apply circular mask

## Future Improvements

Consider commissioning professional artwork from a designer:
- Custom cycling-themed illustrations
- Consistent visual style
- More detailed graphics
- Better suited for circular mask

## Regeneration

To regenerate all artwork:
\`\`\`bash
node scripts/generate-achievement-artwork.js
\`\`\`

---
Auto-generated by Tandem Daily
`;

fs.writeFileSync(path.join(outputDir, 'README.md'), readmeContent);

console.log('📝 Created README.md in artwork directory\n');
console.log('🚀 Next Steps:');
console.log('1. Review generated artwork in public/achievement-artwork/');
console.log('2. Upload each PNG to corresponding achievement in App Store Connect');
console.log('3. Consider commissioning professional artwork for future update\n');
