/**
 * Achievement Definitions
 * Achievements for all Tandem Daily games: Tandem, Mini, Reel Connections, and Daily Alchemy
 */

/**
 * Streak-Based Achievements (23 total)
 * Tracks player's best streak (consecutive days solving puzzles)
 */
export const STREAK_ACHIEVEMENTS = [
  {
    id: 'com.tandemdaily.app.first_pedal',
    name: 'First Pedal',
    description: 'Maintain a 3-day streak',
    emoji: '🔥',
    threshold: 3,
  },
  {
    id: 'com.tandemdaily.app.finding_rhythm',
    name: 'Finding Rhythm',
    description: 'Maintain a 5-day streak',
    emoji: '⭐',
    threshold: 5,
  },
  {
    id: 'com.tandemdaily.app.picking_up_speed',
    name: 'Picking Up Speed',
    description: 'Maintain a 7-day streak',
    emoji: '💪',
    threshold: 7,
  },
  {
    id: 'com.tandemdaily.app.steady_cadence',
    name: 'Steady Cadence',
    description: 'Maintain a 10-day streak',
    emoji: '🎯',
    threshold: 10,
  },
  {
    id: 'com.tandemdaily.app.cruising_along',
    name: 'Cruising Along',
    description: 'Maintain a 15-day streak',
    emoji: '🚴',
    threshold: 15,
  },
  {
    id: 'com.tandemdaily.app.rolling_hills',
    name: 'Rolling Hills',
    description: 'Maintain a 20-day streak',
    emoji: '⛰️',
    threshold: 20,
  },
  {
    id: 'com.tandemdaily.app.coast_to_coast',
    name: 'Coast to Coast',
    description: 'Maintain a 25-day streak',
    emoji: '🌊',
    threshold: 25,
  },
  {
    id: 'com.tandemdaily.app.monthly_rider',
    name: 'Monthly Rider',
    description: 'Maintain a 30-day streak',
    emoji: '🏆',
    threshold: 30,
  },
  {
    id: 'com.tandemdaily.app.swift_cyclist',
    name: 'Swift Cyclist',
    description: 'Maintain a 40-day streak',
    emoji: '⚡',
    threshold: 40,
  },
  {
    id: 'com.tandemdaily.app.starlight_ride',
    name: 'Starlight Ride',
    description: 'Maintain a 50-day streak',
    emoji: '🌟',
    threshold: 50,
  },
  {
    id: 'com.tandemdaily.app.seaside_route',
    name: 'Seaside Route',
    description: 'Maintain a 60-day streak',
    emoji: '🏖️',
    threshold: 60,
  },
  {
    id: 'com.tandemdaily.app.summit_seeker',
    name: 'Summit Seeker',
    description: 'Maintain a 75-day streak',
    emoji: '🗻',
    threshold: 75,
  },
  {
    id: 'com.tandemdaily.app.cross_country',
    name: 'Cross Country',
    description: 'Maintain a 90-day streak',
    emoji: '🎖️',
    threshold: 90,
  },
  {
    id: 'com.tandemdaily.app.century_ride',
    name: 'Century Ride',
    description: 'Maintain a 100-day streak',
    emoji: '💯',
    threshold: 100,
  },
  {
    id: 'com.tandemdaily.app.mountain_pass',
    name: 'Mountain Pass',
    description: 'Maintain a 125-day streak',
    emoji: '🦅',
    threshold: 125,
  },
  {
    id: 'com.tandemdaily.app.pathfinder',
    name: 'Pathfinder',
    description: 'Maintain a 150-day streak',
    emoji: '🧭',
    threshold: 150,
  },
  {
    id: 'com.tandemdaily.app.coastal_cruiser',
    name: 'Coastal Cruiser',
    description: 'Maintain a 175-day streak',
    emoji: '🌊',
    threshold: 175,
  },
  {
    id: 'com.tandemdaily.app.horizon_chaser',
    name: 'Horizon Chaser',
    description: 'Maintain a 200-day streak',
    emoji: '🌅',
    threshold: 200,
  },
  {
    id: 'com.tandemdaily.app.grand_tour',
    name: 'Grand Tour',
    description: 'Maintain a 250-day streak',
    emoji: '🌍',
    threshold: 250,
  },
  {
    id: 'com.tandemdaily.app.world_traveler',
    name: 'World Traveler',
    description: 'Maintain a 300-day streak',
    emoji: '🌎',
    threshold: 300,
  },
  {
    id: 'com.tandemdaily.app.round_the_sun',
    name: 'Round the Sun',
    description: 'Maintain a 365-day streak',
    emoji: '☀️',
    threshold: 365,
  },
  {
    id: 'com.tandemdaily.app.infinite_road',
    name: 'Infinite Road',
    description: 'Maintain a 500-day streak',
    emoji: '🛤️',
    threshold: 500,
  },
  {
    id: 'com.tandemdaily.app.legendary_journey',
    name: 'Legendary Journey',
    description: 'Maintain a 1000-day streak',
    emoji: '🌟🏆🔥',
    threshold: 1000,
  },
];

/**
 * Total Wins Achievements (8 total)
 * Tracks total number of puzzles solved
 */
export const WINS_ACHIEVEMENTS = [
  {
    id: 'com.tandemdaily.app.first_win',
    name: 'First Win',
    description: 'Solve your first puzzle',
    emoji: '🥇',
    threshold: 1,
  },
  {
    id: 'com.tandemdaily.app.getting_hang',
    name: 'Getting the Hang of It',
    description: 'Solve 10 puzzles',
    emoji: '👍',
    threshold: 10,
  },
  {
    id: 'com.tandemdaily.app.puzzle_pal',
    name: 'Puzzle Pal',
    description: 'Solve 25 puzzles',
    emoji: '👯',
    threshold: 25,
  },
  {
    id: 'com.tandemdaily.app.clever_cookie',
    name: 'Clever Cookie',
    description: 'Solve 50 puzzles',
    emoji: '🍪',
    threshold: 50,
  },
  {
    id: 'com.tandemdaily.app.brainy_buddy',
    name: 'Brainy Buddy',
    description: 'Solve 100 puzzles',
    emoji: '🧠',
    threshold: 100,
  },
  {
    id: 'com.tandemdaily.app.puzzle_whiz',
    name: 'Puzzle Whiz',
    description: 'Solve 250 puzzles',
    emoji: '⚡',
    threshold: 250,
  },
  {
    id: 'com.tandemdaily.app.word_wizard',
    name: 'Word Wizard',
    description: 'Solve 500 puzzles',
    emoji: '🪄',
    threshold: 500,
  },
  {
    id: 'com.tandemdaily.app.puzzle_king',
    name: 'Puzzle King',
    description: 'Solve 1000 puzzles',
    emoji: '👑',
    threshold: 1000,
  },
];

/**
 * Daily Mini Streak-Based Achievements (23 total)
 * Tracks player's best mini crossword streak
 */
export const MINI_STREAK_ACHIEVEMENTS = [
  {
    id: 'com.tandemdaily.app.mini_first_pedal',
    name: 'First Pedal',
    description: 'Maintain a 3-day mini streak',
    emoji: '🔥',
    threshold: 3,
  },
  {
    id: 'com.tandemdaily.app.mini_finding_rhythm',
    name: 'Finding Rhythm',
    description: 'Maintain a 5-day mini streak',
    emoji: '⭐',
    threshold: 5,
  },
  {
    id: 'com.tandemdaily.app.mini_picking_up_speed',
    name: 'Picking Up Speed',
    description: 'Maintain a 7-day mini streak',
    emoji: '💪',
    threshold: 7,
  },
  {
    id: 'com.tandemdaily.app.mini_steady_cadence',
    name: 'Steady Cadence',
    description: 'Maintain a 10-day mini streak',
    emoji: '🎯',
    threshold: 10,
  },
  {
    id: 'com.tandemdaily.app.mini_cruising_along',
    name: 'Cruising Along',
    description: 'Maintain a 15-day mini streak',
    emoji: '🚴',
    threshold: 15,
  },
  {
    id: 'com.tandemdaily.app.mini_rolling_hills',
    name: 'Rolling Hills',
    description: 'Maintain a 20-day mini streak',
    emoji: '⛰️',
    threshold: 20,
  },
  {
    id: 'com.tandemdaily.app.mini_coast_to_coast',
    name: 'Coast to Coast',
    description: 'Maintain a 25-day mini streak',
    emoji: '🌊',
    threshold: 25,
  },
  {
    id: 'com.tandemdaily.app.mini_monthly_rider',
    name: 'Monthly Rider',
    description: 'Maintain a 30-day mini streak',
    emoji: '🏆',
    threshold: 30,
  },
  {
    id: 'com.tandemdaily.app.mini_swift_cyclist',
    name: 'Swift Cyclist',
    description: 'Maintain a 40-day mini streak',
    emoji: '⚡',
    threshold: 40,
  },
  {
    id: 'com.tandemdaily.app.mini_starlight_ride',
    name: 'Starlight Ride',
    description: 'Maintain a 50-day mini streak',
    emoji: '🌟',
    threshold: 50,
  },
  {
    id: 'com.tandemdaily.app.mini_seaside_route',
    name: 'Seaside Route',
    description: 'Maintain a 60-day mini streak',
    emoji: '🏖️',
    threshold: 60,
  },
  {
    id: 'com.tandemdaily.app.mini_summit_seeker',
    name: 'Summit Seeker',
    description: 'Maintain a 75-day mini streak',
    emoji: '🗻',
    threshold: 75,
  },
  {
    id: 'com.tandemdaily.app.mini_cross_country',
    name: 'Cross Country',
    description: 'Maintain a 90-day mini streak',
    emoji: '🎖️',
    threshold: 90,
  },
  {
    id: 'com.tandemdaily.app.mini_century_ride',
    name: 'Century Ride',
    description: 'Maintain a 100-day mini streak',
    emoji: '💯',
    threshold: 100,
  },
  {
    id: 'com.tandemdaily.app.mini_mountain_pass',
    name: 'Mountain Pass',
    description: 'Maintain a 125-day mini streak',
    emoji: '🦅',
    threshold: 125,
  },
  {
    id: 'com.tandemdaily.app.mini_pathfinder',
    name: 'Pathfinder',
    description: 'Maintain a 150-day mini streak',
    emoji: '🧭',
    threshold: 150,
  },
  {
    id: 'com.tandemdaily.app.mini_coastal_cruiser',
    name: 'Coastal Cruiser',
    description: 'Maintain a 175-day mini streak',
    emoji: '🌊',
    threshold: 175,
  },
  {
    id: 'com.tandemdaily.app.mini_horizon_chaser',
    name: 'Horizon Chaser',
    description: 'Maintain a 200-day mini streak',
    emoji: '🌅',
    threshold: 200,
  },
  {
    id: 'com.tandemdaily.app.mini_grand_tour',
    name: 'Grand Tour',
    description: 'Maintain a 250-day mini streak',
    emoji: '🌍',
    threshold: 250,
  },
  {
    id: 'com.tandemdaily.app.mini_world_traveler',
    name: 'World Traveler',
    description: 'Maintain a 300-day mini streak',
    emoji: '🌎',
    threshold: 300,
  },
  {
    id: 'com.tandemdaily.app.mini_round_the_sun',
    name: 'Round the Sun',
    description: 'Maintain a 365-day mini streak',
    emoji: '☀️',
    threshold: 365,
  },
  {
    id: 'com.tandemdaily.app.mini_infinite_road',
    name: 'Infinite Road',
    description: 'Maintain a 500-day mini streak',
    emoji: '🛤️',
    threshold: 500,
  },
  {
    id: 'com.tandemdaily.app.mini_legendary_journey',
    name: 'Legendary Journey',
    description: 'Maintain a 1000-day mini streak',
    emoji: '🌟🏆🔥',
    threshold: 1000,
  },
];

/**
 * Daily Mini Total Wins Achievements (8 total)
 * Tracks total number of mini crossword puzzles solved
 */
export const MINI_WINS_ACHIEVEMENTS = [
  {
    id: 'com.tandemdaily.app.mini_first_win',
    name: 'First Win',
    description: 'Solve your first mini puzzle',
    emoji: '🥇',
    threshold: 1,
  },
  {
    id: 'com.tandemdaily.app.mini_getting_hang',
    name: 'Getting the Hang of It',
    description: 'Solve 10 mini puzzles',
    emoji: '👍',
    threshold: 10,
  },
  {
    id: 'com.tandemdaily.app.mini_puzzle_pal',
    name: 'Puzzle Pal',
    description: 'Solve 25 mini puzzles',
    emoji: '👯',
    threshold: 25,
  },
  {
    id: 'com.tandemdaily.app.mini_clever_cookie',
    name: 'Clever Cookie',
    description: 'Solve 50 mini puzzles',
    emoji: '🍪',
    threshold: 50,
  },
  {
    id: 'com.tandemdaily.app.mini_brainy_buddy',
    name: 'Brainy Buddy',
    description: 'Solve 100 mini puzzles',
    emoji: '🧠',
    threshold: 100,
  },
  {
    id: 'com.tandemdaily.app.mini_puzzle_whiz',
    name: 'Puzzle Whiz',
    description: 'Solve 250 mini puzzles',
    emoji: '⚡',
    threshold: 250,
  },
  {
    id: 'com.tandemdaily.app.mini_word_wizard',
    name: 'Word Wizard',
    description: 'Solve 500 mini puzzles',
    emoji: '🪄',
    threshold: 500,
  },
  {
    id: 'com.tandemdaily.app.mini_puzzle_king',
    name: 'Puzzle King',
    description: 'Solve 1000 mini puzzles',
    emoji: '👑',
    threshold: 1000,
  },
];

/**
 * Reel Connections Streak-Based Achievements (23 total)
 * Movie-themed achievement names for the connections game
 */
export const REEL_STREAK_ACHIEVEMENTS = [
  {
    id: 'com.tandemdaily.app.reel_opening_credits',
    name: 'Opening Credits',
    description: 'Maintain a 3-day Reel streak',
    emoji: '🎬',
    threshold: 3,
  },
  {
    id: 'com.tandemdaily.app.reel_scene_setter',
    name: 'Scene Setter',
    description: 'Maintain a 5-day Reel streak',
    emoji: '🎥',
    threshold: 5,
  },
  {
    id: 'com.tandemdaily.app.reel_rising_action',
    name: 'Rising Action',
    description: 'Maintain a 7-day Reel streak',
    emoji: '📈',
    threshold: 7,
  },
  {
    id: 'com.tandemdaily.app.reel_plot_twist',
    name: 'Plot Twist',
    description: 'Maintain a 10-day Reel streak',
    emoji: '🔄',
    threshold: 10,
  },
  {
    id: 'com.tandemdaily.app.reel_montage_master',
    name: 'Montage Master',
    description: 'Maintain a 15-day Reel streak',
    emoji: '🎞️',
    threshold: 15,
  },
  {
    id: 'com.tandemdaily.app.reel_screen_star',
    name: 'Screen Star',
    description: 'Maintain a 20-day Reel streak',
    emoji: '⭐',
    threshold: 20,
  },
  {
    id: 'com.tandemdaily.app.reel_box_office_hit',
    name: 'Box Office Hit',
    description: 'Maintain a 25-day Reel streak',
    emoji: '🎟️',
    threshold: 25,
  },
  {
    id: 'com.tandemdaily.app.reel_feature_film',
    name: 'Feature Film',
    description: 'Maintain a 30-day Reel streak',
    emoji: '🎦',
    threshold: 30,
  },
  {
    id: 'com.tandemdaily.app.reel_blockbuster',
    name: 'Blockbuster',
    description: 'Maintain a 40-day Reel streak',
    emoji: '💥',
    threshold: 40,
  },
  {
    id: 'com.tandemdaily.app.reel_cult_classic',
    name: 'Cult Classic',
    description: 'Maintain a 50-day Reel streak',
    emoji: '🎭',
    threshold: 50,
  },
  {
    id: 'com.tandemdaily.app.reel_silver_screen',
    name: 'Silver Screen',
    description: 'Maintain a 60-day Reel streak',
    emoji: '🖥️',
    threshold: 60,
  },
  {
    id: 'com.tandemdaily.app.reel_studio_legend',
    name: 'Studio Legend',
    description: 'Maintain a 75-day Reel streak',
    emoji: '🏛️',
    threshold: 75,
  },
  {
    id: 'com.tandemdaily.app.reel_award_winner',
    name: 'Award Winner',
    description: 'Maintain a 90-day Reel streak',
    emoji: '🏆',
    threshold: 90,
  },
  {
    id: 'com.tandemdaily.app.reel_century_cinema',
    name: 'Century of Cinema',
    description: 'Maintain a 100-day Reel streak',
    emoji: '💯',
    threshold: 100,
  },
  {
    id: 'com.tandemdaily.app.reel_directors_cut',
    name: "Director's Cut",
    description: 'Maintain a 125-day Reel streak',
    emoji: '🎬',
    threshold: 125,
  },
  {
    id: 'com.tandemdaily.app.reel_film_festival',
    name: 'Film Festival',
    description: 'Maintain a 150-day Reel streak',
    emoji: '🎪',
    threshold: 150,
  },
  {
    id: 'com.tandemdaily.app.reel_golden_age',
    name: 'Golden Age',
    description: 'Maintain a 175-day Reel streak',
    emoji: '✨',
    threshold: 175,
  },
  {
    id: 'com.tandemdaily.app.reel_cinema_royalty',
    name: 'Cinema Royalty',
    description: 'Maintain a 200-day Reel streak',
    emoji: '👑',
    threshold: 200,
  },
  {
    id: 'com.tandemdaily.app.reel_world_premiere',
    name: 'World Premiere',
    description: 'Maintain a 250-day Reel streak',
    emoji: '🌍',
    threshold: 250,
  },
  {
    id: 'com.tandemdaily.app.reel_hall_of_fame',
    name: 'Hall of Fame',
    description: 'Maintain a 300-day Reel streak',
    emoji: '🎖️',
    threshold: 300,
  },
  {
    id: 'com.tandemdaily.app.reel_timeless_classic',
    name: 'Timeless Classic',
    description: 'Maintain a 365-day Reel streak',
    emoji: '⏳',
    threshold: 365,
  },
  {
    id: 'com.tandemdaily.app.reel_eternal_screening',
    name: 'Eternal Screening',
    description: 'Maintain a 500-day Reel streak',
    emoji: '♾️',
    threshold: 500,
  },
  {
    id: 'com.tandemdaily.app.reel_legendary_producer',
    name: 'Legendary Producer',
    description: 'Maintain a 1000-day Reel streak',
    emoji: '🌟🎬🏆',
    threshold: 1000,
  },
];

/**
 * Reel Connections Total Wins Achievements (8 total)
 * Movie-themed achievement names for total games won
 */
export const REEL_WINS_ACHIEVEMENTS = [
  {
    id: 'com.tandemdaily.app.reel_first_take',
    name: 'First Take',
    description: 'Win your first Reel game',
    emoji: '🎬',
    threshold: 1,
  },
  {
    id: 'com.tandemdaily.app.reel_supporting_role',
    name: 'Supporting Role',
    description: 'Win 10 Reel games',
    emoji: '🎭',
    threshold: 10,
  },
  {
    id: 'com.tandemdaily.app.reel_leading_role',
    name: 'Leading Role',
    description: 'Win 25 Reel games',
    emoji: '🌟',
    threshold: 25,
  },
  {
    id: 'com.tandemdaily.app.reel_movie_buff',
    name: 'Movie Buff',
    description: 'Win 50 Reel games',
    emoji: '🎥',
    threshold: 50,
  },
  {
    id: 'com.tandemdaily.app.reel_cinephile',
    name: 'Cinephile',
    description: 'Win 100 Reel games',
    emoji: '📽️',
    threshold: 100,
  },
  {
    id: 'com.tandemdaily.app.reel_film_critic',
    name: 'Film Critic',
    description: 'Win 250 Reel games',
    emoji: '🎞️',
    threshold: 250,
  },
  {
    id: 'com.tandemdaily.app.reel_auteur',
    name: 'Auteur',
    description: 'Win 500 Reel games',
    emoji: '🎬',
    threshold: 500,
  },
  {
    id: 'com.tandemdaily.app.reel_oscar_winner',
    name: 'Oscar Winner',
    description: 'Win 1000 Reel games',
    emoji: '🏆',
    threshold: 1000,
  },
];

/**
 * Daily Alchemy Streak-Based Achievements (23 total)
 * Alchemy/chemistry-themed achievement names for the element combination game
 */
export const ALCHEMY_STREAK_ACHIEVEMENTS = [
  {
    id: 'com.tandemdaily.app.alchemy_first_spark',
    name: 'First Spark',
    description: 'Maintain a 3-day Alchemy streak',
    emoji: '✨',
    threshold: 3,
  },
  {
    id: 'com.tandemdaily.app.alchemy_kindling',
    name: 'Kindling',
    description: 'Maintain a 5-day Alchemy streak',
    emoji: '🔥',
    threshold: 5,
  },
  {
    id: 'com.tandemdaily.app.alchemy_catalyst',
    name: 'Catalyst',
    description: 'Maintain a 7-day Alchemy streak',
    emoji: '⚗️',
    threshold: 7,
  },
  {
    id: 'com.tandemdaily.app.alchemy_reagent',
    name: 'Reagent',
    description: 'Maintain a 10-day Alchemy streak',
    emoji: '🧪',
    threshold: 10,
  },
  {
    id: 'com.tandemdaily.app.alchemy_compound',
    name: 'Compound',
    description: 'Maintain a 15-day Alchemy streak',
    emoji: '🔬',
    threshold: 15,
  },
  {
    id: 'com.tandemdaily.app.alchemy_distillation',
    name: 'Distillation',
    description: 'Maintain a 20-day Alchemy streak',
    emoji: '💧',
    threshold: 20,
  },
  {
    id: 'com.tandemdaily.app.alchemy_synthesis',
    name: 'Synthesis',
    description: 'Maintain a 25-day Alchemy streak',
    emoji: '🌀',
    threshold: 25,
  },
  {
    id: 'com.tandemdaily.app.alchemy_transmutation',
    name: 'Transmutation',
    description: 'Maintain a 30-day Alchemy streak',
    emoji: '⭐',
    threshold: 30,
  },
  {
    id: 'com.tandemdaily.app.alchemy_crucible',
    name: 'Crucible',
    description: 'Maintain a 40-day Alchemy streak',
    emoji: '🏺',
    threshold: 40,
  },
  {
    id: 'com.tandemdaily.app.alchemy_elixir',
    name: 'Elixir',
    description: 'Maintain a 50-day Alchemy streak',
    emoji: '🍵',
    threshold: 50,
  },
  {
    id: 'com.tandemdaily.app.alchemy_quintessence',
    name: 'Quintessence',
    description: 'Maintain a 60-day Alchemy streak',
    emoji: '💫',
    threshold: 60,
  },
  {
    id: 'com.tandemdaily.app.alchemy_prima_materia',
    name: 'Prima Materia',
    description: 'Maintain a 75-day Alchemy streak',
    emoji: '🌑',
    threshold: 75,
  },
  {
    id: 'com.tandemdaily.app.alchemy_arcanum',
    name: 'Arcanum',
    description: 'Maintain a 90-day Alchemy streak',
    emoji: '📜',
    threshold: 90,
  },
  {
    id: 'com.tandemdaily.app.alchemy_magnum_opus',
    name: 'Magnum Opus',
    description: 'Maintain a 100-day Alchemy streak',
    emoji: '💯',
    threshold: 100,
  },
  {
    id: 'com.tandemdaily.app.alchemy_chrysopoeia',
    name: 'Chrysopoeia',
    description: 'Maintain a 125-day Alchemy streak',
    emoji: '🥇',
    threshold: 125,
  },
  {
    id: 'com.tandemdaily.app.alchemy_aurum',
    name: 'Aurum',
    description: 'Maintain a 150-day Alchemy streak',
    emoji: '✨',
    threshold: 150,
  },
  {
    id: 'com.tandemdaily.app.alchemy_astral_fire',
    name: 'Astral Fire',
    description: 'Maintain a 175-day Alchemy streak',
    emoji: '🌟',
    threshold: 175,
  },
  {
    id: 'com.tandemdaily.app.alchemy_azoth',
    name: 'Azoth',
    description: 'Maintain a 200-day Alchemy streak',
    emoji: '🌙',
    threshold: 200,
  },
  {
    id: 'com.tandemdaily.app.alchemy_alkahest',
    name: 'Alkahest',
    description: 'Maintain a 250-day Alchemy streak',
    emoji: '🌊',
    threshold: 250,
  },
  {
    id: 'com.tandemdaily.app.alchemy_panacea',
    name: 'Panacea',
    description: 'Maintain a 300-day Alchemy streak',
    emoji: '💎',
    threshold: 300,
  },
  {
    id: 'com.tandemdaily.app.alchemy_eternal_flame',
    name: 'Eternal Flame',
    description: 'Maintain a 365-day Alchemy streak',
    emoji: '🔥',
    threshold: 365,
  },
  {
    id: 'com.tandemdaily.app.alchemy_celestial_stone',
    name: 'Celestial Stone',
    description: 'Maintain a 500-day Alchemy streak',
    emoji: '☄️',
    threshold: 500,
  },
  {
    id: 'com.tandemdaily.app.alchemy_philosophers_stone',
    name: "Philosopher's Stone",
    description: 'Maintain a 1000-day Alchemy streak',
    emoji: '🔮💎✨',
    threshold: 1000,
  },
];

/**
 * Daily Alchemy Total Completions Achievements (8 total)
 * Alchemy-themed achievement names for total puzzles completed
 */
export const ALCHEMY_WINS_ACHIEVEMENTS = [
  {
    id: 'com.tandemdaily.app.alchemy_first_reaction',
    name: 'First Reaction',
    description: 'Complete your first Alchemy puzzle',
    emoji: '⚗️',
    threshold: 1,
  },
  {
    id: 'com.tandemdaily.app.alchemy_apprentice',
    name: 'Apprentice',
    description: 'Complete 10 Alchemy puzzles',
    emoji: '📖',
    threshold: 10,
  },
  {
    id: 'com.tandemdaily.app.alchemy_journeyman',
    name: 'Journeyman',
    description: 'Complete 25 Alchemy puzzles',
    emoji: '🧪',
    threshold: 25,
  },
  {
    id: 'com.tandemdaily.app.alchemy_artisan',
    name: 'Artisan',
    description: 'Complete 50 Alchemy puzzles',
    emoji: '🔬',
    threshold: 50,
  },
  {
    id: 'com.tandemdaily.app.alchemy_adept',
    name: 'Adept',
    description: 'Complete 100 Alchemy puzzles',
    emoji: '⭐',
    threshold: 100,
  },
  {
    id: 'com.tandemdaily.app.alchemy_master',
    name: 'Master Alchemist',
    description: 'Complete 250 Alchemy puzzles',
    emoji: '🏆',
    threshold: 250,
  },
  {
    id: 'com.tandemdaily.app.alchemy_grand_master',
    name: 'Grand Master',
    description: 'Complete 500 Alchemy puzzles',
    emoji: '👑',
    threshold: 500,
  },
  {
    id: 'com.tandemdaily.app.alchemy_legendary',
    name: 'Legendary Alchemist',
    description: 'Complete 1000 Alchemy puzzles',
    emoji: '🔮',
    threshold: 1000,
  },
];

/**
 * Daily Alchemy First Discovery Achievements (9 total)
 * Special achievements for being the first player globally to discover an element
 */
export const ALCHEMY_FIRST_DISCOVERY_ACHIEVEMENTS = [
  {
    id: 'com.tandemdaily.app.alchemy_pioneer',
    name: 'Pioneer',
    description: 'Make your first global discovery',
    emoji: '🌟',
    threshold: 1,
  },
  {
    id: 'com.tandemdaily.app.alchemy_trailblazer',
    name: 'Trailblazer',
    description: 'Make 3 global discoveries',
    emoji: '🔭',
    threshold: 3,
  },
  {
    id: 'com.tandemdaily.app.alchemy_innovator',
    name: 'Innovator',
    description: 'Make 5 global discoveries',
    emoji: '💡',
    threshold: 5,
  },
  {
    id: 'com.tandemdaily.app.alchemy_visionary',
    name: 'Visionary',
    description: 'Make 10 global discoveries',
    emoji: '🔮',
    threshold: 10,
  },
  {
    id: 'com.tandemdaily.app.alchemy_pathfinder',
    name: 'Pathfinder',
    description: 'Make 25 global discoveries',
    emoji: '🧭',
    threshold: 25,
  },
  {
    id: 'com.tandemdaily.app.alchemy_oracle',
    name: 'Oracle',
    description: 'Make 50 global discoveries',
    emoji: '👁️',
    threshold: 50,
  },
  {
    id: 'com.tandemdaily.app.alchemy_sage',
    name: 'Sage',
    description: 'Make 100 global discoveries',
    emoji: '📿',
    threshold: 100,
  },
  {
    id: 'com.tandemdaily.app.alchemy_progenitor',
    name: 'Progenitor',
    description: 'Make 250 global discoveries',
    emoji: '🌌',
    threshold: 250,
  },
  {
    id: 'com.tandemdaily.app.alchemy_primordial',
    name: 'Primordial',
    description: 'Make 500 global discoveries',
    emoji: '🪐',
    threshold: 500,
  },
];

/**
 * Leaderboard Definitions
 */
export const LEADERBOARDS = {
  LONGEST_STREAK: {
    id: 'com.tandemdaily.app.longest_streak',
    name: 'Longest Streak',
    description: 'Compete for the longest streak ever achieved',
  },
};

/**
 * Get all Tandem Daily achievements in a single array
 * @returns {Array} All 31 Tandem Daily achievements
 */
export function getAllAchievements() {
  return [...STREAK_ACHIEVEMENTS, ...WINS_ACHIEVEMENTS];
}

/**
 * Get all Daily Mini achievements in a single array
 * @returns {Array} All 31 Daily Mini achievements
 */
export function getAllMiniAchievements() {
  return [...MINI_STREAK_ACHIEVEMENTS, ...MINI_WINS_ACHIEVEMENTS];
}

/**
 * Get all Reel Connections achievements in a single array
 * @returns {Array} All 31 Reel Connections achievements
 */
export function getAllReelAchievements() {
  return [...REEL_STREAK_ACHIEVEMENTS, ...REEL_WINS_ACHIEVEMENTS];
}

/**
 * Get all Daily Alchemy achievements in a single array
 * @returns {Array} All 40 Daily Alchemy achievements (23 streak + 8 wins + 9 first discoveries)
 */
export function getAllAlchemyAchievements() {
  return [
    ...ALCHEMY_STREAK_ACHIEVEMENTS,
    ...ALCHEMY_WINS_ACHIEVEMENTS,
    ...ALCHEMY_FIRST_DISCOVERY_ACHIEVEMENTS,
  ];
}

/**
 * Get achievement by ID
 * @param {string} achievementId - The achievement ID
 * @returns {Object|null} Achievement object or null if not found
 */
export function getAchievementById(achievementId) {
  const all = [
    ...getAllAchievements(),
    ...getAllMiniAchievements(),
    ...getAllReelAchievements(),
    ...getAllAlchemyAchievements(),
  ];
  return all.find((a) => a.id === achievementId) || null;
}

/**
 * Get all Tandem Daily streak achievements sorted by threshold
 * @returns {Array} Streak achievements sorted ascending
 */
export function getStreakAchievements() {
  return [...STREAK_ACHIEVEMENTS].sort((a, b) => a.threshold - b.threshold);
}

/**
 * Get all Tandem Daily wins achievements sorted by threshold
 * @returns {Array} Wins achievements sorted ascending
 */
export function getWinsAchievements() {
  return [...WINS_ACHIEVEMENTS].sort((a, b) => a.threshold - b.threshold);
}

/**
 * Get all Daily Mini streak achievements sorted by threshold
 * @returns {Array} Mini streak achievements sorted ascending
 */
export function getMiniStreakAchievements() {
  return [...MINI_STREAK_ACHIEVEMENTS].sort((a, b) => a.threshold - b.threshold);
}

/**
 * Get all Daily Mini wins achievements sorted by threshold
 * @returns {Array} Mini wins achievements sorted ascending
 */
export function getMiniWinsAchievements() {
  return [...MINI_WINS_ACHIEVEMENTS].sort((a, b) => a.threshold - b.threshold);
}

/**
 * Get all Reel Connections streak achievements sorted by threshold
 * @returns {Array} Reel streak achievements sorted ascending
 */
export function getReelStreakAchievements() {
  return [...REEL_STREAK_ACHIEVEMENTS].sort((a, b) => a.threshold - b.threshold);
}

/**
 * Get all Reel Connections wins achievements sorted by threshold
 * @returns {Array} Reel wins achievements sorted ascending
 */
export function getReelWinsAchievements() {
  return [...REEL_WINS_ACHIEVEMENTS].sort((a, b) => a.threshold - b.threshold);
}

/**
 * Get all Daily Alchemy streak achievements sorted by threshold
 * @returns {Array} Alchemy streak achievements sorted ascending
 */
export function getAlchemyStreakAchievements() {
  return [...ALCHEMY_STREAK_ACHIEVEMENTS].sort((a, b) => a.threshold - b.threshold);
}

/**
 * Get all Daily Alchemy wins achievements sorted by threshold
 * @returns {Array} Alchemy wins achievements sorted ascending
 */
export function getAlchemyWinsAchievements() {
  return [...ALCHEMY_WINS_ACHIEVEMENTS].sort((a, b) => a.threshold - b.threshold);
}

/**
 * Get all Daily Alchemy first discovery achievements sorted by threshold
 * @returns {Array} Alchemy first discovery achievements sorted ascending
 */
export function getAlchemyFirstDiscoveryAchievements() {
  return [...ALCHEMY_FIRST_DISCOVERY_ACHIEVEMENTS].sort((a, b) => a.threshold - b.threshold);
}
