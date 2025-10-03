import UIKit
import Capacitor
import UserNotifications

/**
 * Main application delegate for Tandem iOS app
 * Handles app lifecycle events, notifications, and URL schemes
 */
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // MARK: - Application Lifecycle

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // App transitioning to inactive state
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Save state and release resources
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Refresh UI and restore state
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Resume tasks and refresh UI
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Persist data before termination
    }

    // MARK: - URL Handling

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {

    /**
     * Handle notification presentation when app is in foreground
     * Shows banner, sound, and badge even when app is active
     */
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    /**
     * Handle user interaction with notification
     * Delegates handling to Capacitor plugin system
     */
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        completionHandler()
    }
}
