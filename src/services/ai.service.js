import Anthropic from '@anthropic-ai/sdk';
import logger from '@/lib/logger';

class AIService {
  constructor() {
    this.client = null;
    this.enabled = process.env.AI_GENERATION_ENABLED !== 'false';
    this.model = process.env.AI_MODEL || 'claude-3-5-sonnet-20241022';
    this.maxRetries = 2;
    this.timeout = 30000; // 30 seconds
    this.generationCount = 0; // Track for analytics
  }

  getClient() {
    if (!this.client && this.enabled) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        logger.warn('ANTHROPIC_API_KEY not found - AI generation disabled');
        this.enabled = false;
        return null;
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Generate a puzzle using AI
   * @param {Object} options - Generation options
   * @param {string} options.date - Target date for the puzzle
   * @param {Array} options.pastPuzzles - Recent puzzles for context (last 30-60 days)
   * @param {Array} options.excludeThemes - Themes to avoid
   * @returns {Promise<{theme: string, puzzles: Array<{emoji: string, answer: string}>}>}
   */
  async generatePuzzle({ date, pastPuzzles = [], excludeThemes = [] }) {
    const client = this.getClient();
    if (!client) {
      throw new Error('AI generation is not enabled. Please configure ANTHROPIC_API_KEY.');
    }

    const startTime = Date.now();
    let lastError = null;

    // Retry logic for production reliability
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const prompt = this.buildPrompt({ date, pastPuzzles, excludeThemes });
        logger.info('Generating puzzle with AI', {
          date,
          model: this.model,
          attempt: attempt + 1,
          maxAttempts: this.maxRetries + 1,
        });

        const message = await client.messages.create({
          model: this.model,
          max_tokens: 1024,
          temperature: 1.0, // Higher temperature for more creative variety
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = message.content[0].text;
        const duration = Date.now() - startTime;

        logger.info('AI response received', {
          length: responseText.length,
          duration,
          attempt: attempt + 1,
        });

        const puzzle = this.parseResponse(responseText);
        this.validatePuzzle(puzzle);

        // Track successful generation
        this.generationCount++;
        logger.info('Puzzle generated successfully', {
          date,
          theme: puzzle.theme,
          duration,
          totalGenerations: this.generationCount,
        });

        return puzzle;
      } catch (error) {
        lastError = error;
        logger.warn('AI generation attempt failed', {
          attempt: attempt + 1,
          error: error.message,
          willRetry: attempt < this.maxRetries,
        });

        // Don't retry on validation errors (puzzle format issues)
        if (error.message.includes('Invalid') || error.message.includes('must be')) {
          if (attempt < this.maxRetries) {
            continue; // Retry with different generation
          }
        }

        // Don't retry on authentication errors
        if (error.message.includes('authentication') || error.message.includes('API key')) {
          throw error;
        }

        if (attempt === this.maxRetries) {
          break;
        }

        // Brief delay before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    // All retries failed
    logger.error('AI puzzle generation failed after all retries', {
      attempts: this.maxRetries + 1,
      error: lastError,
    });
    throw new Error(
      `AI generation failed after ${this.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Build the prompt for AI puzzle generation
   */
  buildPrompt({ date, pastPuzzles, excludeThemes }) {
    const recentThemes = pastPuzzles
      .slice(0, 30)
      .map((p) => p.theme)
      .filter(Boolean);
    const allExcludedThemes = [...new Set([...recentThemes, ...excludeThemes])];

    const excludedThemesList =
      allExcludedThemes.length > 0
        ? `\nRecent/excluded themes to avoid:\n${allExcludedThemes.map((t) => `- ${t}`).join('\n')}`
        : '';

    return `You are creating a daily emoji puzzle game. Generate ONE puzzle with a creative theme and 4 emoji-word pairs.

REQUIREMENTS:
1. Theme: Must be creative, specific, and fun. Examples: "Things found in a kitchen", "Types of weather", "Ocean creatures"
2. Each puzzle pair consists of:
   - Two emojis that hint at a word
   - An answer (the word being described)
3. Answers must be:
   - 2-30 characters long
   - Common English words (not too obscure)
   - Appropriate difficulty (not too easy, not impossible)
   - All uppercase letters
4. Emojis must:
   - Be exactly 2 emojis per pair
   - Clearly relate to the answer
   - Be recognizable and commonly supported
5. All 4 pairs must relate to the theme
6. Ensure variety - don't repeat similar words or emoji combinations
${excludedThemesList}

RESPONSE FORMAT (JSON only, no explanation):
{
  "theme": "Your creative theme here",
  "puzzles": [
    {"emoji": "🍳🔥", "answer": "STOVE"},
    {"emoji": "❄️📦", "answer": "FRIDGE"},
    {"emoji": "🍞🔥", "answer": "TOASTER"},
    {"emoji": "☕⚡", "answer": "COFFEE"}
  ]
}

Generate a puzzle for ${date}. Be creative and ensure variety!`;
  }

  /**
   * Parse AI response into puzzle format
   */
  parseResponse(responseText) {
    try {
      // Try to extract JSON from the response (in case AI adds explanation)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const puzzle = JSON.parse(jsonMatch[0]);

      // Normalize the structure
      return {
        theme: puzzle.theme?.trim() || '',
        puzzles: (puzzle.puzzles || []).map((p) => ({
          emoji: p.emoji?.trim() || '',
          answer: p.answer?.trim().toUpperCase() || '',
        })),
      };
    } catch (error) {
      logger.error('Failed to parse AI response', { error, responseText });
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }

  /**
   * Validate the generated puzzle
   */
  validatePuzzle(puzzle) {
    if (!puzzle.theme || puzzle.theme.length < 5) {
      throw new Error('Invalid theme generated');
    }

    if (!Array.isArray(puzzle.puzzles) || puzzle.puzzles.length !== 4) {
      throw new Error('Must have exactly 4 puzzle pairs');
    }

    puzzle.puzzles.forEach((p, index) => {
      if (!p.emoji || !p.answer) {
        throw new Error(`Puzzle pair ${index + 1} is incomplete`);
      }

      // Count emoji characters (approximate - each emoji is typically 2+ chars)
      const emojiCount = (p.emoji.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
      if (emojiCount < 2) {
        throw new Error(
          `Puzzle pair ${index + 1} needs exactly 2 emojis, got ${emojiCount}: ${p.emoji}`
        );
      }

      if (p.answer.length < 2 || p.answer.length > 30) {
        throw new Error(`Answer "${p.answer}" must be 2-30 characters`);
      }

      if (!/^[A-Z\s,]+$/.test(p.answer)) {
        throw new Error(
          `Answer "${p.answer}" must contain only uppercase letters, spaces, and commas`
        );
      }
    });

    return true;
  }

  /**
   * Check if AI generation is available
   */
  isEnabled() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const enabled = this.enabled && !!apiKey;

    if (!enabled) {
      logger.warn('AI generation check failed', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length,
        enabledFlag: this.enabled,
        envKeys: Object.keys(process.env).filter(
          (k) => k.includes('AI') || k.includes('ANTHROPIC')
        ),
      });
    }

    return enabled;
  }
}

export default new AIService();
