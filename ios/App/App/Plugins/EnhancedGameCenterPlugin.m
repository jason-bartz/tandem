#import <Capacitor/Capacitor.h>

CAP_PLUGIN(EnhancedGameCenterPlugin, "EnhancedGameCenterPlugin",
    CAP_PLUGIN_METHOD(authenticateLocalPlayer, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(isAuthenticated, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(syncStatsWithGameCenter, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(submitScore, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(fetchLeaderboardScores, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(reportAchievement, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(unlockAchievement, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(fetchAchievements, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(showAchievements, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(showLeaderboard, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(resolveConflict, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(batchSubmitScores, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clearCache, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(resetAchievements, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getDebugInfo, CAPPluginReturnPromise);
)
