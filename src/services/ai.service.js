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
   * @param {string} options.themeHint - Optional theme hint from user
   * @returns {Promise<{theme: string, puzzles: Array<{emoji: string, answer: string}>}>}
   */
  async generatePuzzle({ date, pastPuzzles = [], excludeThemes = [], themeHint }) {
    const client = this.getClient();
    if (!client) {
      throw new Error('AI generation is not enabled. Please configure ANTHROPIC_API_KEY.');
    }

    const startTime = Date.now();
    let lastError = null;

    // Retry logic for production reliability
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const prompt = this.buildPrompt({ date, pastPuzzles, excludeThemes, themeHint });
        const genInfo = {
          date,
          model: this.model,
          attempt: attempt + 1,
          maxAttempts: this.maxRetries + 1,
          hasThemeHint: !!themeHint,
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
  buildPrompt({ date, pastPuzzles, excludeThemes, themeHint }) {
    const recentThemes = pastPuzzles
      .slice(0, 30)
      .map((p) => p.theme)
      .filter(Boolean);
    const allExcludedThemes = [...new Set([...recentThemes, ...excludeThemes])];

    const excludedThemesList =
      allExcludedThemes.length > 0
        ? `\nRecent/excluded themes to avoid:\n${allExcludedThemes.map((t) => `- ${t}`).join('\n')}`
        : '';

    const themeInstructions = themeHint
      ? `USER REQUESTED THEME: "${themeHint}"
Generate 4 emoji-word pairs that fit this theme. IMPORTANT: You must refine and polish the theme text to match our standard formatting style before outputting it. Focus on creating excellent, guessable emoji pairs that match this theme.`
      : `You are creating a daily emoji puzzle game. Generate ONE puzzle with a creative theme and 4 emoji-word pairs.`;

    const themeRequirements = themeHint
      ? `
THEME PROVIDED BY USER: "${themeHint}"
CRITICAL THEME REFINEMENT REQUIREMENTS:
- Use "${themeHint}" as your INSPIRATION and guide
- You MUST refine and format the theme to match our standard patterns:
  * Use Title Case for all words (e.g., "Christmas Activities", not "christmas activities")
  * Add descriptive context if the hint is too simple (e.g., "christmas" → "Christmas Activities" or "Classic Christmas Movies")
  * Ensure proper grammar and article usage (e.g., "Things That Go Bump in the Night" not "things that go bump in the night")
  * Match our established theme patterns (see examples below)
- Stay true to the user's concept but present it professionally
- Focus on finding 4 excellent answers that fit this refined theme perfectly`
      : `
THEME REQUIREMENTS:
- Create a DIVERSE, CREATIVE theme that connects 4 words in an interesting way
- Vary your approach! Use different theme patterns:
  * Direct categories: "Board Games", "Pizza Toppings", "Dog Breeds", "Planets"
  * Descriptive phrases: "Things That Charge", "Things That Can Be Broken", "Words Before 'Stick'"
  * "Forms/Types of ___": "Forms of Capital", "Types of Layers", "Kinds of Energy"
  * Word relationships: "Synonyms for Fast", "Words That Follow 'Green'", "Palindromes"
  * Conceptual links: "Famous Pairs", "Things That Come in Dozens", "Red Things"
  * Activities/Actions: "Winter Sports", "Kitchen Verbs", "Dance Moves"
  * Places/Locations: "US State Capitals", "Famous Streets", "Ocean Names"
  * Pop culture: "Disney Characters", "Superhero Aliases", "Beatles Songs"
- CRITICAL: Do NOT default to "Forms of" or "Things That" patterns - mix it up!`;

    return `${themeInstructions}
${themeRequirements}

GOOD EXAMPLES (notice how emoji pairs work TOGETHER to be guessable):
- "Board Games" → MONOPOLY (🏠💰), LIFE (🚙👶), CHECKERS (⬛️🟥), SCRABBLE (🔤📖)
- "Things That Charge" → BATTERY (🔋⚡), CAVALRY (🐎⚔️), BULL (🐂🚩), LAWYER (⚖️💵)
- "Forms of Capital" → VENTURE (🏢💰), LETTER (✉️📝), PUNISHMENT (⚖️💀), CITY (🏛️🇩🇪)
- "Retro Videogame Franchises" → MARIO (🍄🪠), SONIC (🦔💍), TETRIS (🧱🏗️), PACMAN (👻💊)

BAD EXAMPLES (emojis are not cohesive or guessable):
- ❌ "Pizza Toppings" → PEPPERONI (🍕🥓) - uses pizza emoji in the answer
- ❌ "Dog Breeds" → BEAGLE (🐕👂) - just uses generic dog emoji

CRITICAL EMOJI RULES:
- NEVER use the theme itself as an emoji (e.g., don't use 🍕 for pizza toppings)
- NEVER use generic category emojis (e.g., don't use 🐕 for different dog breeds)
- The two emojis must combine to create a specific, guessable clue
- Each emoji must be unique across the entire puzzle - no repetition
- Aim for New York Times Connections difficulty: should require thought but feel satisfying when discovered

VOCABULARY REQUIREMENTS (CRITICAL):
- Use everyday vocabulary at Wordle difficulty level - recognizable but not necessarily easy
- NEVER use technical terms, foreign language words, specialized jargon, or niche vocabulary
- Explicitly BANNED: musical terms (legato, crescendo, ritornello), scientific jargon, legal terminology, medical terms, academic language
- Words should be used in mainstream contexts (news, conversations, popular media)
- Difficulty comes from clever themes and emoji connections, NOT from obscure vocabulary

EMOJI PAIR REQUIREMENTS:
- Use exactly 2 emojis per word
- CRITICAL: Each emoji must be unique across the entire puzzle - do NOT reuse any emoji in multiple answers
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

    // Track all emojis used across the puzzle to prevent repetition
    const allEmojisUsed = new Set();

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

      // Check for emoji repetition across answers
      emojis.forEach((emoji) => {
        if (allEmojisUsed.has(emoji)) {
          throw new Error(
            `Emoji "${emoji}" is used in multiple answers. Each emoji must be unique across the puzzle.`
          );
        }
        allEmojisUsed.add(emoji);
      });

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
