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

THEME REQUIREMENTS:
- Use patterns like "Forms of ___", "Things That ___", "Types of ___", or similar constructions
- The theme should connect words that share a common characteristic or relationship
- Aim for themes where the connection isn't immediately obvious but feels satisfying when discovered
- Good examples: "Forms of Capital" (VENTURE, LETTER, PUNISHMENT, CITY), "Things That Melt" (ICE, BUTTER, CHOCOLATE, CANDLE)
- Bad example: "Musical Performance Terms" (too specialized/technical)

VOCABULARY REQUIREMENTS (CRITICAL):
- Use everyday vocabulary at Wordle difficulty level - recognizable but not necessarily easy
- NEVER use technical terms, foreign language words, specialized jargon, or niche vocabulary
- Explicitly BANNED: musical terms (legato, crescendo, ritornello), scientific jargon, legal terminology, medical terms, academic language
- Words should be used in mainstream contexts (news, conversations, popular media)
- Difficulty comes from clever themes and emoji connections, NOT from obscure vocabulary

EMOJI PAIR REQUIREMENTS:
- Use exactly 2 emojis per word
- Emoji pairs MUST provide intuitive visual or phonetic clues to the answer
- Test: Could someone reasonably deduce the answer from the two emojis?
- Avoid abstract concepts that can't be represented visually
- Avoid using the same emoji twice in one pair
- BAD example: 🎺📈 for CRESCENDO (too abstract, relies on knowing musical term)
- BAD example: 🦋👄 for LEGATO (makes no sense, no visual connection)
- GOOD example: ☀️🔥 for HOT (clear visual connection)
- GOOD example: 💰💼 for BUSINESS (clear contextual association)
- Consider using emojis that represent:
  * Direct visual representation of the word
  * Phonetic hints (rebus-style) that are clear
  * Contextual associations that most people would recognize
  * Related concepts that obviously combine to suggest the answer

DIFFICULTY BALANCE:
Within each puzzle, include:
- 1 easier pair: Most players should get this quickly (~70% success rate)
- 2 medium pairs: Requires some thinking but achievable (~40-60% success rate)
- 1 harder pair: The challenge answer, less obvious connection to theme (~20-30% success rate)
- Remember: Even the "hard" answer should be a word people know, just harder to connect to the theme

VARIETY REQUIREMENTS:
- Don't repeat words across different meaning contexts (e.g., avoid CAPITAL if theme is "Forms of Capital")
- Vary emoji categories (don't use all food emojis, all animal emojis, etc.)
- Ensure each answer feels distinct within its theme
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
