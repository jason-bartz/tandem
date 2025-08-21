#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create a simple SVG as placeholder for OG and Twitter images
const ogImageSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6B46C1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGradient)"/>
  
  <!-- Pattern overlay -->
  <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
    <circle cx="20" cy="20" r="2" fill="white" opacity="0.1"/>
  </pattern>
  <rect width="1200" height="630" fill="url(#dots)"/>
  
  <!-- Content container -->
  <rect x="50" y="50" width="1100" height="530" rx="20" fill="white" opacity="0.1"/>
  
  <!-- Logo placeholder -->
  <circle cx="600" cy="200" r="60" fill="white" opacity="0.9"/>
  <text x="600" y="215" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="#6B46C1">T</text>
  
  <!-- Title -->
  <text x="600" y="320" font-family="Arial, sans-serif" font-size="64" font-weight="bold" text-anchor="middle" fill="white">TANDEM</text>
  
  <!-- Tagline -->
  <text x="600" y="380" font-family="Arial, sans-serif" font-size="28" text-anchor="middle" fill="white" opacity="0.9">Daily Emoji Word Puzzle Game</text>
  
  <!-- Emoji examples -->
  <text x="400" y="460" font-family="Arial, sans-serif" font-size="48" text-anchor="middle">🎮</text>
  <text x="500" y="460" font-family="Arial, sans-serif" font-size="48" text-anchor="middle">🧩</text>
  <text x="600" y="460" font-family="Arial, sans-serif" font-size="48" text-anchor="middle">🎯</text>
  <text x="700" y="460" font-family="Arial, sans-serif" font-size="48" text-anchor="middle">🏆</text>
  <text x="800" y="460" font-family="Arial, sans-serif" font-size="48" text-anchor="middle">💡</text>
  
  <!-- Call to action -->
  <rect x="475" y="500" width="250" height="60" rx="30" fill="white"/>
  <text x="600" y="540" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#6B46C1">Play Now</text>
  
  <!-- URL -->
  <text x="600" y="590" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="white" opacity="0.7">tandem.game</text>
</svg>`;

const twitterImageSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="600" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradientTw" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6B46C1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="600" fill="url(#bgGradientTw)"/>
  
  <!-- Content -->
  <circle cx="600" cy="180" r="50" fill="white" opacity="0.9"/>
  <text x="600" y="195" font-family="Arial, sans-serif" font-size="40" font-weight="bold" text-anchor="middle" fill="#6B46C1">T</text>
  
  <text x="600" y="280" font-family="Arial, sans-serif" font-size="56" font-weight="bold" text-anchor="middle" fill="white">TANDEM</text>
  <text x="600" y="340" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="white" opacity="0.9">Match Emojis to Words Daily!</text>
  
  <!-- Emoji row -->
  <text x="450" y="420" font-family="Arial, sans-serif" font-size="40" text-anchor="middle">🎮</text>
  <text x="525" y="420" font-family="Arial, sans-serif" font-size="40" text-anchor="middle">🧩</text>
  <text x="600" y="420" font-family="Arial, sans-serif" font-size="40" text-anchor="middle">🎯</text>
  <text x="675" y="420" font-family="Arial, sans-serif" font-size="40" text-anchor="middle">🏆</text>
  <text x="750" y="420" font-family="Arial, sans-serif" font-size="40" text-anchor="middle">💡</text>
  
  <!-- CTA -->
  <rect x="500" y="470" width="200" height="50" rx="25" fill="white"/>
  <text x="600" y="502" font-family="Arial, sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="#6B46C1">Play Now</text>
  
  <text x="600" y="560" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="white" opacity="0.7">tandem.game</text>
</svg>`;

// Convert SVG to placeholder message (actual WebP conversion would require a graphics library)
const placeholderHTML = `<!DOCTYPE html>
<html>
<head>
  <title>OG Image Placeholder</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #6B46C1 0%, #8B5CF6 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }
    .container {
      text-align: center;
      color: white;
      padding: 2rem;
    }
    .logo {
      width: 120px;
      height: 120px;
      background: white;
      border-radius: 50%;
      margin: 0 auto 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 60px;
      font-weight: bold;
      color: #6B46C1;
    }
    h1 {
      font-size: 4rem;
      margin: 0 0 1rem;
      letter-spacing: 0.05em;
    }
    p {
      font-size: 1.5rem;
      margin: 0 0 2rem;
      opacity: 0.9;
    }
    .emojis {
      font-size: 3rem;
      margin: 2rem 0;
      letter-spacing: 0.5rem;
    }
    .note {
      background: rgba(255,255,255,0.1);
      padding: 1rem;
      border-radius: 8px;
      margin-top: 2rem;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">T</div>
    <h1>TANDEM</h1>
    <p>Daily Emoji Word Puzzle Game</p>
    <div class="emojis">🎮 🧩 🎯 🏆 💡</div>
    <div class="note">
      This is a placeholder for the Open Graph image.<br>
      Replace /public/og-image.webp with your actual image (1200x630px).
    </div>
  </div>
</body>
</html>`;

// Save files
const publicDir = path.join(process.cwd(), 'public');

// Save SVG files
fs.writeFileSync(path.join(publicDir, 'og-image.svg'), ogImageSVG);
fs.writeFileSync(path.join(publicDir, 'twitter-image.svg'), twitterImageSVG);

// Save HTML placeholder
fs.writeFileSync(path.join(publicDir, 'og-placeholder.html'), placeholderHTML);

console.log('✅ Created placeholder OG and Twitter images:');
console.log('   - /public/og-image.svg (1200x630)');
console.log('   - /public/twitter-image.svg (1200x600)');
console.log('   - /public/og-placeholder.html (preview)');
console.log('\n📝 Next steps:');
console.log('   1. Convert SVG files to WebP format using an image editor');
console.log('   2. Or use a service like Cloudinary to generate dynamic OG images');
console.log('   3. Update the images with your actual branding and design');