/**
 * Daily Alchemy Save I/O
 * Client-side utilities for exporting/importing creative mode saves as .da files.
 * No external dependencies — uses native browser APIs only.
 */

export const DA_SAVE_VERSION = 1;
export const DA_FILE_EXTENSION = '.da';

/**
 * Serialize save data into the export file format.
 * @param {Object} saveData - Full save from loadCreativeSave() + slotName
 * @returns {Object} JSON-ready object for the .da file
 */
export function serializeSaveData(saveData) {
  return {
    version: DA_SAVE_VERSION,
    exportedAt: new Date().toISOString(),
    game: 'daily-alchemy-creative',
    save: {
      slotName: saveData.slotName || null,
      elementBank: saveData.elementBank || [],
      totalMoves: saveData.totalMoves || 0,
      totalDiscoveries: saveData.totalDiscoveries || 0,
      firstDiscoveries: saveData.firstDiscoveries || 0,
      firstDiscoveryElements: saveData.firstDiscoveryElements || [],
    },
  };
}

/**
 * Trigger a file download in the browser.
 * Uses Blob + hidden anchor click pattern — no server round-trip.
 */
export function triggerFileDownload(jsonString, fileName) {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a save file name like "Save-1 (Feb 10, 2026, 09-24 AM).da"
 */
export function generateSaveFileName(slotName) {
  const name = (slotName || 'Creative Save').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'short' });
  const day = now.getDate();
  const year = now.getFullYear();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = (hours % 12 || 12).toString().padStart(2, '0');
  return `${name} (${month} ${day}, ${year}, ${h12}-${minutes} ${ampm})${DA_FILE_EXTENSION}`;
}

/**
 * Read a File object as text. Returns a Promise.
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Parse and validate a save file's text content.
 * @returns {{ success: boolean, data: Object|null, error: string|null }}
 */
export function parseSaveFile(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      success: false,
      data: null,
      error: 'Invalid file format. The file could not be parsed.',
    };
  }

  const validation = validateSaveData(parsed);
  if (!validation.valid) {
    return { success: false, data: null, error: validation.error };
  }

  return { success: true, data: parsed, error: null };
}

/**
 * Validate the structure and contents of parsed save data.
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateSaveData(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid file structure.' };
  }

  // Version
  if (typeof data.version !== 'number' || data.version < 1) {
    return { valid: false, error: 'Invalid or missing save version.' };
  }
  if (data.version > DA_SAVE_VERSION) {
    return {
      valid: false,
      error: `This save was created with a newer version (v${data.version}). Please update the app.`,
    };
  }

  // Game identifier
  if (data.game !== 'daily-alchemy-creative') {
    return { valid: false, error: 'This file is not a Daily Alchemy creative mode save.' };
  }

  // Save object
  if (!data.save || typeof data.save !== 'object') {
    return { valid: false, error: 'Save data is missing.' };
  }

  const { save } = data;

  // Element bank
  if (!Array.isArray(save.elementBank) || save.elementBank.length === 0) {
    return { valid: false, error: 'Element bank is empty or missing.' };
  }
  if (save.elementBank.length > 10000) {
    return { valid: false, error: 'Element bank is too large.' };
  }

  // Each element
  for (let i = 0; i < save.elementBank.length; i++) {
    const el = save.elementBank[i];
    if (!el || typeof el !== 'object') {
      return { valid: false, error: `Invalid element at position ${i}.` };
    }
    if (typeof el.name !== 'string' || el.name.trim().length === 0) {
      return { valid: false, error: `Element at position ${i} has an invalid name.` };
    }
    if (el.name.length > 200) {
      return { valid: false, error: `Element name at position ${i} is too long.` };
    }
    if (typeof el.emoji !== 'string' || el.emoji.trim().length === 0) {
      return { valid: false, error: `Element at position ${i} has an invalid emoji.` };
    }
  }

  // Stats fields
  for (const field of ['totalMoves', 'totalDiscoveries', 'firstDiscoveries']) {
    if (save[field] !== undefined && (typeof save[field] !== 'number' || save[field] < 0)) {
      return { valid: false, error: `Invalid value for ${field}.` };
    }
  }

  // First discovery elements
  if (save.firstDiscoveryElements !== undefined) {
    if (!Array.isArray(save.firstDiscoveryElements)) {
      return { valid: false, error: 'Invalid firstDiscoveryElements.' };
    }
    if (!save.firstDiscoveryElements.every((e) => typeof e === 'string')) {
      return { valid: false, error: 'Invalid entries in firstDiscoveryElements.' };
    }
  }

  // Slot name
  if (save.slotName !== undefined && save.slotName !== null) {
    if (typeof save.slotName !== 'string' || save.slotName.length > 30) {
      return { valid: false, error: 'Invalid slot name in save file.' };
    }
  }

  return { valid: true, error: null };
}
