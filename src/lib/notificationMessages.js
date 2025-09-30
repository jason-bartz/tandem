// Notification message libraries - calm, cozy, and not pushy

export const DAILY_REMINDER = {
  standard: [
    {
      title: "Today's Tandem is Ready",
      body: 'Four emoji pairs await you',
    },
    {
      title: 'New Puzzle Available',
      body: "Take a moment to solve today's Tandem",
    },
    {
      title: 'Your Daily Tandem',
      body: 'A fresh puzzle just for you',
    },
    {
      title: 'Tandem Time',
      body: "Today's emoji challenge is here",
    },
    {
      title: 'Ready When You Are',
      body: "Today's puzzle is waiting",
    },
    {
      title: 'Hello There',
      body: 'Your daily dose of emoji fun is ready',
    },
    {
      title: 'Good Morning',
      body: "Start your day with today's Tandem",
    },
    {
      title: 'Daily Puzzle Drop',
      body: 'Four new emoji pairs to discover',
    },
  ],
  withStreak: [
    {
      title: 'Keep the Momentum',
      body: 'Day {streak} awaits',
    },
    {
      title: 'Your {streak}-Day Journey',
      body: "Today's puzzle is ready",
    },
    {
      title: 'Day {streak}',
      body: 'Continue your Tandem streak',
    },
    {
      title: 'Nice Streak',
      body: '{streak} days and counting',
    },
    {
      title: 'Building Something Special',
      body: 'Day {streak} of your journey',
    },
    {
      title: 'Consistency Looks Good',
      body: '{streak} days strong',
    },
  ],
  weekend: [
    {
      title: 'Weekend Vibes',
      body: "Relax with today's Tandem",
    },
    {
      title: 'Saturday Puzzle Time',
      body: "Take it easy with today's challenge",
    },
    {
      title: 'Sunday Funday',
      body: 'Your weekend Tandem awaits',
    },
    {
      title: 'Lazy Day Puzzle',
      body: 'Perfect for a relaxed moment',
    },
    {
      title: 'Weekend Mode',
      body: "Today's Tandem is here",
    },
  ],
};

export const STREAK_SAVER = {
  gentle: [
    {
      title: 'Hey There',
      body: 'Your {streak}-day streak needs some love',
    },
    {
      title: 'Quick Reminder',
      body: "Today's puzzle keeps your {streak}-day streak alive",
    },
    {
      title: 'Before You Forget',
      body: 'Maintain your {streak}-day journey',
    },
    {
      title: 'Just a Heads Up',
      body: 'Your {streak}-day streak is on the line',
    },
    {
      title: 'Evening Check-In',
      body: "Don't let {streak} days slip away",
    },
    {
      title: 'Gentle Nudge',
      body: 'Your {streak}-day streak awaits',
    },
    {
      title: 'Still Time',
      body: 'Keep your {streak}-day streak going',
    },
    {
      title: 'No Pressure',
      body: 'But your {streak}-day streak would miss you',
    },
  ],
  urgent: [
    {
      title: 'Last Chance',
      body: 'Save your {streak}-day streak before midnight',
    },
    {
      title: "Clock's Ticking",
      body: '{hours} hours left for day {streak}',
    },
    {
      title: 'Almost Midnight',
      body: 'Your {streak}-day streak needs you',
    },
    {
      title: 'Final Call',
      body: 'Day {streak} is slipping away',
    },
  ],
};

export const MILESTONES = {
  week: [
    {
      title: 'One Week Wonder',
      body: '7 days of Tandem completed',
    },
    {
      title: 'Week Complete',
      body: "You've been consistent for 7 days",
    },
    {
      title: '7-Day Achievement',
      body: 'A full week of puzzles done',
    },
  ],
  twoWeeks: [
    {
      title: 'Two Weeks Strong',
      body: '14 days and going',
    },
    {
      title: 'Fortnight Complete',
      body: 'Two weeks of daily Tandem',
    },
    {
      title: '14 Days',
      body: "You're building a great habit",
    },
  ],
  month: [
    {
      title: 'One Month Milestone',
      body: '30 days of dedication',
    },
    {
      title: 'Monthly Master',
      body: 'A full month of Tandem',
    },
    {
      title: '30 Day Journey',
      body: "You've come so far",
    },
  ],
  fiftyDays: [
    {
      title: 'Half Century',
      body: '50 days is impressive',
    },
    {
      title: '50 Day Club',
      body: 'Welcome to exclusive territory',
    },
    {
      title: 'Incredible Consistency',
      body: '50 days of Tandem',
    },
  ],
  hundredDays: [
    {
      title: 'Century Mark',
      body: '100 days is legendary',
    },
    {
      title: 'Triple Digits',
      body: "You're a Tandem legend",
    },
    {
      title: '100 Day Champion',
      body: 'An incredible achievement',
    },
  ],
};

export const WEEKLY_SUMMARY = [
  {
    title: 'Your Week in Tandem',
    body: 'Played {played}/7 days • Best time: {time}',
  },
  {
    title: 'Weekly Recap',
    body: 'You solved {played} puzzles this week',
  },
  {
    title: 'Sunday Summary',
    body: '{played} puzzles completed • Avg time: {avgTime}',
  },
  {
    title: 'Week Complete',
    body: 'Nice work on {played} puzzles',
  },
  {
    title: 'Weekly Check-In',
    body: 'You played {played} times this week',
  },
];

export const COMEBACK = [
  {
    title: 'Welcome Back',
    body: "We missed you! Today's puzzle awaits",
  },
  {
    title: 'Hey Again',
    body: 'Ready for a fresh start?',
  },
  {
    title: 'New Day, New Puzzle',
    body: "Jump back in whenever you're ready",
  },
  {
    title: 'No Worries',
    body: "Today's a perfect day to play",
  },
  {
    title: 'Fresh Start',
    body: 'Every puzzle is a new beginning',
  },
];

// Helper function to get random message from category
export function getRandomMessage(category, subcategory = null) {
  const messages = subcategory ? category[subcategory] : category;
  if (!messages || messages.length === 0) return null;
  return messages[Math.floor(Math.random() * messages.length)];
}

// Helper function to replace placeholders in message
export function formatMessage(message, data = {}) {
  if (!message) return message;

  const formattedMessage = { ...message };

  // Replace placeholders in title and body
  Object.keys(data).forEach((key) => {
    const placeholder = `{${key}}`;
    if (formattedMessage.title) {
      formattedMessage.title = formattedMessage.title.replace(placeholder, data[key]);
    }
    if (formattedMessage.body) {
      formattedMessage.body = formattedMessage.body.replace(placeholder, data[key]);
    }
  });

  return formattedMessage;
}

// Get appropriate daily reminder based on context
export function getDailyReminder(context = {}) {
  const { streak, isWeekend } = context;

  let message;
  if (isWeekend) {
    message = getRandomMessage(DAILY_REMINDER.weekend);
  } else if (streak && streak > 0) {
    message = getRandomMessage(DAILY_REMINDER.withStreak);
    message = formatMessage(message, { streak });
  } else {
    message = getRandomMessage(DAILY_REMINDER.standard);
  }

  return message;
}

// Get streak saver message based on urgency
export function getStreakSaverMessage(streak, hoursLeft) {
  const isUrgent = hoursLeft <= 3;
  const category = isUrgent ? STREAK_SAVER.urgent : STREAK_SAVER.gentle;

  let message = getRandomMessage(category);
  message = formatMessage(message, {
    streak,
    hours: Math.floor(hoursLeft),
  });

  return message;
}

// Get milestone message
export function getMilestoneMessage(days) {
  let category;

  switch (days) {
    case 7:
      category = MILESTONES.week;
      break;
    case 14:
      category = MILESTONES.twoWeeks;
      break;
    case 30:
      category = MILESTONES.month;
      break;
    case 50:
      category = MILESTONES.fiftyDays;
      break;
    case 100:
      category = MILESTONES.hundredDays;
      break;
    default:
      return null;
  }

  return getRandomMessage(category);
}
