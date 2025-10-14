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
        const genInfo = {
          date,
          model: this.model,
          attempt: attempt + 1,
          maxAttempts: this.maxRetries + 1,
        };
        console.log('[ai.service] Generating puzzle with AI:', genInfo);
        logger.info('Generating puzzle with AI', genInfo);

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

        const responseInfo = {
          length: responseText.length,
          duration,
          attempt: attempt + 1,
        };
        console.log('[ai.service] AI response received:', responseInfo);
        logger.info('AI response received', responseInfo);

        const puzzle = this.parseResponse(responseText);
        this.validatePuzzle(puzzle);

        // Track successful generation
        this.generationCount++;
        const successInfo = {
          date,
          theme: puzzle.theme,
          duration,
          totalGenerations: this.generationCount,
        };
        console.log('[ai.service] ✓ Puzzle generated successfully:', successInfo);
        logger.info('Puzzle generated successfully', successInfo);

        return puzzle;
      } catch (error) {
        lastError = error;

        // Enhanced error logging
        logger.error('AI generation attempt failed', {
          attempt: attempt + 1,
          errorMessage: error.message,
          errorType: error.constructor.name,
          errorStatus: error.status,
          errorCode: error.error?.type,
          willRetry: attempt < this.maxRetries,
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        });

        // Handle Anthropic API specific errors
        if (error.status === 429) {
          const retryAfter = error.error?.retry_after || Math.pow(2, attempt + 1);
          logger.warn('Rate limit hit, will retry after delay', {
            retryAfter,
            attempt: attempt + 1,
          });

          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
            continue;
          } else {
            // Add rate limit context to error
            error.message = `rate_limit: ${error.message}`;
            throw error;
          }
        }

        // Don't retry on authentication errors
        if (
          error.status === 401 ||
          error.message.includes('authentication') ||
          error.message.includes('API key')
        ) {
          logger.error('Authentication error - not retrying', { error: error.message });
          throw error;
        }

        // Service overloaded - retry with longer backoff
        if (error.status === 529) {
          logger.warn('Service overloaded, will retry with longer delay', { attempt: attempt + 1 });
          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt + 2) * 1000));
            continue;
          }
        }

        // Don't retry on validation errors (puzzle format issues) - but try once more with fresh generation
        if (error.message.includes('Invalid') || error.message.includes('must be')) {
          if (attempt < this.maxRetries) {
            logger.warn('Validation error, retrying with fresh generation', {
              error: error.message,
            });
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
        }

        if (attempt === this.maxRetries) {
          break;
        }

        // Brief delay before retry (exponential backoff)
        const backoffMs = Math.pow(2, attempt) * 1000;
        logger.info('Waiting before retry', { backoffMs, attempt: attempt + 1 });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
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

      // Count emoji characters using a comprehensive regex that handles:
      // - Standard emojis (1F300-1F9FF)
      // - Supplementary emojis (various ranges)
      // - Variation selectors (FE0F)
      // - ZWJ sequences
      // - Keycap sequences
      const emojiRegex =
        /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Regional_Indicator}{2}|[\u{1F1E6}-\u{1F1FF}]{2})/gu;
      const emojis = p.emoji.match(emojiRegex) || [];
      const emojiCount = emojis.length;

      if (emojiCount < 2) {
        throw new Error(
          `Puzzle pair ${index + 1} needs exactly 2 emojis, got ${emojiCount}: ${p.emoji} (matched: ${emojis.join(', ')})`
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
      const diagnostics = {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length,
        apiKeyPrefix: apiKey?.substring(0, 10),
        enabledFlag: this.enabled,
        aiGenerationEnabled: process.env.AI_GENERATION_ENABLED,
        nodeEnv: process.env.NODE_ENV,
        envKeys: Object.keys(process.env).filter(
          (k) => k.includes('AI') || k.includes('ANTHROPIC')
        ),
      };

      console.error('[ai.service] ✗ AI generation check FAILED:', diagnostics);

      // Provide actionable error message
      if (!apiKey) {
        console.error('[ai.service] MISSING: ANTHROPIC_API_KEY environment variable not set');
        console.error(
          '[ai.service] ACTION: Set ANTHROPIC_API_KEY in .env.local and restart server'
        );
      } else if (this.enabled === false) {
        console.error('[ai.service] DISABLED: AI_GENERATION_ENABLED is set to false');
        console.error('[ai.service] ACTION: Set AI_GENERATION_ENABLED=true in .env.local');
      }

      logger.warn('AI generation check failed', diagnostics);
    } else {
      console.log('[ai.service] ✓ AI generation is enabled and ready');
    }

    return enabled;
  }
}

export default new AIService();
