# AI Puzzle Generation

## Overview

The admin panel now includes AI-powered puzzle generation using Anthropic's Claude API. This feature automatically creates themed puzzles with emoji-word pairs while ensuring variety and consistent difficulty.

## Features

### 🎯 Smart Theme Generation

- Analyzes past 30 days of puzzles to ensure theme variety
- Avoids duplicate or similar themes
- Creates creative and engaging themes

### 🎨 Automatic Content Creation

- Generates 4 emoji-word pairs per puzzle
- Ensures emojis clearly relate to answers
- Maintains consistent difficulty (4-10 letter words)
- Uses common, recognizable vocabulary

### ♻️ Regeneration Support

- Click "AI Generate" multiple times to try different themes
- Each generation analyzes existing puzzles for uniqueness
- All fields remain editable after generation

## Setup

### 1. Get an Anthropic API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Generate an API key

### 2. Configure Environment Variables

Add to your `.env.local` file:

```bash
# AI Puzzle Generation
ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here
AI_MODEL=claude-3-5-sonnet-20241022
AI_GENERATION_ENABLED=true
```

### 3. Restart Your Development Server

```bash
npm run dev
```

## Usage

### In the Admin Panel

1. Navigate to the Puzzle Editor
2. Select a date for your puzzle
3. Click the "✨ AI Generate" button next to the Theme field
4. Wait for the AI to generate a complete puzzle (theme + 4 emoji-word pairs)
5. Review and edit the generated content as needed
6. Click "Regenerate" to try a different theme
7. Save the puzzle

### Features in the UI

- **Loading State**: Shows a spinner while generating
- **Success Message**: Displays how many past puzzles were analyzed
- **Error Handling**: Shows clear error messages if generation fails
- **Manual Override**: All fields remain editable after generation

## How It Works

### Backend Flow

1. **API Endpoint**: `/api/admin/generate-puzzle`
   - Requires admin authentication
   - Rate limited to 10 requests per hour
   - Validates input and sanitizes output

2. **Context Gathering**:
   - Fetches last 30 days of puzzles from database
   - Extracts themes to avoid repetition
   - Passes context to AI service

3. **AI Generation**:
   - Uses Claude 3.5 Sonnet model
   - Structured prompt with clear requirements
   - High temperature (1.0) for creative variety
   - JSON response format for easy parsing

4. **Validation**:
   - Ensures exactly 4 puzzle pairs
   - Validates emoji count (must be 2 per pair)
   - Checks answer length (2-30 characters)
   - Verifies uppercase formatting

### Prompt Engineering

The AI prompt includes:

- Recent themes to avoid
- Format requirements (2 emojis + 1 answer per pair)
- Difficulty guidelines (common words, clear associations)
- Variety instructions (different categories, no repetition)
- JSON output format specification

## Rate Limiting

- **Default**: 10 generations per hour per admin
- **Purpose**: Prevent API abuse and control costs
- **Override**: Modify in `src/app/api/admin/generate-puzzle/route.js`

## Error Handling

### Common Errors

1. **"AI generation is not enabled"**
   - Check `ANTHROPIC_API_KEY` is set in `.env.local`
   - Verify `AI_GENERATION_ENABLED` is not set to `false`

2. **"Rate limit exceeded"**
   - Wait an hour or contact admin to increase limit

3. **"Failed to parse AI response"**
   - Rare edge case where AI doesn't return valid JSON
   - Simply click "Regenerate" to try again

4. **API Key Issues**
   - Ensure API key is valid and has credits
   - Check Anthropic Console for API status

## Cost Considerations

- **Model**: Claude 3.5 Sonnet (~$3 per million input tokens)
- **Average Request**: ~500-1000 tokens (input + output)
- **Estimated Cost**: ~$0.001-0.003 per puzzle generation
- **Monthly Estimate**: If generating 10 puzzles/day: ~$1-3/month

## Customization

### Adjust Past Puzzle Analysis Window

In `src/app/api/admin/generate-puzzle/route.js`:

```javascript
includePastDays: z.number().min(7).max(90).optional().default(30);
```

Change `default(30)` to analyze more or fewer days.

### Modify AI Temperature

In `src/services/ai.service.js`:

```javascript
temperature: 1.0, // Higher = more creative, Lower = more consistent
```

### Change AI Model

Update `.env.local`:

```bash
AI_MODEL=claude-3-opus-20240229  # More powerful but more expensive
AI_MODEL=claude-3-haiku-20240307 # Faster and cheaper
```

## Security

- ✅ Admin-only access (requires authentication)
- ✅ Rate limiting (prevents abuse)
- ✅ API key stored server-side (never exposed to client)
- ✅ Input validation (Zod schemas)
- ✅ Output sanitization (validates AI responses)

## Troubleshooting

### AI Button Not Appearing

- Check browser console for errors
- Verify admin authentication
- Ensure `adminService` is imported correctly

### Slow Generation

- Claude API typically responds in 2-5 seconds
- Check network connection
- Verify Anthropic API status

### Poor Quality Puzzles

- Try regenerating (click button again)
- Adjust temperature in AI service
- Modify prompt in `ai.service.js`

## Future Enhancements

Potential improvements:

- [ ] Difficulty level selection (easy/medium/hard)
- [ ] Theme category selection (food, sports, etc.)
- [ ] Batch generation (generate multiple puzzles at once)
- [ ] Custom instructions field
- [ ] Generation history and favorites
- [ ] A/B testing of different prompts

## Files Modified

- `package.json` - Added `@anthropic-ai/sdk` dependency
- `src/services/ai.service.js` - New AI service layer
- `src/app/api/admin/generate-puzzle/route.js` - New API endpoint
- `src/services/admin.service.js` - Added `generatePuzzle()` method
- `src/components/admin/PuzzleEditor.jsx` - Added AI generate button
- `src/lib/constants.js` - Added `ADMIN_GENERATE_PUZZLE` endpoint
- `.env.example` - Added AI configuration variables

## Support

For issues or questions:

1. Check this documentation
2. Review error messages in browser console
3. Check server logs for detailed error information
4. Verify API key and environment configuration
