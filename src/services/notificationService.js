import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { getDailyReminder } from '@/lib/notificationMessages';

const NOTIFICATION_IDS = {
  DAILY_REMINDER: 1,
};

// Helper function to get today's date string in user's local timezone
// Uses Wordle-style local timezone approach for consistent experience
function getTodayDateString() {
  const localDateService = require('@/services/localDateService');
  return localDateService.getCurrentDateString();
}

const PREFS_KEYS = {
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  QUIET_HOURS_ENABLED: 'quiet_hours_enabled',
  QUIET_HOURS_START: 'quiet_hours_start',
  QUIET_HOURS_END: 'quiet_hours_end',
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
    LocalNotifications.addListener('localNotificationReceived', () => {
      // Notification received while app is open
    });

    LocalNotifications.addListener('localNotificationActionPerformed', () => {
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
      quietStart: '21:30', // 9:30 PM
      quietEnd: '07:30', // 7:30 AM
    };
  }

  // Get random daily reminder time between 9 AM and 10:30 AM at 15-minute intervals
  async getRandomDailyReminderTime() {
    const timeSlots = [
      { hours: 9, minutes: 0 }, // 9:00 AM
      { hours: 9, minutes: 15 }, // 9:15 AM
      { hours: 9, minutes: 30 }, // 9:30 AM
      { hours: 9, minutes: 45 }, // 9:45 AM
      { hours: 10, minutes: 0 }, // 10:00 AM
      { hours: 10, minutes: 15 }, // 10:15 AM
      { hours: 10, minutes: 30 }, // 10:30 AM
    ];

    // Get last used time to avoid consecutive repeats (MUST await!)
    const lastUsedTime = await this.getNotificationPreference('last_daily_reminder_time', null);

    // Filter out last used time if it exists
    let availableSlots = timeSlots;
    if (lastUsedTime) {
      availableSlots = timeSlots.filter((slot) => {
        const slotStr = `${slot.hours}:${String(slot.minutes).padStart(2, '0')}`;
        return slotStr !== lastUsedTime;
      });
    }

    if (availableSlots.length === 0) {
      availableSlots = timeSlots;
    }

    // Select random slot from available ones
    const randomIndex = Math.floor(Math.random() * availableSlots.length);
    const selectedSlot = availableSlots[randomIndex];

    // Store the selected time as last used (MUST await!)
    const selectedTimeStr = `${selectedSlot.hours}:${String(selectedSlot.minutes).padStart(2, '0')}`;
    await this.setNotificationPreference('last_daily_reminder_time', selectedTimeStr);

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
    const randomTime = await this.getRandomDailyReminderTime();

    // Schedule for tomorrow at the specified time
    const scheduleDate = new Date();
    scheduleDate.setDate(scheduleDate.getDate() + 1);
    scheduleDate.setHours(randomTime.hours, randomTime.minutes, 0, 0);

    // Respect quiet hours
    if (await this.isInQuietHours(scheduleDate)) {
      const quietEnd = await this.getNotificationPreference(
        PREFS_KEYS.QUIET_HOURS_END,
        this.getDefaultTimes().quietEnd
      );
      const [endHours, endMinutes] = quietEnd.split(':').map(Number);
      scheduleDate.setHours(endHours, endMinutes, 0, 0);
    }

    // Get random message
    const message = getDailyReminder();

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_IDS.DAILY_REMINDER,
          title: message.title,
          body: message.body,
          schedule: {
            at: scheduleDate,
          },
          sound: 'default',
          actionTypeId: 'PLAY_GAME',
          extra: {
            type: 'daily_reminder',
            scheduleDate: scheduleDate.toISOString(),
          },
        },
      ],
    });

    // Store when we last scheduled
    await this.setNotificationPreference('last_daily_reminder_scheduled', new Date().toISOString());
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

    const enabled = await this.getNotificationPreference(PREFS_KEYS.NOTIFICATIONS_ENABLED, true);
    if (!enabled) return;

    // Schedule daily reminder
    await this.scheduleDailyReminder();
  }

  // Called when puzzle is completed
  async onPuzzleCompleted() {
    if (!this.isNative) return;
    await this.clearBadge();
  }

  // Called on app launch
  async onAppLaunch() {
    if (!this.isNative) return;

    await this.initialize();

    await this.clearBadge();

    // Reschedule notifications on launch to ensure fresh content
    const today = getTodayDateString();
    const lastCheck = await this.getNotificationPreference('last_notification_check');

    if (lastCheck !== today) {
      await this.rescheduleAllNotifications();
      await this.setNotificationPreference('last_notification_check', today);
    } else {
      // Verify daily reminder is scheduled
      const pending = await LocalNotifications.getPending();
      const hasDailyReminder = pending.notifications.some(
        (n) => n.id === NOTIFICATION_IDS.DAILY_REMINDER
      );

      if (!hasDailyReminder) {
        await this.scheduleDailyReminder();
      }
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

  async updateSettings(settings) {
    if (!this.isNative) return;

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
