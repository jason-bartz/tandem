import SwiftUI

/**
 * SyncSettingsView - Native iOS sync settings with progressive disclosure
 *
 * Provides user-friendly sync configuration following Apple HIG.
 * Advanced settings hidden by default for simplicity.
 */
struct SyncSettingsView: View {
    @AppStorage("syncEnabled") private var syncEnabled = true
    @AppStorage("autoSync") private var autoSync = true
    @AppStorage("syncMethod") private var syncMethod = "automatic"
    @AppStorage("syncOverCellular") private var syncOverCellular = false
    @AppStorage("showAdvancedSettings") private var showAdvancedSettings = false

    @ObservedObject var syncManager: SyncManager
    @State private var showingResetConfirmation = false
    @State private var showingSignOutConfirmation = false

    var body: some View {
        Form {
            // Main sync toggle
            mainSyncSection

            // Status section
            if syncEnabled {
                statusSection
            }

            // Game Center section
            if syncEnabled {
                gameCenterSection
            }

            // iCloud section
            if syncEnabled {
                iCloudSection
            }

            // Advanced settings
            if syncEnabled && showAdvancedSettings {
                advancedSection
            }

            // Debug section
            #if DEBUG
            debugSection
            #endif
        }
        .navigationTitle("Sync Settings")
        .navigationBarTitleDisplayMode(.large)
    }

    // MARK: - Sections

    private var mainSyncSection: some View {
        Section(footer: Text("Keep your game progress synced across all your devices with iCloud and Game Center.")) {
            Toggle(isOn: $syncEnabled) {
                HStack {
                    Image(systemName: "arrow.triangle.2.circlepath.icloud")
                        .foregroundColor(.blue)
                        .frame(width: 28)

                    Text("Sync Game Data")
                        .font(.system(size: 16, weight: .medium))
                }
            }
            .onChange(of: syncEnabled) { enabled in
                if enabled {
                    syncManager.enableSync()
                } else {
                    syncManager.disableSync()
                }
            }
        }
    }

    private var statusSection: some View {
        Section(header: Text("Status")) {
            // Connection status
            HStack {
                Label("Connection", systemImage: "wifi")
                    .foregroundColor(.primary)

                Spacer()

                HStack(spacing: 4) {
                    Circle()
                        .fill(syncManager.isOnline ? Color.green : Color.orange)
                        .frame(width: 8, height: 8)

                    Text(syncManager.isOnline ? "Online" : "Offline")
                        .font(.system(size: 14))
                        .foregroundColor(syncManager.isOnline ? .green : .orange)
                }
            }

            // Last sync
            HStack {
                Label("Last Sync", systemImage: "clock")
                    .foregroundColor(.primary)

                Spacer()

                if let lastSync = syncManager.lastSyncTime {
                    Text(lastSync, style: .relative)
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                } else {
                    Text("Never")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
            }

            // Sync now button
            Button(action: { syncManager.syncNow() }) {
                HStack {
                    Label("Sync Now", systemImage: "arrow.clockwise")
                        .font(.system(size: 15, weight: .medium))

                    Spacer()

                    if syncManager.isSyncing {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle())
                            .scaleEffect(0.8)
                    }
                }
            }
            .disabled(syncManager.isSyncing || !syncManager.isOnline)
        }
    }

    private var gameCenterSection: some View {
        Section(header: Text("Game Center"), footer: Text("Game Center syncs your achievements and appears on leaderboards.")) {
            // Game Center status
            HStack {
                Image(systemName: "gamecontroller")
                    .foregroundColor(.green)
                    .frame(width: 28)

                Text("Game Center")

                Spacer()

                if let provider = syncManager.providers.first(where: { $0.name == "gameCenter" }) {
                    Image(systemName: provider.isAvailable ? "checkmark.circle.fill" : "xmark.circle")
                        .foregroundColor(provider.isAvailable ? .green : .gray)
                        .font(.system(size: 16))
                }
            }

            // Show Game Center dashboard
            Button(action: openGameCenterDashboard) {
                HStack {
                    Text("View Achievements")
                        .foregroundColor(.blue)
                    Spacer()
                    Image(systemName: "arrow.up.forward")
                        .foregroundColor(.blue)
                        .font(.system(size: 12))
                }
            }
        }
    }

    private var iCloudSection: some View {
        Section(header: Text("iCloud"), footer: Text("iCloud syncs your complete game history and preferences.")) {
            // iCloud status
            HStack {
                Image(systemName: "icloud")
                    .foregroundColor(.blue)
                    .frame(width: 28)

                Text("iCloud Sync")

                Spacer()

                if let provider = syncManager.providers.first(where: { $0.name == "cloudKit" }) {
                    Image(systemName: provider.isAvailable ? "checkmark.circle.fill" : "xmark.circle")
                        .foregroundColor(provider.isAvailable ? .green : .gray)
                        .font(.system(size: 16))
                }
            }

            // Auto sync toggle
            Toggle(isOn: $autoSync) {
                Text("Automatic Sync")
                    .font(.system(size: 15))
            }

            // Sync frequency
            if autoSync {
                Picker("Sync Frequency", selection: $syncMethod) {
                    Text("Real-time").tag("realtime")
                    Text("Every 5 minutes").tag("automatic")
                    Text("Daily").tag("daily")
                    Text("Manual").tag("manual")
                }
                .pickerStyle(MenuPickerStyle())
            }

            // Advanced settings toggle
            Toggle(isOn: $showAdvancedSettings) {
                HStack {
                    Text("Advanced Settings")
                        .font(.system(size: 15))

                    Image(systemName: "gearshape")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
            }
        }
    }

    private var advancedSection: some View {
        Section(header: Text("Advanced"), footer: Text("These settings are for advanced users. Default values work best for most people.")) {
            // Cellular data
            Toggle(isOn: $syncOverCellular) {
                HStack {
                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .foregroundColor(.orange)
                        .frame(width: 28)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Use Cellular Data")
                            .font(.system(size: 15))

                        Text("Sync even on cellular connection")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                }
            }

            // Conflict resolution
            NavigationLink(destination: ConflictResolutionSettingsView()) {
                HStack {
                    Image(systemName: "exclamationmark.arrow.triangle.2.circlepath")
                        .foregroundColor(.purple)
                        .frame(width: 28)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Conflict Resolution")
                            .font(.system(size: 15))

                        Text("How to handle sync conflicts")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                }
            }

            // Data management
            NavigationLink(destination: DataManagementView(syncManager: syncManager)) {
                HStack {
                    Image(systemName: "externaldrive")
                        .foregroundColor(.blue)
                        .frame(width: 28)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Data Management")
                            .font(.system(size: 15))

                        Text("Export, import, or clear data")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                }
            }

            // Reset sync
            Button(action: { showingResetConfirmation = true }) {
                HStack {
                    Image(systemName: "arrow.counterclockwise")
                        .foregroundColor(.red)
                        .frame(width: 28)

                    Text("Reset Sync Data")
                        .foregroundColor(.red)
                }
            }
            .alert(isPresented: $showingResetConfirmation) {
                Alert(
                    title: Text("Reset Sync Data?"),
                    message: Text("This will clear all sync metadata and force a full resync. Your game data will not be deleted."),
                    primaryButton: .destructive(Text("Reset")) {
                        syncManager.resetSync()
                    },
                    secondaryButton: .cancel()
                )
            }
        }
    }

    #if DEBUG
    private var debugSection: some View {
        Section(header: Text("Debug")) {
            // Force conflict
            Button(action: { syncManager.forceConflict() }) {
                Label("Force Conflict", systemImage: "exclamationmark.triangle")
                    .foregroundColor(.orange)
            }

            // Clear all data
            Button(action: { syncManager.clearAllData() }) {
                Label("Clear All Data", systemImage: "trash")
                    .foregroundColor(.red)
            }

            // Show sync log
            NavigationLink(destination: SyncLogView()) {
                Label("Sync Log", systemImage: "doc.text")
            }
        }
    }
    #endif

    // MARK: - Actions

    private func openGameCenterDashboard() {
        // Open Game Center dashboard
        if let url = URL(string: "gamecenter:") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Conflict Resolution Settings View

struct ConflictResolutionSettingsView: View {
    @AppStorage("conflictResolution") private var conflictResolution = "smart"
    @AppStorage("alwaysAskOnConflict") private var alwaysAskOnConflict = false

    var body: some View {
        Form {
            Section(header: Text("Default Strategy"), footer: Text("Choose how conflicts should be resolved when your data differs between devices.")) {
                Picker("Resolution Method", selection: $conflictResolution) {
                    Label("Smart Merge (Recommended)", systemImage: "wand.and.stars")
                        .tag("smart")

                    Label("Most Recent", systemImage: "clock")
                        .tag("recent")

                    Label("Highest Values", systemImage: "arrow.up")
                        .tag("highest")

                    Label("This Device", systemImage: "iphone")
                        .tag("local")

                    Label("iCloud", systemImage: "icloud")
                        .tag("remote")
                }
                .pickerStyle(InsetGroupedListPickerStyle())
                .labelsHidden()
            }

            Section(footer: Text("When enabled, you'll be asked to manually resolve conflicts.")) {
                Toggle(isOn: $alwaysAskOnConflict) {
                    Label("Always Ask", systemImage: "person.crop.circle.badge.questionmark")
                }
            }

            Section(header: Text("Strategy Explanation")) {
                VStack(alignment: .leading, spacing: 12) {
                    StrategyExplanation(
                        title: "Smart Merge",
                        description: "Intelligently combines data, taking highest values for scores and most recent for streaks.",
                        icon: "wand.and.stars",
                        color: .purple
                    )

                    StrategyExplanation(
                        title: "Most Recent",
                        description: "Uses data from the device that synced most recently.",
                        icon: "clock",
                        color: .blue
                    )

                    StrategyExplanation(
                        title: "Highest Values",
                        description: "Always keeps the highest scores and streaks from any device.",
                        icon: "arrow.up",
                        color: .green
                    )
                }
                .padding(.vertical, 8)
            }
        }
        .navigationTitle("Conflict Resolution")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Strategy Explanation View

struct StrategyExplanation: View {
    let title: String
    let description: String
    let icon: String
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.system(size: 20))
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))

                Text(description)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

// MARK: - Data Management View

struct DataManagementView: View {
    @ObservedObject var syncManager: SyncManager
    @State private var showingExportShare = false
    @State private var showingImportPicker = false
    @State private var exportURL: URL?

    var body: some View {
        Form {
            Section(header: Text("Export"), footer: Text("Create a backup of your game data that can be imported later.")) {
                Button(action: exportData) {
                    Label("Export Game Data", systemImage: "square.and.arrow.up")
                        .foregroundColor(.blue)
                }
            }

            Section(header: Text("Import"), footer: Text("Restore game data from a previous export.")) {
                Button(action: { showingImportPicker = true }) {
                    Label("Import Game Data", systemImage: "square.and.arrow.down")
                        .foregroundColor(.blue)
                }
            }

            Section(header: Text("Storage"), footer: Text("View how much space your game data is using.")) {
                HStack {
                    Text("Local Storage")
                    Spacer()
                    Text("2.3 MB")
                        .foregroundColor(.secondary)
                }

                HStack {
                    Text("iCloud Storage")
                    Spacer()
                    Text("1.8 MB")
                        .foregroundColor(.secondary)
                }

                Button(action: clearCache) {
                    Label("Clear Cache", systemImage: "trash")
                        .foregroundColor(.orange)
                }
            }
        }
        .navigationTitle("Data Management")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingExportShare) {
            if let url = exportURL {
                ShareSheet(items: [url])
            }
        }
        .fileImporter(
            isPresented: $showingImportPicker,
            allowedContentTypes: [.json],
            allowsMultipleSelection: false
        ) { result in
            handleImport(result)
        }
    }

    private func exportData() {
        // Export implementation
        syncManager.exportData { url in
            self.exportURL = url
            self.showingExportShare = true
        }
    }

    private func handleImport(_ result: Result<[URL], Error>) {
        // Import implementation
        switch result {
        case .success(let urls):
            if let url = urls.first {
                syncManager.importData(from: url)
            }
        case .failure(let error):
            print("Import failed: \(error)")
        }
    }

    private func clearCache() {
        syncManager.clearCache()
    }
}

// MARK: - Sync Log View (Debug)

#if DEBUG
struct SyncLogView: View {
    @State private var logEntries: [String] = []

    var body: some View {
        List(logEntries, id: \.self) { entry in
            Text(entry)
                .font(.system(size: 11, design: .monospaced))
        }
        .navigationTitle("Sync Log")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadLogEntries()
        }
    }

    private func loadLogEntries() {
        // Load sync log entries
        logEntries = [
            "[2025-01-19 10:30:15] Sync started",
            "[2025-01-19 10:30:15] Fetching from Game Center...",
            "[2025-01-19 10:30:16] Game Center: 243 games, 201 wins",
            "[2025-01-19 10:30:16] Fetching from CloudKit...",
            "[2025-01-19 10:30:17] CloudKit: 245 games, 203 wins",
            "[2025-01-19 10:30:17] Conflict detected: games differ by 2",
            "[2025-01-19 10:30:17] Applying smart merge strategy",
            "[2025-01-19 10:30:18] Merged: 245 games, 203 wins",
            "[2025-01-19 10:30:18] Saving to all providers...",
            "[2025-01-19 10:30:19] Sync completed successfully"
        ]
    }
}
#endif

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - SyncManager Extensions

extension SyncManager {
    func enableSync() {
        // Enable sync
        print("Sync enabled")
    }

    func disableSync() {
        // Disable sync
        print("Sync disabled")
    }

    func forceConflict() {
        #if DEBUG
        // Force a conflict for testing
        print("Forcing conflict...")
        #endif
    }

    func clearAllData() {
        #if DEBUG
        // Clear all data for testing
        print("Clearing all data...")
        #endif
    }

    func exportData(completion: @escaping (URL?) -> Void) {
        // Export data implementation
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            // Create temporary file URL
            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent("tandem_backup_\(Date().timeIntervalSince1970).json")
            completion(url)
        }
    }

    func importData(from url: URL) {
        // Import data implementation
        print("Importing data from: \(url)")
    }
}