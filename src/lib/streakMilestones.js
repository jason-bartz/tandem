export const STREAK_MILESTONES = [
  { days: 1000, emoji: '👑🏆🔥' },
  { days: 900, emoji: '🌙💫' },
  { days: 800, emoji: '🔮🐉' },
  { days: 700, emoji: '💫🦅' },
  { days: 600, emoji: '🌟🔱' },
  { days: 500, emoji: '🔥💎' },
  { days: 400, emoji: '⚡👑' },
  { days: 365, emoji: '🎊🏆' },
  { days: 300, emoji: '🌙⭐' },
  { days: 250, emoji: '🐉' },
  { days: 200, emoji: '🔮' },
  { days: 175, emoji: '🌊' },
  { days: 150, emoji: '⚔️' },
  { days: 125, emoji: '🦅' },
  { days: 100, emoji: '💯🔥' },
  { days: 90, emoji: '🎖️' },
  { days: 75, emoji: '💫' },
  { days: 60, emoji: '🔱' },
  { days: 50, emoji: '🌟' },
  { days: 40, emoji: '⚡' },
  { days: 30, emoji: '🏆' },
  { days: 25, emoji: '👑' },
  { days: 20, emoji: '💎' },
  { days: 15, emoji: '🚀' },
  { days: 10, emoji: '🎯' },
  { days: 7, emoji: '💪' },
  { days: 5, emoji: '⭐' },
  { days: 3, emoji: '🔥' },
];

export function getStreakMilestone(streak) {
  if (!streak || streak < 3) return '';

  const milestone = STREAK_MILESTONES.find((m) => streak >= m.days);
  return milestone ? milestone.emoji : '';
}
