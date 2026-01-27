// Notification message library - daily puzzle reminders

export const DAILY_REMINDER = [
  {
    title: 'Your Puzzles Are Ready',
    body: 'Four new games to play today',
  },
  {
    title: "Today's Puzzles Are Here",
    body: 'Ready when you are',
  },
  {
    title: 'New Puzzles Available',
    body: 'Your daily games are waiting',
  },
  {
    title: 'Puzzle Time',
    body: "Today's challenges are ready",
  },
  {
    title: 'Daily Puzzles Unlocked',
    body: 'Four fresh games to solve',
  },
  {
    title: 'Good Morning',
    body: 'Your puzzles are waiting',
  },
  {
    title: 'Time to Play',
    body: "Today's puzzles are live",
  },
  {
    title: 'New Day, New Puzzles',
    body: 'Jump in whenever you like',
  },
  {
    title: 'Puzzles Ready',
    body: 'Your daily games just dropped',
  },
  {
    title: 'Fresh Puzzles',
    body: 'Four new challenges today',
  },
  {
    title: 'Daily Games Ready',
    body: 'Come play when you can',
  },
  {
    title: "It's Puzzle Day",
    body: 'Your games are waiting for you',
  },
];

// Get a random daily reminder message
export function getDailyReminder() {
  const index = Math.floor(Math.random() * DAILY_REMINDER.length);
  return DAILY_REMINDER[index];
}
