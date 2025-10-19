import SwiftUI

/**
 * ConflictResolutionView - Native iOS conflict resolution UI
 *
 * Presents sync conflicts to users in a clear, understandable way.
 * Allows users to choose resolution strategy following Apple HIG.
 */
struct ConflictResolutionView: View {
    let localStats: GameStats
    let remoteStats: GameStats
    let onResolve: (ConflictResolution) -> Void

    @State private var selectedResolution: ConflictResolution?
    @State private var showDetails = false
    @State private var isProcessing = false
    @Environment(\.presentationMode) var presentationMode

    enum ConflictResolution {
        case useLocal
        case useRemote
        case merge
        case cancel
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                headerView
                    .padding()
                    .background(Color(UIColor.systemBackground))

                ScrollView {
                    VStack(spacing: 16) {
                        // Explanation
                        explanationView
                            .padding(.horizontal)

                        // Resolution options
                        VStack(spacing: 12) {
                            ResolutionOptionCard(
                                title: "This Device",
                                subtitle: deviceName,
                                stats: localStats,
                                icon: "iphone",
                                color: .blue,
                                isSelected: selectedResolution == .useLocal
                            ) {
                                withAnimation {
                                    selectedResolution = .useLocal
                                }
                            }

                            ResolutionOptionCard(
                                title: "iCloud",
                                subtitle: "All your devices",
                                stats: remoteStats,
                                icon: "icloud",
                                color: .green,
                                isSelected: selectedResolution == .useRemote
                            ) {
                                withAnimation {
                                    selectedResolution = .useRemote
                                }
                            }

                            ResolutionOptionCard(
                                title: "Merge Both",
                                subtitle: "Keep highest values",
                                stats: mergedStats,
                                icon: "arrow.triangle.merge",
                                color: .purple,
                                isSelected: selectedResolution == .merge,
                                isRecommended: true
                            ) {
                                withAnimation {
                                    selectedResolution = .merge
                                }
                            }
                        }
                        .padding(.horizontal)

                        // Details button
                        Button(action: { showDetails.toggle() }) {
                            Label("Show Detailed Comparison", systemImage: "info.circle")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.blue)
                        }
                        .padding(.top, 8)
                    }
                    .padding(.vertical)
                }

                // Action buttons
                actionButtons
                    .padding()
                    .background(
                        Color(UIColor.secondarySystemBackground)
                            .ignoresSafeArea(edges: .bottom)
                    )
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showDetails) {
                ConflictDetailsView(
                    local: localStats,
                    remote: remoteStats,
                    merged: mergedStats
                )
            }
            .overlay(
                Group {
                    if isProcessing {
                        ProcessingOverlay()
                    }
                }
            )
        }
    }

    // MARK: - Subviews

    private var headerView: some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.arrow.triangle.2.circlepath")
                .font(.system(size: 48))
                .foregroundColor(.orange)
                .symbolRenderingMode(.hierarchical)

            Text("Sync Conflict Detected")
                .font(.system(size: 22, weight: .semibold))

            Text("Your game stats differ between devices")
                .font(.system(size: 14))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var explanationView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("What happened?", systemImage: "questionmark.circle")
                .font(.system(size: 14, weight: .medium))

            Text("Your game was played on multiple devices, and the stats don't match. This can happen when playing offline or switching between devices.")
                .font(.system(size: 13))
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding()
        .background(Color(UIColor.tertiarySystemBackground))
        .cornerRadius(12)
    }

    private var actionButtons: some View {
        VStack(spacing: 12) {
            Button(action: applyResolution) {
                HStack {
                    if isProcessing {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(0.8)
                    } else {
                        Text("Apply")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(
                    selectedResolution != nil ?
                    Color.blue : Color.gray
                )
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(selectedResolution == nil || isProcessing)

            Button(action: cancel) {
                Text("Cancel")
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .foregroundColor(.blue)
            }
            .disabled(isProcessing)
        }
    }

    private var mergedStats: GameStats {
        GameStats(
            gamesPlayed: max(localStats.gamesPlayed, remoteStats.gamesPlayed),
            gamesWon: max(localStats.gamesWon, remoteStats.gamesWon),
            currentStreak: selectBestStreak(),
            bestStreak: max(localStats.bestStreak, remoteStats.bestStreak),
            lastPlayedDate: max(localStats.lastPlayedDate ?? "", remoteStats.lastPlayedDate ?? "")
        )
    }

    private func selectBestStreak() -> Int {
        // Use the streak with the most recent date
        if let localDate = localStats.lastPlayedDate,
           let remoteDate = remoteStats.lastPlayedDate {
            return localDate > remoteDate ? localStats.currentStreak : remoteStats.currentStreak
        }
        return max(localStats.currentStreak, remoteStats.currentStreak)
    }

    private var deviceName: String {
        UIDevice.current.name
    }

    // MARK: - Actions

    private func applyResolution() {
        guard let resolution = selectedResolution else { return }

        isProcessing = true

        // Simulate processing delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            self.isProcessing = false
            self.onResolve(resolution)
            self.presentationMode.wrappedValue.dismiss()
        }
    }

    private func cancel() {
        onResolve(.cancel)
        presentationMode.wrappedValue.dismiss()
    }
}

// MARK: - Resolution Option Card

struct ResolutionOptionCard: View {
    let title: String
    let subtitle: String
    let stats: GameStats
    let icon: String
    let color: Color
    let isSelected: Bool
    var isRecommended: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                // Header
                HStack {
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundColor(color)
                        .frame(width: 28)

                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Text(title)
                                .font(.system(size: 16, weight: .semibold))

                            if isRecommended {
                                Text("RECOMMENDED")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.green)
                                    .cornerRadius(4)
                            }
                        }

                        Text(subtitle)
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 22))
                        .foregroundColor(isSelected ? color : .gray.opacity(0.3))
                }

                // Stats preview
                HStack(spacing: 20) {
                    StatItem(label: "Games", value: "\(stats.gamesPlayed)")
                    StatItem(label: "Wins", value: "\(stats.gamesWon)")
                    StatItem(label: "Streak", value: "\(stats.currentStreak)")
                    StatItem(label: "Best", value: "\(stats.bestStreak)")
                }
                .padding(.top, 4)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(UIColor.secondarySystemBackground))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? color : Color.clear, lineWidth: 2)
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Stat Item

struct StatItem: View {
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 16, weight: .semibold))

            Text(label)
                .font(.system(size: 10))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Conflict Details View

struct ConflictDetailsView: View {
    let local: GameStats
    let remote: GameStats
    let merged: GameStats

    @Environment(\.presentationMode) var presentationMode

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Detailed Comparison")) {
                    ComparisonRow(
                        field: "Games Played",
                        local: "\(local.gamesPlayed)",
                        remote: "\(remote.gamesPlayed)",
                        merged: "\(merged.gamesPlayed)"
                    )

                    ComparisonRow(
                        field: "Games Won",
                        local: "\(local.gamesWon)",
                        remote: "\(remote.gamesWon)",
                        merged: "\(merged.gamesWon)"
                    )

                    ComparisonRow(
                        field: "Current Streak",
                        local: "\(local.currentStreak)",
                        remote: "\(remote.currentStreak)",
                        merged: "\(merged.currentStreak)"
                    )

                    ComparisonRow(
                        field: "Best Streak",
                        local: "\(local.bestStreak)",
                        remote: "\(remote.bestStreak)",
                        merged: "\(merged.bestStreak)"
                    )

                    ComparisonRow(
                        field: "Win Rate",
                        local: String(format: "%.1f%%", local.winRate),
                        remote: String(format: "%.1f%%", remote.winRate),
                        merged: String(format: "%.1f%%", merged.winRate)
                    )

                    if let localDate = local.lastPlayedDate,
                       let remoteDate = remote.lastPlayedDate {
                        ComparisonRow(
                            field: "Last Played",
                            local: formatDate(localDate),
                            remote: formatDate(remoteDate),
                            merged: formatDate(merged.lastPlayedDate ?? "")
                        )
                    }
                }

                Section(header: Text("Resolution Strategy")) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("How merge works:")
                            .font(.system(size: 14, weight: .semibold))

                        Text("• Takes the highest value for games played and wins")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)

                        Text("• Uses the most recent streak information")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)

                        Text("• Preserves your best achievements")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 8)
                }
            }
            .listStyle(InsetGroupedListStyle())
            .navigationTitle("Conflict Details")
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

    private func formatDate(_ dateString: String) -> String {
        // Format the date string for display
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        if let date = formatter.date(from: dateString) {
            formatter.dateStyle = .medium
            formatter.timeStyle = .none
            return formatter.string(from: date)
        }

        return dateString
    }
}

// MARK: - Comparison Row

struct ComparisonRow: View {
    let field: String
    let local: String
    let remote: String
    let merged: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(field)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.primary)

            HStack(spacing: 0) {
                // Local column
                VStack(spacing: 2) {
                    Text("This Device")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                    Text(local)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.blue)
                }
                .frame(maxWidth: .infinity)

                Divider()

                // Remote column
                VStack(spacing: 2) {
                    Text("iCloud")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                    Text(remote)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.green)
                }
                .frame(maxWidth: .infinity)

                Divider()

                // Merged column
                VStack(spacing: 2) {
                    Text("Merged")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                    Text(merged)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.purple)
                        .fontWeight(merged != local && merged != remote ? .bold : .medium)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Processing Overlay

struct ProcessingOverlay: View {
    var body: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            VStack(spacing: 16) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.2)

                Text("Applying changes...")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
            }
            .padding(32)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.black.opacity(0.8))
            )
        }
    }
}

// MARK: - Game Stats Model

struct GameStats {
    let gamesPlayed: Int
    let gamesWon: Int
    let currentStreak: Int
    let bestStreak: Int
    let lastPlayedDate: String?

    var winRate: Double {
        guard gamesPlayed > 0 else { return 0 }
        return (Double(gamesWon) / Double(gamesPlayed)) * 100
    }
}