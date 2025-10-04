#!/usr/bin/env node
const { PUZZLE_TEMPLATES } = require('../src/lib/constants');

async function seedPuzzles() {
  console.log('Seeding puzzles...');

  const startDate = new Date('2025-08-15');
  const endDate = new Date('2025-12-31');

  const currentDate = new Date(startDate);
  let count = 0;

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const templateIndex = count % PUZZLE_TEMPLATES.length;
    const template = PUZZLE_TEMPLATES[templateIndex];

    console.log(`Creating puzzle for ${dateStr}: ${template.name}`);

    currentDate.setDate(currentDate.getDate() + 1);
    count++;
  }

  console.log(`\nSeeded ${count} puzzles for 2025`);
}

seedPuzzles().catch(console.error);
