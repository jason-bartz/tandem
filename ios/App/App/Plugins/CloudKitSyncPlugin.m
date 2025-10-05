#import <Capacitor/Capacitor.h>

CAP_PLUGIN(CloudKitSyncPlugin, "CloudKitSync",
    CAP_PLUGIN_METHOD(checkAccountStatus, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(syncStats, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(fetchStats, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(syncPuzzleResult, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(fetchPuzzleResults, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(syncPuzzleProgress, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(fetchPuzzleProgress, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(syncPreferences, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(fetchPreferences, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(performFullSync, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clearCloudData, CAPPluginReturnPromise);
)
