# Bot Leaderboard System

Automated system for generating synthetic leaderboard entries to create the appearance of more active players during early growth phases.

## Overview

The bot leaderboard system generates realistic scores with randomized usernames at varying times throughout the day, creating an organic-looking leaderboard experience.

## Features

- **Realistic Usernames**: Combines varied first/second name parts for unique bot names
- **Beta-Distributed Scores**: Scores cluster around mid-range with some fast/slow outliers
- **Temporal Distribution**: Entries spread throughout the day or clustered at puzzle release
- **Per-Game Configuration**: Different score ranges for Tandem, Mini, and Reel Connections
- **Admin Controls**: Easy toggle and configuration from admin panel
- **Automated Generation**: Runs every 2 hours via Vercel Cron

## Setup

### 1. Run Database Migration

Execute the SQL migration to add bot support:

```bash
# Run in your Supabase SQL editor or via CLI
psql $DATABASE_URL -f database/add_bot_leaderboard_support.sql
```

This creates:

- `is_bot` and `bot_username` columns in `leaderboard_entries`
- `bot_leaderboard_config` table for settings
- `insert_bot_leaderboard_score()` function
- Updated leaderboard query functions

### 2. Configure Environment Variables

Add to your `.env` file (and Vercel environment variables):

```bash
# Required for bot generation (already exists)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required for Vercel Cron authentication
CRON_SECRET=generate_a_random_secret_here
```

Generate a secure cron secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Deploy to Vercel

The `vercel.json` configuration is already updated to run the cron job every 2 hours:

```json
{
  "crons": [
    {
      "path": "/api/cron/bot-leaderboard",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

Push to your repository and Vercel will automatically set up the cron job.

### 4. Enable via Admin Panel

1. Navigate to `/admin`
2. Click the **Leaderboards** tab
3. Toggle **Bot Generation** to ON
4. Adjust settings as needed:
   - Min/Max scores per day (10-30 recommended)
   - Score ranges for each game
   - Temporal distribution preference
5. Click **Save Configuration**
6. Optionally click **Generate Now** to create entries immediately

## Usage

### Admin Panel

The Leaderboards tab provides:

- **Toggle Switch**: Enable/disable bot generation
- **General Settings**:
  - Min/max scores per day per game
  - Distribution pattern (spread vs. clustered)
- **Score Ranges**: Configure realistic score bounds for each game
- **Manual Generation**: Trigger immediate bot entry creation
- **Auto-save**: All settings persist to database

### API Endpoints

All admin endpoints require JWT authentication.

#### Get Configuration

```bash
GET /api/admin/bot-leaderboard/config
Authorization: Bearer <admin_token>
```

#### Update Configuration

```bash
PUT /api/admin/bot-leaderboard/config
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "enabled": true,
  "min_scores_per_day": 15,
  "max_scores_per_day": 25,
  "tandem_min_score": 30,
  "tandem_max_score": 300,
  "spread_throughout_day": true
}
```

#### Generate Bot Entries

```bash
POST /api/admin/bot-leaderboard/generate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "date": "2026-01-21",  // Optional, defaults to today
  "gameType": "tandem",  // Optional, if omitted generates for all games
  "count": 20            // Optional, overrides config
}
```

#### Delete Bot Entries

```bash
DELETE /api/admin/bot-leaderboard/delete?gameType=tandem&date=2026-01-21
Authorization: Bearer <admin_token>
```

### Cron Endpoint

The automated cron job runs every 2 hours:

```bash
GET /api/cron/bot-leaderboard
Authorization: Bearer <CRON_SECRET>
```

This endpoint:

1. Checks if bot generation is enabled
2. Calculates random count between min/max
3. Checks existing bot entries for today
4. Generates remaining entries to reach target
5. Spreads entries across all games (Tandem, Mini, Reel)

## Configuration Details

### Default Score Ranges

| Game             | Min Score | Max Score | Notes          |
| ---------------- | --------- | --------- | -------------- |
| Daily Tandem     | 30s       | 300s      | 5 minutes max  |
| Daily Mini       | 60s       | 600s      | 10 minutes max |
| Reel Connections | 90s       | 900s      | 15 minutes max |

### Score Distribution

Scores use a beta distribution (α=2, β=2) which creates:

- 50% of scores in middle range
- 25% faster than average
- 25% slower than average
- Realistic performance curve

### Temporal Distribution

**Spread Throughout Day** (recommended):

- Random timestamps across 24 hours
- More organic appearance
- Mimics different time zones

**Clustered at Release**:

- Entries within first 6 hours
- Mimics dedicated daily players
- More concentrated activity

## Database Schema

### leaderboard_entries

```sql
- is_bot: BOOLEAN (default false)
- bot_username: TEXT (null for real users)
```

### bot_leaderboard_config

```sql
- enabled: BOOLEAN
- min_scores_per_day: INTEGER
- max_scores_per_day: INTEGER
- [game]_min_score: INTEGER (per game type)
- [game]_max_score: INTEGER (per game type)
- spread_throughout_day: BOOLEAN
```

## Monitoring

Bot entries are clearly marked in the database:

- `is_bot = true`
- `bot_username` contains generated name
- `user_id` is NULL

To count bot vs. real entries:

```sql
SELECT
  game_type,
  puzzle_date,
  COUNT(*) FILTER (WHERE is_bot) as bot_count,
  COUNT(*) FILTER (WHERE NOT is_bot) as real_count
FROM leaderboard_entries
WHERE puzzle_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY game_type, puzzle_date
ORDER BY puzzle_date DESC;
```

## Disabling

To disable bot generation:

1. Via Admin Panel: Toggle OFF in Leaderboards tab
2. Via API: Set `enabled: false` in config
3. Via Database:
   ```sql
   UPDATE bot_leaderboard_config SET enabled = false;
   ```

Bot entries remain in the database but no new ones are generated.

## Cleaning Up

To remove all bot entries:

```sql
DELETE FROM leaderboard_entries WHERE is_bot = true;
```

Or for specific dates/games, use the admin API delete endpoint.

## Security

- Bot entries excluded from streak leaderboards (no persistent advantage)
- Service role key required for generation (admin-only)
- Cron endpoint requires secret token
- Admin panel requires JWT authentication
- Rate limiting prevents abuse

## Future Enhancements

Potential improvements:

- Bot difficulty progression (better scores over time)
- Named "bot personalities" with consistent performance
- Smart generation based on real user activity
- Time-zone aware distribution
- Per-puzzle dynamic adjustment
