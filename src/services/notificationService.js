import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import {
  getDailyReminder,
  getStreakSaverMessage,
  getMilestoneMessage,
  getRandomMessage,
  formatMessage,
  WEEKLY_SUMMARY,
} from '@/lib/notificationMessages';
import { loadStats, hasPlayedToday, getWeeklyPuzzleStats } from '@/lib/storage';

const NOTIFICATION_IDS = {
  DAILY_REMINDER: 1,
  STREAK_SAVER: 2,
  WEEKLY_SUMMARY: 3,
  MILESTONE: 4,
  COMEBACK: 5,
};

// Helper function to get today's date string in user's local timezone
// Uses Wordle-style local timezone approach for consistent experience
function getTodayDateString() {
  const localDateService = require('@/services/localDateService');
  return localDateService.getCurrentDateString();
}

const PREFS_KEYS = {
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  DAILY_REMINDER_ENABLED: 'daily_reminder_enabled',
  DAILY_REMINDER_TIME: 'daily_reminder_time',
  STREAK_PROTECTION_ENABLED: 'streak_protection_enabled',
  STREAK_PROTECTION_TIME: 'streak_protection_time',
  QUIET_HOURS_ENABLED: 'quiet_hours_enabled',
  QUIET_HOURS_START: 'quiet_hours_start',
  QUIET_HOURS_END: 'quiet_hours_end',
  LAST_PLAY_TIME: 'last_play_time',
  NOTIFICATION_PERMISSION: 'notification_permission',
};

class NotificationService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.initialized = false;
    this.permissionStatus = null;
  }

  async initialize() {
    if (!this.isNative || this.initialized) return;

    try {
      // Check current permission status
      const { display } = await LocalNotifications.checkPermissions();
      this.permissionStatus = display;

      // Set up notification listeners
      this.setupListeners();

      // Load preferences and reschedule if needed
      const enabled = await this.getNotificationPreference(PREFS_KEYS.NOTIFICATIONS_ENABLED);
      if (enabled && display === 'granted') {
        await this.rescheduleAllNotifications();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  setupListeners() {
    // Handle notification received while app is open
    LocalNotifications.addListener('localNotificationReceived', () => {
      // Notification received while app is open
    });

    // Handle notification action (tap)
    LocalNotifications.addListener('localNotificationActionPerformed', () => {
      // Clear the badge when notification is tapped
      this.clearBadge();
    });
  }

  async requestPermission() {
    if (!this.isNative) return false;

    try {
      const { display } = await LocalNotifications.requestPermissions();
      this.permissionStatus = display;

      // Save permission status
      await Preferences.set({
        key: PREFS_KEYS.NOTIFICATION_PERMISSION,
        value: display,
      });

      return display === 'granted';
    } catch (error) {
      console.error('Failed to request permission:', error);
      return false;
    }
  }

  async checkPermission() {
    if (!this.isNative) return false;

    try {
      const { display } = await LocalNotifications.checkPermissions();
      this.permissionStatus = display;
      return display === 'granted';
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }

  // Preference management
  async getNotificationPreference(key, defaultValue = null) {
    try {
      const { value } = await Preferences.get({ key });
      if (value === null) return defaultValue;

      // Parse JSON values for complex types
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`Failed to get preference ${key}:`, error);
      return defaultValue;
    }
  }

  async setNotificationPreference(key, value) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await Preferences.set({ key, value: stringValue });
      return true;
    } catch (error) {
      console.error(`Failed to set preference ${key}:`, error);
      return false;
    }
  }

  // Get default notification times
  getDefaultTimes() {
    return {
      dailyReminder: '10:00', // Not used anymore - using random times
      streakSaver: '20:00', // 8 PM
      quietStart: '21:30', // 9:30 PM
      quietEnd: '07:30', // 7:30 AM
    };
  }

  // Get random daily reminder time between 9 AM and 10:30 AM at 15-minute intervals
  getRandomDailyReminderTime() {
    const timeSlots = [
      { hours: 9, minutes: 0 }, // 9:00 AM
      { hours: 9, minutes: 15 }, // 9:15 AM
      { hours: 9, minutes: 30 }, // 9:30 AM
      { hours: 9, minutes: 45 }, // 9:45 AM
      { hours: 10, minutes: 0 }, // 10:00 AM
      { hours: 10, minutes: 15 }, // 10:15 AM
      { hours: 10, minutes: 30 }, // 10:30 AM
    ];

    // Get last used time to avoid consecutive repeats
    const lastUsedTime = this.getNotificationPreference('last_daily_reminder_time', null);

    // Filter out last used time if it exists
    let availableSlots = timeSlots;
    if (lastUsedTime) {
      availableSlots = timeSlots.filter((slot) => {
        const slotStr = `${slot.hours}:${String(slot.minutes).padStart(2, '0')}`;
        return slotStr !== lastUsedTime;
      });
    }

    // Select random slot from available ones
    const randomIndex = Math.floor(Math.random() * availableSlots.length);
    const selectedSlot = availableSlots[randomIndex];

    // Store the selected time as last used
    const selectedTimeStr = `${selectedSlot.hours}:${String(selectedSlot.minutes).padStart(2, '0')}`;
    this.setNotificationPreference('last_daily_reminder_time', selectedTimeStr);

    return selectedSlot;
  }

  // Main scheduling methods
  async scheduleDailyReminder() {
    if (!this.isNative) return;

    // Always enabled if master notifications are on
    const notificationsEnabled = await this.getNotificationPreference(
      PREFS_KEYS.NOTIFICATIONS_ENABLED,
      true
    );
    if (!notificationsEnabled) return;

    // Cancel existing daily reminder
    await this.cancelNotification(NOTIFICATION_IDS.DAILY_REMINDER);

    // Get random time for tomorrow's notification
    const randomTime = this.getRandomDailyReminderTime();

    // Schedule for tomorrow at the specified time
    const scheduleDate = new Date();
    scheduleDate.setDate(scheduleDate.getDate() + 1);
    scheduleDate.setHours(randomTime.hours, randomTime.minutes, 0, 0);

    // Get current stats for context
    const stats = await loadStats();
    // Check if the SCHEDULED date (tomorrow) is a weekend, not today
    const isWeekend = this.isWeekend(scheduleDate);

    // Get appropriate message based on tomorrow's day
    const message = getDailyReminder({
      streak: stats.currentStreak,
      isWeekend,
    });

    // Adjust for weekends (add 30 minutes for variety)
    if (this.isWeekend(scheduleDate)) {
      scheduleDate.setMinutes(scheduleDate.getMinutes() + 30);
    }

    // Check if in quiet hours
    if (await this.isInQuietHours(scheduleDate)) {
      // Reschedule for after quiet hours
      const quietEnd = await this.getNotificationPreference(
        PREFS_KEYS.QUIET_HOURS_END,
        this.getDefaultTimes().quietEnd
      );
      const [endHours, endMinutes] = quietEnd.split(':').map(Number);
      scheduleDate.setHours(endHours, endMinutes, 0, 0);
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_IDS.DAILY_REMINDER,
          title: message.title,
          body: message.body,
          schedule: {
            at: scheduleDate,
            repeats: true,
            every: 'day',
          },
          sound: 'default',
          actionTypeId: 'PLAY_GAME',
          extra: {
            type: 'daily_reminder',
          },
        },
      ],
    });
  }

  async scheduleStreakSaver() {
    if (!this.isNative) return;

    // Always enabled if master notifications are on
    const notificationsEnabled = await this.getNotificationPreference(
      PREFS_KEYS.NOTIFICATIONS_ENABLED,
      true
    );
    if (!notificationsEnabled) return;

    // Cancel existing streak saver
    await this.cancelNotification(NOTIFICATION_IDS.STREAK_SAVER);

    // Get current stats
    const stats = await loadStats();

    // Only schedule if user has a streak of 3+ days
    if (stats.currentStreak < 3) return;

    // Check if already played today
    if (await hasPlayedToday()) return;

    // Get streak saver time
    const streakTime = await this.getNotificationPreference(
      PREFS_KEYS.STREAK_PROTECTION_TIME,
      this.getDefaultTimes().streakSaver
    );

    const [hours, minutes] = streakTime.split(':').map(Number);

    // Schedule for today at specified time
    const scheduleDate = new Date();
    scheduleDate.setHours(hours, minutes, 0, 0);

    // If time has passed, schedule for tomorrow
    if (scheduleDate <= new Date()) {
      scheduleDate.setDate(scheduleDate.getDate() + 1);
    }

    // Calculate hours left until midnight ET
    const midnight = new Date();
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const hoursLeft = (midnight - new Date()) / (1000 * 60 * 60);

    // Get appropriate message
    const message = getStreakSaverMessage(stats.currentStreak, hoursLeft);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_IDS.STREAK_SAVER,
          title: message.title,
          body: message.body,
          schedule: {
            at: scheduleDate,
          },
          sound: 'default',
          actionTypeId: 'SAVE_STREAK',
          extra: {
            type: 'streak_saver',
            streak: stats.currentStreak,
          },
        },
      ],
    });
  }

  async sendWeeklySummaryNow() {
    if (!this.isNative) return;

    // Get current weekly stats
    const weeklyStats = await getWeeklyPuzzleStats();

    // Get random message and format with actual data
    const message = getRandomMessage(WEEKLY_SUMMARY);
    const formattedMessage = formatMessage(message, {
      played: weeklyStats.puzzlesCompleted,
    });

    // Send notification immediately
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_IDS.WEEKLY_SUMMARY,
          title: formattedMessage.title,
          body: formattedMessage.body,
          schedule: {
            at: new Date(Date.now() + 1000), // 1 second from now
          },
          sound: 'default',
          actionTypeId: 'PLAY_GAME',
          extra: {
            type: 'weekly_summary',
            puzzlesCompleted: weeklyStats.puzzlesCompleted,
          },
        },
      ],
    });
  }

  async scheduleWeeklySummary() {
    if (!this.isNative) return;

    // Cancel existing weekly summary
    await this.cancelNotification(NOTIFICATION_IDS.WEEKLY_SUMMARY);

    // Check if today is Sunday and it's around 11 AM
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hours = now.getHours();

    // If it's Sunday and between 10:30 AM and 11:30 AM, send immediately
    if (dayOfWeek === 0 && hours >= 10 && hours <= 11) {
      await this.sendWeeklySummaryNow();
      return;
    }

    // Schedule for next Sunday at 11 AM
    const scheduleDate = new Date();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    scheduleDate.setDate(scheduleDate.getDate() + daysUntilSunday);
    scheduleDate.setHours(11, 0, 0, 0);

    // We'll use a placeholder notification that will trigger the actual calculation
    // Note: This is a limitation of the current system - we can't calculate future stats
    // The app would need to be running on Sunday to send accurate stats
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_IDS.WEEKLY_SUMMARY,
          title: 'Weekly Check-In',
          body: 'Check your Tandem stats for this week! 🎯',
          schedule: {
            at: scheduleDate,
            repeats: true,
            every: 'week',
          },
          sound: 'default',
          actionTypeId: 'PLAY_GAME',
          extra: {
            type: 'weekly_summary_trigger',
          },
        },
      ],
    });
  }

  async scheduleMilestoneNotification(days) {
    if (!this.isNative) return;

    const message = getMilestoneMessage(days);
    if (!message) return;

    // Schedule immediately
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_IDS.MILESTONE,
          title: message.title,
          body: message.body,
          schedule: {
            at: new Date(Date.now() + 1000), // 1 second from now
          },
          sound: 'default',
          actionTypeId: 'PLAY_GAME',
          extra: {
            type: 'milestone',
            days,
          },
        },
      ],
    });
  }

  // Helper methods
  isWeekend(date = new Date()) {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  async isInQuietHours(date = new Date()) {
    const quietEnabled = await this.getNotificationPreference(PREFS_KEYS.QUIET_HOURS_ENABLED, true);
    if (!quietEnabled) return false;

    const quietStart = await this.getNotificationPreference(
      PREFS_KEYS.QUIET_HOURS_START,
      this.getDefaultTimes().quietStart
    );
    const quietEnd = await this.getNotificationPreference(
      PREFS_KEYS.QUIET_HOURS_END,
      this.getDefaultTimes().quietEnd
    );

    const [startHours, startMinutes] = quietStart.split(':').map(Number);
    const [endHours, endMinutes] = quietEnd.split(':').map(Number);

    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    // Handle overnight quiet hours
    if (startTotalMinutes > endTotalMinutes) {
      return currentMinutes >= startTotalMinutes || currentMinutes < endTotalMinutes;
    } else {
      return currentMinutes >= startTotalMinutes && currentMinutes < endTotalMinutes;
    }
  }

  async cancelNotification(id) {
    if (!this.isNative) return;

    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
    } catch (error) {
      console.error(`Failed to cancel notification ${id}:`, error);
    }
  }

  async cancelAllNotifications() {
    if (!this.isNative) return;

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async rescheduleAllNotifications() {
    if (!this.isNative) return;

    // Cancel all existing notifications
    await this.cancelAllNotifications();

    // Check if notifications are enabled
    const enabled = await this.getNotificationPreference(PREFS_KEYS.NOTIFICATIONS_ENABLED, true);
    if (!enabled) return;

    // Reschedule all notification types
    await this.scheduleDailyReminder();
    await this.scheduleStreakSaver();
    await this.scheduleWeeklySummary();
  }

  // Called when puzzle is completed
  async onPuzzleCompleted() {
    if (!this.isNative) return;

    // Cancel today's streak saver since puzzle is done
    await this.cancelNotification(NOTIFICATION_IDS.STREAK_SAVER);

    // Clear badge
    await this.clearBadge();

    // Check for milestone
    const stats = await loadStats();
    const milestones = [7, 14, 30, 50, 100];
    if (milestones.includes(stats.currentStreak)) {
      await this.scheduleMilestoneNotification(stats.currentStreak);
    }

    // Update last play time
    await this.setNotificationPreference(PREFS_KEYS.LAST_PLAY_TIME, new Date().toISOString());
  }

  // Called on app launch
  async onAppLaunch() {
    if (!this.isNative) return;

    await this.initialize();

    // Clear badge
    await this.clearBadge();

    // Check if we need to reschedule notifications
    const today = getTodayDateString();
    const lastCheck = await this.getNotificationPreference('last_notification_check');

    if (lastCheck !== today) {
      await this.rescheduleAllNotifications();
      await this.setNotificationPreference('last_notification_check', today);
    }

    // Check if it's Sunday and we should send weekly summary
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hours = now.getHours();

    // Check if we've already sent weekly summary today
    const lastWeeklySummary = await this.getNotificationPreference('last_weekly_summary_date');

    if (dayOfWeek === 0 && hours >= 10 && lastWeeklySummary !== today) {
      // Send weekly summary with actual stats
      await this.sendWeeklySummaryNow();
      await this.setNotificationPreference('last_weekly_summary_date', today);
    }
  }

  async clearBadge() {
    if (!this.isNative) return;

    try {
      // iOS specific badge clearing
      if (Capacitor.getPlatform() === 'ios') {
        await LocalNotifications.setBadgeCount({ count: 0 });
      }
    } catch (error) {
      console.error('Failed to clear badge:', error);
    }
  }

  // Settings management
  async updateSettings(settings) {
    if (!this.isNative) return;

    // Update all preferences
    for (const [key, value] of Object.entries(settings)) {
      await this.setNotificationPreference(key, value);
    }

    // Reschedule notifications based on new settings
    await this.rescheduleAllNotifications();
  }

  async getSettings() {
    return {
      notificationsEnabled: await this.getNotificationPreference(
        PREFS_KEYS.NOTIFICATIONS_ENABLED,
        true
      ),
    };
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
