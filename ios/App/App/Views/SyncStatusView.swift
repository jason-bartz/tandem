import SwiftUI
import Combine
import GameKit

/**
 * SyncStatusView - Native iOS sync status indicator
 *
 * Displays real-time sync status following Apple HIG.
 * Shows sync progress, errors, and last sync time.
 * Indicates whether Game Center, iCloud, or local storage is being used.
 */
struct SyncStatusView: View {
    @ObservedObject var syncManager: SyncManager
    @State private var isExpanded = false
    @State private var showDetails = false

    var body: some View {
        HStack(spacing: 8) {
            // Sync icon with animation
            syncIcon
                .foregroundColor(syncColor)
                .font(.system(size: 14, weight: .medium))
                .rotationEffect(.degrees(syncManager.isSyncing ? 360 : 0))
                .animation(
                    syncManager.isSyncing ?
                    .linear(duration: 2).repeatForever(autoreverses: false) :
                    .default,
                    value: syncManager.isSyncing
                )

            // Status text
            Text(syncStatusText)
                .font(.system(size: 12, weight: .regular))
                .foregroundColor(.secondary)
                .lineLimit(1)

            // Error indicator
            if syncManager.hasError {
                Button(action: { showDetails = true }) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundColor(.red)
                        .font(.system(size: 12))
                }
            }

            // Expand/collapse button for details
            if !syncManager.isSyncing {
                Button(action: { withAnimation { isExpanded.toggle() } }) {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(backgroundView)
        .cornerRadius(20)
        .onTapGesture {
            if !syncManager.isSyncing {
                withAnimation {
                    isExpanded.toggle()
                }
            }
        }
        .sheet(isPresented: $showDetails) {
            SyncDetailsView(syncManager: syncManager)
        }
        .overlay(
            Group {
                if isExpanded {
                    expandedView
                }
            }
        )
    }

    // MARK: - Subviews

    private var syncIcon: Image {
        if syncManager.isSyncing {
            return Image(systemName: "arrow.triangle.2.circlepath")
        } else if syncManager.hasError {
            if syncManager.primaryProvider == "GameCenter" {
                return Image(systemName: "exclamationmark.circle.fill")
            } else {
                return Image(systemName: "exclamationmark.icloud")
            }
        } else if !syncManager.isOnline {
            return Image(systemName: "icloud.slash")
        } else if syncManager.primaryProvider == "GameCenter" {
            return Image(systemName: "gamecontroller.fill")
        } else if syncManager.primaryProvider == "CloudKit" {
            return Image(systemName: "checkmark.icloud")
        } else {
            return Image(systemName: "iphone")
        }
    }

    private var syncColor: Color {
        if syncManager.hasError {
            return .red
        } else if !syncManager.isOnline {
            return .orange
        } else if syncManager.isSyncing {
            return .blue
        } else {
            return .green
        }
    }

    private var syncStatusText: String {
        if !syncManager.isOnline {
            return "Offline"
        } else if syncManager.isSyncing {
            if let progress = syncManager.syncProgress {
                return "Syncing... \(Int(progress * 100))%"
            }
            return "Syncing..."
        } else if let lastSync = syncManager.lastSyncTime {
            let formatter = RelativeDateTimeFormatter()
            formatter.unitsStyle = .abbreviated
            return "Synced \(formatter.localizedString(for: lastSync, relativeTo: Date()))"
        } else {
            return "Not synced"
        }
    }

    private var backgroundView: some View {
        Group {
            if syncManager.hasError {
                Color.red.opacity(0.1)
            } else if !syncManager.isOnline {
                Color.orange.opacity(0.1)
            } else if syncManager.isSyncing {
                Color.blue.opacity(0.1)
            } else {
                Color(UIColor.secondarySystemBackground)
            }
        }
    }

    private var expandedView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Divider()

            // Sync providers status
            ForEach(syncManager.providers, id: \.name) { provider in
                HStack {
                    Image(systemName: provider.iconName)
                        .foregroundColor(provider.isAvailable ? .green : .gray)
                        .frame(width: 20)

                    Text(provider.displayName)
                        .font(.system(size: 11))

                    Spacer()

                    if provider.isSyncing {
                        ProgressView()
                            .scaleEffect(0.7)
                    } else {
                        Image(systemName: provider.isAvailable ? "checkmark.circle" : "xmark.circle")
                            .foregroundColor(provider.isAvailable ? .green : .gray)
                            .font(.system(size: 10))
                    }
                }
            }

            // Sync statistics
            if let stats = syncManager.syncStats {
                Divider()

                HStack {
                    Text("Success rate:")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(Int(stats.successRate * 100))%")
                        .font(.system(size: 10, weight: .medium))
                }

                HStack {
                    Text("Conflicts resolved:")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(stats.conflictsResolved)")
                        .font(.system(size: 10, weight: .medium))
                }
            }

            // Manual sync button
            if !syncManager.isSyncing {
                Button(action: { syncManager.syncNow() }) {
                    HStack {
                        Image(systemName: "arrow.clockwise")
                        Text("Sync Now")
                    }
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.blue)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 4)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(8)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.bottom, 8)
        .transition(.opacity.combined(with: .move(edge: .top)))
    }
}

// MARK: - Sync Details View

struct SyncDetailsView: View {
    @ObservedObject var syncManager: SyncManager
    @Environment(\.presentationMode) var presentationMode

    var body: some View {
        NavigationView {
            List {
                // Status section
                Section(header: Text("Status")) {
                    HStack {
                        Text("Connection")
                        Spacer()
                        Text(syncManager.isOnline ? "Online" : "Offline")
                            .foregroundColor(syncManager.isOnline ? .green : .orange)
                    }

                    HStack {
                        Text("Last Sync")
                        Spacer()
                        if let lastSync = syncManager.lastSyncTime {
                            Text(lastSync, style: .relative)
                                .foregroundColor(.secondary)
                        } else {
                            Text("Never")
                                .foregroundColor(.secondary)
                        }
                    }

                    if let error = syncManager.lastError {
                        HStack {
                            Text("Last Error")
                            Spacer()
                            Text(error.localizedDescription)
                                .foregroundColor(.red)
                                .font(.system(size: 12))
                                .lineLimit(2)
                        }
                    }
                }

                // Providers section
                Section(header: Text("Sync Providers")) {
                    ForEach(syncManager.providers, id: \.name) { provider in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(provider.displayName)
                                    .font(.system(size: 14, weight: .medium))

                                Text(provider.description)
                                    .font(.system(size: 11))
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            if provider.isAvailable {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            } else {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }

                // Statistics section
                if let stats = syncManager.syncStats {
                    Section(header: Text("Statistics")) {
                        StatRow(label: "Total Syncs", value: "\(stats.totalSyncs)")
                        StatRow(label: "Successful", value: "\(stats.successfulSyncs)")
                        StatRow(label: "Failed", value: "\(stats.failedSyncs)")
                        StatRow(label: "Conflicts", value: "\(stats.conflictsResolved)")
                        StatRow(label: "Average Duration", value: String(format: "%.2fs", stats.averageDuration))
                    }
                }

                // Actions section
                Section {
                    Button(action: { syncManager.syncNow() }) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Sync Now")
                        }
                        .foregroundColor(.blue)
                    }
                    .disabled(syncManager.isSyncing)

                    Button(action: { syncManager.clearCache() }) {
                        HStack {
                            Image(systemName: "trash")
                            Text("Clear Cache")
                        }
                        .foregroundColor(.orange)
                    }

                    #if DEBUG
                    Button(action: { syncManager.resetSync() }) {
                        HStack {
                            Image(systemName: "exclamationmark.triangle")
                            Text("Reset Sync (Debug)")
                        }
                        .foregroundColor(.red)
                    }
                    #endif
                }
            }
            .listStyle(InsetGroupedListStyle())
            .navigationTitle("Sync Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Helper Views

struct StatRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
        }
        .font(.system(size: 14))
    }
}

// MARK: - Sync Manager

class SyncManager: ObservableObject {
    @Published var isSyncing = false
    @Published var syncProgress: Double?
    @Published var hasError = false
    @Published var lastError: Error?
    @Published var lastSyncTime: Date?
    @Published var isOnline = true
    @Published var providers: [SyncProvider] = []
    @Published var syncStats: SyncStatistics?
    @Published var primaryProvider: String = "LocalStorage"

    struct SyncProvider {
        let name: String
        let displayName: String
        let description: String
        let iconName: String
        var isAvailable: Bool
        var isSyncing: Bool
    }

    struct SyncStatistics {
        let totalSyncs: Int
        let successfulSyncs: Int
        let failedSyncs: Int
        let conflictsResolved: Int
        let averageDuration: Double

        var successRate: Double {
            guard totalSyncs > 0 else { return 0 }
            return Double(successfulSyncs) / Double(totalSyncs)
        }
    }

    init() {
        setupProviders()
        loadSyncStats()
        monitorNetworkStatus()
    }

    private func setupProviders() {
        // Check Game Center availability
        let isGameCenterAvailable = GKLocalPlayer.local.isAuthenticated

        // Check iCloud availability
        let isiCloudAvailable = FileManager.default.ubiquityIdentityToken != nil

        providers = [
            SyncProvider(
                name: "gameCenter",
                displayName: "Game Center",
                description: "Leaderboards & Achievements",
                iconName: "gamecontroller",
                isAvailable: isGameCenterAvailable,
                isSyncing: false
            ),
            SyncProvider(
                name: "cloudKit",
                displayName: "iCloud",
                description: "Full game data sync",
                iconName: "icloud",
                isAvailable: isiCloudAvailable,
                isSyncing: false
            ),
            SyncProvider(
                name: "keyValueStore",
                displayName: "Quick Sync",
                description: "Instant streak updates",
                iconName: "bolt",
                isAvailable: isiCloudAvailable,
                isSyncing: false
            )
        ]

        // Determine primary provider
        if isGameCenterAvailable {
            primaryProvider = "GameCenter"
        } else if isiCloudAvailable {
            primaryProvider = "CloudKit"
        } else {
            primaryProvider = "LocalStorage"
        }
    }

    private func loadSyncStats() {
        // Load from UserDefaults or CoreData
        syncStats = SyncStatistics(
            totalSyncs: UserDefaults.standard.integer(forKey: "syncStats.totalSyncs"),
            successfulSyncs: UserDefaults.standard.integer(forKey: "syncStats.successfulSyncs"),
            failedSyncs: UserDefaults.standard.integer(forKey: "syncStats.failedSyncs"),
            conflictsResolved: UserDefaults.standard.integer(forKey: "syncStats.conflictsResolved"),
            averageDuration: UserDefaults.standard.double(forKey: "syncStats.averageDuration")
        )
    }

    private func monitorNetworkStatus() {
        // Monitor network reachability
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(networkStatusChanged),
            name: .reachabilityChanged,
            object: nil
        )
    }

    @objc private func networkStatusChanged(_ notification: Notification) {
        DispatchQueue.main.async {
            self.isOnline = NetworkMonitor.shared.isReachable
        }
    }

    func syncNow() {
        guard !isSyncing else { return }

        isSyncing = true
        hasError = false
        syncProgress = 0

        // Simulate sync with progress
        Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { timer in
            self.syncProgress = min((self.syncProgress ?? 0) + 0.1, 1.0)

            if self.syncProgress ?? 0 >= 1.0 {
                timer.invalidate()
                self.completeSyncing()
            }
        }
    }

    private func completeSyncing() {
        isSyncing = false
        syncProgress = nil
        lastSyncTime = Date()

        // Update statistics
        var stats = syncStats ?? SyncStatistics(
            totalSyncs: 0,
            successfulSyncs: 0,
            failedSyncs: 0,
            conflictsResolved: 0,
            averageDuration: 0
        )

        let newStats = SyncStatistics(
            totalSyncs: stats.totalSyncs + 1,
            successfulSyncs: stats.successfulSyncs + 1,
            failedSyncs: stats.failedSyncs,
            conflictsResolved: stats.conflictsResolved,
            averageDuration: (stats.averageDuration * Double(stats.totalSyncs) + 2.0) / Double(stats.totalSyncs + 1)
        )

        syncStats = newStats
        saveSyncStats()
    }

    private func saveSyncStats() {
        guard let stats = syncStats else { return }

        UserDefaults.standard.set(stats.totalSyncs, forKey: "syncStats.totalSyncs")
        UserDefaults.standard.set(stats.successfulSyncs, forKey: "syncStats.successfulSyncs")
        UserDefaults.standard.set(stats.failedSyncs, forKey: "syncStats.failedSyncs")
        UserDefaults.standard.set(stats.conflictsResolved, forKey: "syncStats.conflictsResolved")
        UserDefaults.standard.set(stats.averageDuration, forKey: "syncStats.averageDuration")
    }

    func clearCache() {
        // Clear cached data
        print("Clearing sync cache...")
    }

    func resetSync() {
        #if DEBUG
        // Reset sync state for debugging
        lastSyncTime = nil
        hasError = false
        lastError = nil
        syncStats = nil
        UserDefaults.standard.removeObject(forKey: "syncStats.totalSyncs")
        UserDefaults.standard.removeObject(forKey: "syncStats.successfulSyncs")
        UserDefaults.standard.removeObject(forKey: "syncStats.failedSyncs")
        UserDefaults.standard.removeObject(forKey: "syncStats.conflictsResolved")
        UserDefaults.standard.removeObject(forKey: "syncStats.averageDuration")
        #endif
    }
}

// MARK: - Network Monitor

class NetworkMonitor {
    static let shared = NetworkMonitor()
    var isReachable = true
}

extension Notification.Name {
    static let reachabilityChanged = Notification.Name("reachabilityChanged")
}