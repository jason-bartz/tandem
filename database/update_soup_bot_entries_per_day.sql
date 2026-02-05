-- =====================================================
-- UPDATE DAILY ALCHEMY BOT ENTRIES PER DAY
-- Change from default 20 to 10 entries per day
-- =====================================================

UPDATE bot_leaderboard_config
SET soup_entries_per_day = 10,
    updated_at = NOW();
