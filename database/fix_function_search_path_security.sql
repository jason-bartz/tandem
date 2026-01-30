-- =============================================================================
-- MIGRATION: Fix Function Search Path Security Warnings
-- =============================================================================
-- This migration fixes all functions with mutable search_path by:
-- 1. Adding SET search_path = '' to all functions
-- 2. Using fully-qualified table names (public.tablename)
-- 3. Removing 'cryptic' from game_type checks (deprecated game)
--
-- Safe to run: Uses DROP IF EXISTS followed by CREATE
-- No service interruption: Functions are replaced atomically within transaction
-- =============================================================================

-- =============================================================================
-- SECTION 0: DROP FUNCTIONS THAT MAY HAVE SIGNATURE CONFLICTS
-- =============================================================================
-- These functions may exist with different return types/signatures, so we must
-- drop them before recreating. CASCADE is NOT used to avoid dropping triggers.

-- Word pattern functions
DROP FUNCTION IF EXISTS public.calculate_word_pattern(text);
DROP FUNCTION IF EXISTS public.validate_word_pattern(text, text);
DROP FUNCTION IF EXISTS public.format_answer_with_pattern(text);

-- Horoscope functions (may have different return table structure)
DROP FUNCTION IF EXISTS public.get_random_horoscope(text);
DROP FUNCTION IF EXISTS public.get_daily_horoscope(text, date);
DROP FUNCTION IF EXISTS public.get_daily_horoscope(text);

-- User profile function
DROP FUNCTION IF EXISTS public.get_user_profile_with_avatar(uuid);

-- Subscription functions
DROP FUNCTION IF EXISTS public.has_active_subscription(uuid);
DROP FUNCTION IF EXISTS public.get_user_subscription_tier(uuid);

-- Soup stats function
DROP FUNCTION IF EXISTS public.update_soup_aggregate_stats(uuid);

-- Normalize combination key functions
DROP FUNCTION IF EXISTS public.normalize_combination_key(text, text);
DROP FUNCTION IF EXISTS public.normalize_import_combination_key(text, text);

-- =============================================================================
-- SECTION 1: SIMPLE TRIGGER FUNCTIONS (updated_at timestamps)
-- =============================================================================

-- 1. Generic update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. update_mini_updated_at
CREATE OR REPLACE FUNCTION public.update_mini_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. update_mini_puzzles_updated_at
CREATE OR REPLACE FUNCTION public.update_mini_puzzles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4. update_mini_user_stats_updated_at
CREATE OR REPLACE FUNCTION public.update_mini_user_stats_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. update_reel_connections_updated_at
CREATE OR REPLACE FUNCTION public.update_reel_connections_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 6. update_reel_user_stats_updated_at
CREATE OR REPLACE FUNCTION public.update_reel_user_stats_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 7. update_tandem_puzzles_updated_at
CREATE OR REPLACE FUNCTION public.update_tandem_puzzles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 8. update_import_updated_at
CREATE OR REPLACE FUNCTION public.update_import_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. update_element_combinations_updated_at
CREATE OR REPLACE FUNCTION public.update_element_combinations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. update_feedback_updated_at
CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 11. update_creative_saves_updated_at
CREATE OR REPLACE FUNCTION public.update_creative_saves_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 12. update_user_stats_updated_at
CREATE OR REPLACE FUNCTION public.update_user_stats_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- SECTION 2: SUBSCRIPTION FUNCTIONS
-- =============================================================================

-- 13. has_active_subscription
CREATE FUNCTION public.has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_has_subscription BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > NOW())
  ) INTO v_has_subscription;

  RETURN COALESCE(v_has_subscription, FALSE);
END;
$$;

-- 14. get_user_subscription_tier
CREATE FUNCTION public.get_user_subscription_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT tier INTO v_tier
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > NOW())
  ORDER BY
    CASE tier
      WHEN 'champion' THEN 1
      WHEN 'pro' THEN 2
      WHEN 'starter' THEN 3
      ELSE 4
    END
  LIMIT 1;

  RETURN COALESCE(v_tier, 'free');
END;
$$;

-- =============================================================================
-- SECTION 3: WORD PATTERN FUNCTIONS (for cryptic/crossword puzzles)
-- =============================================================================

-- 15. calculate_word_pattern - calculates pattern like (4,3) from an answer
CREATE FUNCTION public.calculate_word_pattern(answer TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_pattern TEXT;
  v_words TEXT[];
  v_lengths TEXT[];
  v_word TEXT;
BEGIN
  IF answer IS NULL OR TRIM(answer) = '' THEN
    RETURN NULL;
  END IF;

  -- Split by spaces and hyphens, keeping structure
  v_words := regexp_split_to_array(TRIM(answer), '[\s\-]+');

  -- Get length of each word
  FOREACH v_word IN ARRAY v_words
  LOOP
    v_lengths := array_append(v_lengths, LENGTH(v_word)::TEXT);
  END LOOP;

  -- Join with commas and wrap in parentheses
  v_pattern := '(' || array_to_string(v_lengths, ',') || ')';

  RETURN v_pattern;
END;
$$;

-- 16. validate_word_pattern - validates that pattern matches answer
CREATE FUNCTION public.validate_word_pattern(answer TEXT, pattern TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_calculated_pattern TEXT;
BEGIN
  IF answer IS NULL OR pattern IS NULL THEN
    RETURN FALSE;
  END IF;

  v_calculated_pattern := public.calculate_word_pattern(answer);

  RETURN v_calculated_pattern = pattern;
END;
$$;

-- 17. format_answer_with_pattern - formats answer showing pattern
CREATE FUNCTION public.format_answer_with_pattern(answer TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_pattern TEXT;
BEGIN
  IF answer IS NULL OR TRIM(answer) = '' THEN
    RETURN NULL;
  END IF;

  v_pattern := public.calculate_word_pattern(answer);

  RETURN UPPER(TRIM(answer)) || ' ' || v_pattern;
END;
$$;

-- 18. auto_calculate_and_validate_word_pattern - trigger function
CREATE OR REPLACE FUNCTION public.auto_calculate_and_validate_word_pattern()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Auto-calculate pattern if not provided
  IF NEW.word_pattern IS NULL AND NEW.answer IS NOT NULL THEN
    NEW.word_pattern := public.calculate_word_pattern(NEW.answer);
  END IF;

  -- Validate pattern matches answer
  IF NEW.word_pattern IS NOT NULL AND NEW.answer IS NOT NULL THEN
    IF NOT public.validate_word_pattern(NEW.answer, NEW.word_pattern) THEN
      RAISE EXCEPTION 'Word pattern % does not match answer %', NEW.word_pattern, NEW.answer;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- SECTION 4: HELPER FUNCTIONS (IMMUTABLE)
-- =============================================================================

-- 19. normalize_combination_key (for Daily Alchemy)
CREATE FUNCTION public.normalize_combination_key(a TEXT, b TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF LOWER(TRIM(a)) <= LOWER(TRIM(b)) THEN
    RETURN LOWER(TRIM(a)) || '|' || LOWER(TRIM(b));
  ELSE
    RETURN LOWER(TRIM(b)) || '|' || LOWER(TRIM(a));
  END IF;
END;
$$;

-- 20. normalize_import_combination_key (for imported elements)
CREATE FUNCTION public.normalize_import_combination_key(a TEXT, b TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF LOWER(TRIM(a)) <= LOWER(TRIM(b)) THEN
    RETURN LOWER(TRIM(a)) || '|' || LOWER(TRIM(b));
  ELSE
    RETURN LOWER(TRIM(b)) || '|' || LOWER(TRIM(a));
  END IF;
END;
$$;

-- =============================================================================
-- SECTION 5: HOROSCOPE FUNCTIONS
-- =============================================================================

-- 21. get_random_horoscope
CREATE FUNCTION public.get_random_horoscope(p_sign TEXT)
RETURNS TABLE (
  id UUID,
  sign TEXT,
  content TEXT,
  lucky_number INTEGER,
  lucky_color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT h.id, h.sign, h.content, h.lucky_number, h.lucky_color
  FROM public.horoscopes h
  WHERE h.sign = LOWER(p_sign)
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$;

-- 22. get_daily_horoscope
CREATE FUNCTION public.get_daily_horoscope(p_sign TEXT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  id UUID,
  sign TEXT,
  content TEXT,
  lucky_number INTEGER,
  lucky_color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seed INTEGER;
  v_count INTEGER;
  v_offset INTEGER;
BEGIN
  -- Create a deterministic seed from date and sign
  v_seed := (EXTRACT(DOY FROM p_date)::INTEGER * 100) + ASCII(SUBSTRING(LOWER(p_sign), 1, 1));

  -- Get count of horoscopes for this sign
  SELECT COUNT(*) INTO v_count
  FROM public.horoscopes h
  WHERE h.sign = LOWER(p_sign);

  IF v_count = 0 THEN
    RETURN;
  END IF;

  -- Calculate deterministic offset
  v_offset := v_seed % v_count;

  RETURN QUERY
  SELECT h.id, h.sign, h.content, h.lucky_number, h.lucky_color
  FROM public.horoscopes h
  WHERE h.sign = LOWER(p_sign)
  ORDER BY h.id
  OFFSET v_offset
  LIMIT 1;
END;
$$;

-- =============================================================================
-- SECTION 6: USER PROFILE FUNCTION
-- =============================================================================

-- 23. get_user_profile_with_avatar
CREATE FUNCTION public.get_user_profile_with_avatar(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  avatar_image_path TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.username,
    u.avatar_url,
    a.image_path as avatar_image_path,
    u.created_at
  FROM public.users u
  LEFT JOIN public.avatars a ON u.selected_avatar_id = a.id
  WHERE u.id = p_user_id;
END;
$$;

-- =============================================================================
-- SECTION 7: SOUP AGGREGATE STATS FUNCTION
-- =============================================================================

-- 24. update_soup_aggregate_stats
CREATE FUNCTION public.update_soup_aggregate_stats(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total_completed INTEGER;
  v_total_moves INTEGER;
  v_best_time INTEGER;
  v_avg_time INTEGER;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_last_played DATE;
  v_total_discoveries INTEGER;
  v_first_discoveries INTEGER;
  v_under_par INTEGER;
  v_at_par INTEGER;
  v_over_par INTEGER;
BEGIN
  -- Calculate aggregate stats from game_stats
  SELECT
    COUNT(*) FILTER (WHERE completed = true),
    SUM(moves_count) FILTER (WHERE completed = true),
    MIN(time_taken) FILTER (WHERE completed = true),
    AVG(time_taken) FILTER (WHERE completed = true)::INTEGER,
    SUM(elements_discovered),
    SUM(first_discoveries),
    COUNT(*) FILTER (WHERE completed = true AND moves_count < par_moves),
    COUNT(*) FILTER (WHERE completed = true AND moves_count = par_moves),
    COUNT(*) FILTER (WHERE completed = true AND moves_count > par_moves)
  INTO
    v_total_completed,
    v_total_moves,
    v_best_time,
    v_avg_time,
    v_total_discoveries,
    v_first_discoveries,
    v_under_par,
    v_at_par,
    v_over_par
  FROM public.element_soup_game_stats
  WHERE user_id = p_user_id;

  -- Calculate streaks
  WITH consecutive_days AS (
    SELECT
      puzzle_date,
      puzzle_date - (ROW_NUMBER() OVER (ORDER BY puzzle_date))::INTEGER AS grp
    FROM public.element_soup_game_stats
    WHERE user_id = p_user_id AND completed = true
    ORDER BY puzzle_date
  ),
  streak_groups AS (
    SELECT
      grp,
      COUNT(*) AS streak_length,
      MAX(puzzle_date) AS last_date
    FROM consecutive_days
    GROUP BY grp
  )
  SELECT
    COALESCE(MAX(streak_length), 0),
    COALESCE((SELECT streak_length FROM streak_groups ORDER BY last_date DESC LIMIT 1), 0),
    (SELECT MAX(puzzle_date) FROM public.element_soup_game_stats WHERE user_id = p_user_id AND completed = true)
  INTO v_longest_streak, v_current_streak, v_last_played
  FROM streak_groups;

  -- Check if current streak is actually current (played yesterday or today)
  IF v_last_played IS NOT NULL AND v_last_played < CURRENT_DATE - 1 THEN
    v_current_streak := 0;
  END IF;

  -- Upsert aggregate stats
  INSERT INTO public.element_soup_user_stats (
    user_id,
    total_completed,
    total_moves,
    best_time,
    average_time,
    current_streak,
    longest_streak,
    last_played_date,
    total_discoveries,
    first_discoveries,
    under_par_count,
    at_par_count,
    over_par_count
  ) VALUES (
    p_user_id,
    COALESCE(v_total_completed, 0),
    COALESCE(v_total_moves, 0),
    v_best_time,
    v_avg_time,
    COALESCE(v_current_streak, 0),
    COALESCE(v_longest_streak, 0),
    v_last_played,
    COALESCE(v_total_discoveries, 0),
    COALESCE(v_first_discoveries, 0),
    COALESCE(v_under_par, 0),
    COALESCE(v_at_par, 0),
    COALESCE(v_over_par, 0)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_completed = EXCLUDED.total_completed,
    total_moves = EXCLUDED.total_moves,
    best_time = EXCLUDED.best_time,
    average_time = EXCLUDED.average_time,
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    last_played_date = EXCLUDED.last_played_date,
    total_discoveries = EXCLUDED.total_discoveries,
    first_discoveries = EXCLUDED.first_discoveries,
    under_par_count = EXCLUDED.under_par_count,
    at_par_count = EXCLUDED.at_par_count,
    over_par_count = EXCLUDED.over_par_count,
    updated_at = NOW();
END;
$$;

-- =============================================================================
-- SECTION 8: LEADERBOARD FUNCTIONS
-- =============================================================================

-- Drop existing functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS public.get_daily_leaderboard(TEXT, DATE, INTEGER);
DROP FUNCTION IF EXISTS public.get_streak_leaderboard(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_user_daily_rank(UUID, TEXT, DATE);
DROP FUNCTION IF EXISTS public.submit_leaderboard_score(UUID, TEXT, TEXT, DATE, INTEGER, JSONB);
DROP FUNCTION IF EXISTS public.insert_bot_leaderboard_score(TEXT, DATE, INTEGER, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.insert_bot_streak_entry(TEXT, INTEGER, TEXT, TEXT, DATE, JSONB);
DROP FUNCTION IF EXISTS public.upsert_bot_streak_entry(TEXT, INTEGER, TEXT, TEXT, JSONB);

-- 25. get_daily_leaderboard
CREATE FUNCTION public.get_daily_leaderboard(
  p_game_type TEXT,
  p_puzzle_date DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  entry_id UUID,
  user_id UUID,
  display_name TEXT,
  score INTEGER,
  rank BIGINT,
  submitted_at TIMESTAMPTZ,
  metadata JSONB,
  is_bot BOOLEAN,
  avatar_image_path TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Validate game type (cryptic removed)
  IF p_game_type NOT IN ('tandem', 'mini', 'reel', 'soup') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  RETURN QUERY
  WITH ranked_entries AS (
    SELECT
      le.id as entry_id,
      le.user_id,
      COALESCE(le.bot_username, u.username) as display_name,
      le.score,
      RANK() OVER (ORDER BY le.score ASC) as rank,
      le.created_at as submitted_at,
      le.metadata,
      le.is_bot,
      COALESCE(bot_av.image_path, user_av.image_path) as avatar_image_path
    FROM public.leaderboard_entries le
    LEFT JOIN public.users u ON le.user_id = u.id
    LEFT JOIN public.avatars user_av ON u.selected_avatar_id = user_av.id
    LEFT JOIN public.avatars bot_av ON le.bot_avatar_id = bot_av.id
    WHERE le.game_type = p_game_type
      AND le.leaderboard_type = 'daily_speed'
      AND le.puzzle_date = p_puzzle_date
    ORDER BY le.score ASC
  )
  SELECT * FROM ranked_entries
  LIMIT p_limit;
END;
$$;

-- 26. get_streak_leaderboard
CREATE FUNCTION public.get_streak_leaderboard(
  p_game_type TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  entry_id UUID,
  user_id UUID,
  display_name TEXT,
  score INTEGER,
  rank BIGINT,
  submitted_at TIMESTAMPTZ,
  metadata JSONB,
  is_bot BOOLEAN,
  avatar_image_path TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Validate game type (cryptic removed)
  IF p_game_type NOT IN ('tandem', 'mini', 'reel', 'soup') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  RETURN QUERY
  WITH ranked_entries AS (
    SELECT
      le.id as entry_id,
      le.user_id,
      COALESCE(le.bot_username, u.username) as display_name,
      le.score,
      RANK() OVER (ORDER BY le.score DESC) as rank,
      le.created_at as submitted_at,
      le.metadata,
      le.is_bot,
      COALESCE(bot_av.image_path, user_av.image_path) as avatar_image_path
    FROM public.leaderboard_entries le
    LEFT JOIN public.users u ON le.user_id = u.id
    LEFT JOIN public.avatars user_av ON u.selected_avatar_id = user_av.id
    LEFT JOIN public.avatars bot_av ON le.bot_avatar_id = bot_av.id
    WHERE le.game_type = p_game_type
      AND le.leaderboard_type = 'best_streak'
    ORDER BY le.score DESC
  )
  SELECT * FROM ranked_entries
  LIMIT p_limit;
END;
$$;

-- 27. submit_leaderboard_score
CREATE FUNCTION public.submit_leaderboard_score(
  p_user_id UUID,
  p_game_type TEXT,
  p_leaderboard_type TEXT,
  p_puzzle_date DATE,
  p_score INTEGER,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entry_id UUID;
  v_existing_score INTEGER;
  v_last_submission TIMESTAMPTZ;
BEGIN
  -- Validate game type (cryptic removed)
  IF p_game_type NOT IN ('tandem', 'mini', 'reel', 'soup') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  -- Validate leaderboard type
  IF p_leaderboard_type NOT IN ('daily_speed', 'best_streak') THEN
    RAISE EXCEPTION 'Invalid leaderboard type: %', p_leaderboard_type;
  END IF;

  -- Check rate limiting (5 seconds between submissions)
  SELECT MAX(updated_at) INTO v_last_submission
  FROM public.leaderboard_entries
  WHERE user_id = p_user_id
    AND game_type = p_game_type
    AND leaderboard_type = p_leaderboard_type;

  IF v_last_submission IS NOT NULL AND
     v_last_submission > NOW() - INTERVAL '5 seconds' THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before submitting again.';
  END IF;

  -- Check if user has leaderboards disabled
  IF EXISTS (
    SELECT 1 FROM public.leaderboard_preferences
    WHERE user_id = p_user_id AND enabled = false
  ) THEN
    RAISE EXCEPTION 'Leaderboards disabled for this user';
  END IF;

  IF p_leaderboard_type = 'daily_speed' THEN
    SELECT score INTO v_existing_score
    FROM public.leaderboard_entries
    WHERE user_id = p_user_id
      AND game_type = p_game_type
      AND leaderboard_type = p_leaderboard_type
      AND puzzle_date = p_puzzle_date;

    IF v_existing_score IS NOT NULL THEN
      IF p_score < v_existing_score THEN
        UPDATE public.leaderboard_entries
        SET score = p_score,
            metadata = p_metadata,
            updated_at = NOW()
        WHERE user_id = p_user_id
          AND game_type = p_game_type
          AND leaderboard_type = p_leaderboard_type
          AND puzzle_date = p_puzzle_date
        RETURNING id INTO v_entry_id;
      ELSE
        RETURN NULL;
      END IF;
    ELSE
      INSERT INTO public.leaderboard_entries (user_id, game_type, leaderboard_type, puzzle_date, score, metadata)
      VALUES (p_user_id, p_game_type, p_leaderboard_type, p_puzzle_date, p_score, p_metadata)
      RETURNING id INTO v_entry_id;
    END IF;
  ELSE
    SELECT score INTO v_existing_score
    FROM public.leaderboard_entries
    WHERE user_id = p_user_id
      AND game_type = p_game_type
      AND leaderboard_type = p_leaderboard_type;

    IF v_existing_score IS NOT NULL THEN
      IF p_score > v_existing_score THEN
        UPDATE public.leaderboard_entries
        SET score = p_score,
            metadata = p_metadata,
            puzzle_date = p_puzzle_date,
            updated_at = NOW()
        WHERE user_id = p_user_id
          AND game_type = p_game_type
          AND leaderboard_type = p_leaderboard_type
        RETURNING id INTO v_entry_id;
      ELSE
        RETURN NULL;
      END IF;
    ELSE
      INSERT INTO public.leaderboard_entries (user_id, game_type, leaderboard_type, puzzle_date, score, metadata)
      VALUES (p_user_id, p_game_type, p_leaderboard_type, p_puzzle_date, p_score, p_metadata)
      RETURNING id INTO v_entry_id;
    END IF;
  END IF;

  RETURN v_entry_id;
END;
$$;

-- 28. get_user_daily_rank
CREATE FUNCTION public.get_user_daily_rank(
  p_user_id UUID,
  p_game_type TEXT,
  p_puzzle_date DATE
)
RETURNS TABLE (
  score INTEGER,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Validate game type (cryptic removed)
  IF p_game_type NOT IN ('tandem', 'mini', 'reel', 'soup') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      le.user_id,
      le.score,
      RANK() OVER (ORDER BY le.score ASC) as rank
    FROM public.leaderboard_entries le
    LEFT JOIN public.leaderboard_preferences lp ON lp.user_id = le.user_id
    WHERE le.game_type = p_game_type
      AND le.leaderboard_type = 'daily_speed'
      AND le.puzzle_date = p_puzzle_date
      AND (lp.enabled IS NULL OR lp.enabled = true)
  )
  SELECT r.score, r.rank
  FROM ranked r
  WHERE r.user_id = p_user_id;
END;
$$;

-- 29. insert_bot_leaderboard_score
CREATE FUNCTION public.insert_bot_leaderboard_score(
  p_game_type TEXT,
  p_puzzle_date DATE,
  p_score INTEGER,
  p_bot_username TEXT,
  p_bot_avatar_id TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  -- Validate game type (cryptic removed)
  IF p_game_type NOT IN ('tandem', 'mini', 'reel', 'soup') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  INSERT INTO public.leaderboard_entries (
    user_id,
    game_type,
    leaderboard_type,
    puzzle_date,
    score,
    metadata,
    is_bot,
    bot_username,
    bot_avatar_id
  ) VALUES (
    NULL,
    p_game_type,
    'daily_speed',
    p_puzzle_date,
    p_score,
    p_metadata,
    TRUE,
    p_bot_username,
    p_bot_avatar_id
  )
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

-- 30. insert_bot_streak_entry
CREATE FUNCTION public.insert_bot_streak_entry(
  p_game_type TEXT,
  p_streak_days INTEGER,
  p_bot_username TEXT,
  p_bot_avatar_id TEXT,
  p_puzzle_date DATE DEFAULT CURRENT_DATE,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  -- Validate game type (cryptic removed)
  IF p_game_type NOT IN ('tandem', 'mini', 'reel', 'soup') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  INSERT INTO public.leaderboard_entries (
    user_id,
    game_type,
    leaderboard_type,
    puzzle_date,
    score,
    metadata,
    is_bot,
    bot_username,
    bot_avatar_id
  ) VALUES (
    NULL,
    p_game_type,
    'best_streak',
    p_puzzle_date,
    p_streak_days,
    p_metadata,
    TRUE,
    p_bot_username,
    p_bot_avatar_id
  )
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

-- 31. upsert_bot_streak_entry
CREATE FUNCTION public.upsert_bot_streak_entry(
  p_game_type TEXT,
  p_streak_days INTEGER,
  p_bot_username TEXT,
  p_bot_avatar_id TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  -- Validate game type (cryptic removed)
  IF p_game_type NOT IN ('tandem', 'mini', 'reel', 'soup') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  -- Upsert bot streak entry using the unique index
  INSERT INTO public.leaderboard_entries (
    user_id,
    game_type,
    leaderboard_type,
    puzzle_date,
    score,
    metadata,
    is_bot,
    bot_username,
    bot_avatar_id
  ) VALUES (
    NULL,
    p_game_type,
    'best_streak',
    CURRENT_DATE,
    p_streak_days,
    p_metadata,
    TRUE,
    p_bot_username,
    p_bot_avatar_id
  )
  ON CONFLICT (bot_username, game_type)
  WHERE is_bot = TRUE AND bot_username IS NOT NULL AND leaderboard_type = 'best_streak'
  DO UPDATE SET
    score = EXCLUDED.score,
    puzzle_date = CURRENT_DATE,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

-- =============================================================================
-- SECTION 9: UPDATE GAME TYPE CONSTRAINT
-- =============================================================================

-- Remove 'cryptic' from the game_type constraint
ALTER TABLE public.leaderboard_entries
DROP CONSTRAINT IF EXISTS leaderboard_entries_game_type_check;

ALTER TABLE public.leaderboard_entries
ADD CONSTRAINT leaderboard_entries_game_type_check
CHECK (game_type IN ('tandem', 'mini', 'reel', 'soup'));

-- =============================================================================
-- VERIFICATION QUERIES (run manually after migration)
-- =============================================================================
/*
-- Check all functions have search_path set:
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE
    WHEN p.proconfig IS NULL THEN 'NO search_path set'
    WHEN 'search_path=' = ANY(p.proconfig) THEN 'search_path is empty string'
    WHEN array_to_string(p.proconfig, ',') LIKE '%search_path%' THEN 'search_path set'
    ELSE 'NO search_path set'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_updated_at_column',
    'has_active_subscription',
    'get_user_subscription_tier',
    'update_mini_updated_at',
    'calculate_word_pattern',
    'update_mini_puzzles_updated_at',
    'update_mini_user_stats_updated_at',
    'update_reel_connections_updated_at',
    'validate_word_pattern',
    'format_answer_with_pattern',
    'update_import_updated_at',
    'normalize_import_combination_key',
    'auto_calculate_and_validate_word_pattern',
    'update_feedback_updated_at',
    'get_random_horoscope',
    'update_tandem_puzzles_updated_at',
    'insert_bot_leaderboard_score',
    'normalize_combination_key',
    'update_element_combinations_updated_at',
    'update_soup_aggregate_stats',
    'insert_bot_streak_entry',
    'upsert_bot_streak_entry',
    'get_daily_horoscope',
    'get_user_profile_with_avatar',
    'update_reel_user_stats_updated_at',
    'update_creative_saves_updated_at',
    'update_user_stats_updated_at',
    'get_daily_leaderboard',
    'submit_leaderboard_score',
    'get_user_daily_rank',
    'get_streak_leaderboard'
  )
ORDER BY p.proname;

-- Verify game_type constraint:
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'leaderboard_entries_game_type_check';
*/

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '31 functions updated with SET search_path = ''''';
  RAISE NOTICE 'All functions now use fully-qualified table names';
  RAISE NOTICE 'game_type constraint updated to exclude cryptic';
  RAISE NOTICE '=============================================================';
END $$;
