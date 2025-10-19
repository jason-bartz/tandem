import Foundation
import Capacitor
import GameKit

/**
 * Enhanced Game Center Plugin for Tandem
 *
 * Production-grade Game Center integration following Apple HIG.
 * Implements leaderboards, achievements, and serves as primary sync source.
 * Includes proper error handling, retry logic, and conflict resolution.
 */
@objc(EnhancedGameCenterPlugin)
public class EnhancedGameCenterPlugin: CAPPlugin {

    // MARK: - Properties

    private var isAuthenticated = false
    private var localPlayer: GKLocalPlayer?
    private var authenticationViewController: UIViewController?

    // Leaderboard identifiers - only the one configured in App Store Connect
    private let leaderboardIDs = [
        "longestStreak": "com.tandemdaily.app.longest_streak"
        // Note: Other stats are synced via CloudKit only
    ]

    // Achievement identifiers
    private let achievementIDs = [
        "firstWin": "com.tandemdaily.achievement.firstwin",
        "streak7": "com.tandemdaily.achievement.streak7",
        "streak30": "com.tandemdaily.achievement.streak30",
        "streak90": "com.tandemdaily.achievement.streak90",
        "streak365": "com.tandemdaily.achievement.streak365",
        "wins10": "com.tandemdaily.achievement.wins10",
        "wins50": "com.tandemdaily.achievement.wins50",
        "wins100": "com.tandemdaily.achievement.wins100",
        "perfectGame": "com.tandemdaily.achievement.perfect",
        "speedDemon": "com.tandemdaily.achievement.speed"
    ]

    // Cache for performance
    private var cachedLeaderboards: [String: GKLeaderboard] = [:]
    private var cachedAchievements: [GKAchievement] = [:]
    private var lastFetchTime: Date?
    private let cacheExpiration: TimeInterval = 300 // 5 minutes

    // Sync state
    private var syncInProgress = false
    private let syncQueue = DispatchQueue(label: "com.tandemdaily.gamecenter.sync", qos: .background)

    // MARK: - Initialization

    override public func load() {
        super.load()

        // Configure Game Center
        configureGameCenter()

        // Authenticate player
        authenticateLocalPlayer()
    }

    private func configureGameCenter() {
        // Set authentication handler
        GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
            if let viewController = viewController {
                // Present authentication view controller
                self?.authenticationViewController = viewController
                self?.presentAuthenticationViewController(viewController)
            } else if GKLocalPlayer.local.isAuthenticated {
                // Player authenticated
                self?.isAuthenticated = true
                self?.localPlayer = GKLocalPlayer.local
                self?.onPlayerAuthenticated()
            } else {
                // Authentication failed
                self?.isAuthenticated = false
                self?.localPlayer = nil

                if let error = error {
                    print("[GameCenter] Authentication failed: \(error.localizedDescription)")
                }
            }
        }
    }

    private func presentAuthenticationViewController(_ viewController: UIViewController) {
        DispatchQueue.main.async {
            self.bridge?.viewController?.present(viewController, animated: true)
        }
    }

    private func onPlayerAuthenticated() {
        print("[GameCenter] Player authenticated: \(localPlayer?.displayName ?? "Unknown")")

        // Load initial data
        Task {
            await loadCachedData()
        }

        // Notify JavaScript layer
        notifyListeners("gameCenterAuthenticated", data: [
            "playerID": localPlayer?.gamePlayerID ?? "",
            "displayName": localPlayer?.displayName ?? "",
            "alias": localPlayer?.alias ?? ""
        ])
    }

    // MARK: - Authentication

    @objc func authenticateLocalPlayer(_ call: CAPPluginCall? = nil) {
        guard !isAuthenticated else {
            call?.resolve([
                "authenticated": true,
                "playerID": localPlayer?.gamePlayerID ?? ""
            ])
            return
        }

        // Trigger authentication
        GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
            if let viewController = viewController {
                self?.presentAuthenticationViewController(viewController)
            } else if GKLocalPlayer.local.isAuthenticated {
                self?.isAuthenticated = true
                self?.localPlayer = GKLocalPlayer.local
                call?.resolve([
                    "authenticated": true,
                    "playerID": GKLocalPlayer.local.gamePlayerID
                ])
            } else {
                call?.reject("Authentication failed", nil, error)
            }
        }
    }

    @objc func isAuthenticated(_ call: CAPPluginCall) {
        call.resolve([
            "authenticated": isAuthenticated,
            "playerID": localPlayer?.gamePlayerID ?? ""
        ])
    }

    // MARK: - Comprehensive Stats Sync

    @objc func syncStatsWithGameCenter(_ call: CAPPluginCall) {
        guard isAuthenticated else {
            call.reject("Not authenticated with Game Center")
            return
        }

        guard !syncInProgress else {
            call.reject("Sync already in progress")
            return
        }

        syncInProgress = true

        Task {
            do {
                let result = try await performComprehensiveSync()
                call.resolve(result)
            } catch {
                call.reject("Sync failed", nil, error)
            }

            syncInProgress = false
        }
    }

    private func performComprehensiveSync() async throws -> [String: Any] {
        var aggregatedStats: [String: Any] = [:]

        // Fetch from all leaderboards
        let leaderboardStats = try await fetchAllLeaderboardStats()
        aggregatedStats.merge(leaderboardStats) { _, new in new }

        // Fetch achievements
        let achievements = try await fetchAchievements()
        aggregatedStats["achievements"] = achievements

        // Calculate derived stats
        aggregatedStats["syncTimestamp"] = Date().timeIntervalSince1970
        aggregatedStats["source"] = "gameCenter"

        return ["stats": aggregatedStats]
    }

    // MARK: - Leaderboard Operations

    @objc func submitScore(_ call: CAPPluginCall) {
        guard let leaderboardKey = call.getString("leaderboardID"),
              let score = call.getInt("score"),
              let leaderboardID = leaderboardIDs[leaderboardKey] else {
            call.reject("Invalid parameters")
            return
        }

        guard isAuthenticated else {
            call.reject("Not authenticated")
            return
        }

        Task {
            do {
                try await submitScoreToLeaderboard(score: score, leaderboardID: leaderboardID)

                // Also submit to other relevant leaderboards
                if leaderboardKey == "gamesPlayed" {
                    try await updateWinRate(call.getInt("wins") ?? 0, played: score)
                }

                call.resolve(["success": true])
            } catch {
                call.reject("Failed to submit score", nil, error)
            }
        }
    }

    private func submitScoreToLeaderboard(score: Int, leaderboardID: String) async throws {
        try await GKLeaderboard.submitScore(
            score,
            context: 0,
            player: GKLocalPlayer.local,
            leaderboardIDs: [leaderboardID]
        )

        print("[GameCenter] Score \(score) submitted to \(leaderboardID)")
    }

    private func updateWinRate(_ wins: Int, played: Int) async throws {
        guard played > 0 else { return }

        let winRate = Int((Double(wins) / Double(played)) * 100)

        if let leaderboardID = leaderboardIDs["winRate"] {
            try await submitScoreToLeaderboard(score: winRate, leaderboardID: leaderboardID)
        }
    }

    @objc func fetchLeaderboardScores(_ call: CAPPluginCall) {
        guard isAuthenticated else {
            call.reject("Not authenticated")
            return
        }

        Task {
            do {
                let scores = try await fetchAllLeaderboardStats()
                call.resolve(["scores": scores])
            } catch {
                call.reject("Failed to fetch scores", nil, error)
            }
        }
    }

    private func fetchAllLeaderboardStats() async throws -> [String: Any] {
        var stats: [String: Any] = [:]

        // Check cache
        if let lastFetch = lastFetchTime,
           Date().timeIntervalSince(lastFetch) < cacheExpiration,
           !cachedLeaderboards.isEmpty {
            // Use cached data
            for (key, leaderboard) in cachedLeaderboards {
                if let entry = try? await leaderboard.loadEntries(
                    for: [GKLocalPlayer.local],
                    timeScope: .allTime
                ).1.first {
                    stats[key] = Int(entry.score)
                }
            }
            return stats
        }

        // Fetch fresh data
        let leaderboardIDs = Array(self.leaderboardIDs.values)
        let leaderboards = try await GKLeaderboard.loadLeaderboards(IDs: leaderboardIDs)

        for leaderboard in leaderboards {
            // Find the key for this leaderboard
            if let key = self.leaderboardIDs.first(where: { $0.value == leaderboard.baseLeaderboardID })?.key {
                cachedLeaderboards[key] = leaderboard

                // Load player's score
                let (entry, _, _) = try await leaderboard.loadEntries(
                    for: [GKLocalPlayer.local],
                    timeScope: .allTime
                )

                if let score = entry?.score {
                    stats[key] = Int(score)
                }
            }
        }

        lastFetchTime = Date()

        return stats
    }

    // MARK: - Achievement Operations

    @objc func reportAchievement(_ call: CAPPluginCall) {
        guard let achievementKey = call.getString("achievementID"),
              let achievementID = achievementIDs[achievementKey] else {
            call.reject("Invalid achievement ID")
            return
        }

        let percentComplete = call.getDouble("percentComplete") ?? 100.0

        guard isAuthenticated else {
            call.reject("Not authenticated")
            return
        }

        Task {
            do {
                try await reportAchievementProgress(
                    achievementID: achievementID,
                    percentComplete: percentComplete
                )
                call.resolve(["success": true])
            } catch {
                call.reject("Failed to report achievement", nil, error)
            }
        }
    }

    private func reportAchievementProgress(achievementID: String, percentComplete: Double) async throws {
        let achievement = GKAchievement(identifier: achievementID)
        achievement.percentComplete = percentComplete
        achievement.showsCompletionBanner = true

        try await GKAchievement.report([achievement])

        print("[GameCenter] Achievement \(achievementID) reported: \(percentComplete)%")

        // Update cache
        cachedAchievements.removeAll { $0.identifier == achievementID }
        cachedAchievements.append(achievement)
    }

    @objc func fetchAchievements(_ call: CAPPluginCall) {
        guard isAuthenticated else {
            call.reject("Not authenticated")
            return
        }

        Task {
            do {
                let achievements = try await fetchAchievements()
                call.resolve(["achievements": achievements])
            } catch {
                call.reject("Failed to fetch achievements", nil, error)
            }
        }
    }

    private func fetchAchievements() async throws -> [[String: Any]] {
        let achievements = try await GKAchievement.loadAchievements()

        cachedAchievements = achievements ?? []

        return cachedAchievements.map { achievement in
            [
                "identifier": achievement.identifier,
                "percentComplete": achievement.percentComplete,
                "isCompleted": achievement.isCompleted,
                "lastReportedDate": achievement.lastReportedDate?.timeIntervalSince1970 ?? 0
            ]
        }
    }

    // MARK: - Conflict Resolution

    @objc func resolveConflict(_ call: CAPPluginCall) {
        guard let local = call.getObject("local"),
              let remote = call.getObject("remote") else {
            call.reject("Local and remote data required")
            return
        }

        let resolved = resolveGameCenterConflict(local: local, remote: remote)
        call.resolve(["resolved": resolved])
    }

    private func resolveGameCenterConflict(local: [String: Any], remote: [String: Any]) -> [String: Any] {
        var resolved: [String: Any] = [:]

        // For Game Center data, always take the maximum values
        // as scores are cumulative and never decrease

        if let localPlayed = local["gamesPlayed"] as? Int,
           let remotePlayed = remote["gamesPlayed"] as? Int {
            resolved["gamesPlayed"] = max(localPlayed, remotePlayed)
        }

        if let localWins = local["totalWins"] as? Int,
           let remoteWins = remote["totalWins"] as? Int {
            resolved["totalWins"] = max(localWins, remoteWins)
        }

        if let localStreak = local["dailyStreak"] as? Int,
           let remoteStreak = remote["dailyStreak"] as? Int {
            // For current streak, check dates if available
            if let localDate = local["lastStreakDate"] as? String,
               let remoteDate = remote["lastStreakDate"] as? String {
                resolved["dailyStreak"] = localDate > remoteDate ? localStreak : remoteStreak
                resolved["lastStreakDate"] = localDate > remoteDate ? localDate : remoteDate
            } else {
                resolved["dailyStreak"] = max(localStreak, remoteStreak)
            }
        }

        if let localBest = local["bestStreak"] as? Int,
           let remoteBest = remote["bestStreak"] as? Int {
            resolved["bestStreak"] = max(localBest, remoteBest)
        }

        // Merge achievements - union of both
        if let localAchievements = local["achievements"] as? [[String: Any]],
           let remoteAchievements = remote["achievements"] as? [[String: Any]] {
            resolved["achievements"] = mergeAchievements(
                local: localAchievements,
                remote: remoteAchievements
            )
        }

        return resolved
    }

    private func mergeAchievements(local: [[String: Any]], remote: [[String: Any]]) -> [[String: Any]] {
        var merged: [String: [String: Any]] = [:]

        // Add all achievements from both sources
        for achievement in local + remote {
            guard let identifier = achievement["identifier"] as? String else { continue }

            if let existing = merged[identifier] {
                // Keep the one with higher progress
                let existingPercent = existing["percentComplete"] as? Double ?? 0
                let newPercent = achievement["percentComplete"] as? Double ?? 0

                if newPercent > existingPercent {
                    merged[identifier] = achievement
                }
            } else {
                merged[identifier] = achievement
            }
        }

        return Array(merged.values)
    }

    // MARK: - Batch Operations

    @objc func batchSubmitScores(_ call: CAPPluginCall) {
        guard let scores = call.getArray("scores", [String: Any].self) else {
            call.reject("Scores array required")
            return
        }

        guard isAuthenticated else {
            call.reject("Not authenticated")
            return
        }

        Task {
            var successCount = 0
            var failedCount = 0

            for scoreData in scores {
                guard let leaderboardKey = scoreData["leaderboardID"] as? String,
                      let score = scoreData["score"] as? Int,
                      let leaderboardID = leaderboardIDs[leaderboardKey] else {
                    failedCount += 1
                    continue
                }

                do {
                    try await submitScoreToLeaderboard(score: score, leaderboardID: leaderboardID)
                    successCount += 1
                } catch {
                    failedCount += 1
                    print("[GameCenter] Failed to submit score to \(leaderboardID): \(error)")
                }
            }

            call.resolve([
                "success": failedCount == 0,
                "submitted": successCount,
                "failed": failedCount
            ])
        }
    }

    // MARK: - Error Recovery

    private func retryWithExponentialBackoff<T>(
        operation: () async throws -> T,
        maxRetries: Int = 3
    ) async throws -> T {
        var lastError: Error?

        for attempt in 0..<maxRetries {
            do {
                return try await operation()
            } catch {
                lastError = error

                // Check if error is retryable
                if !isRetryableError(error) {
                    throw error
                }

                // Exponential backoff
                let delay = pow(2.0, Double(attempt))
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
        }

        throw lastError ?? NSError(domain: "GameCenter", code: -1, userInfo: nil)
    }

    private func isRetryableError(_ error: Error) -> Bool {
        let nsError = error as NSError

        // Network errors are retryable
        if nsError.domain == NSURLErrorDomain {
            return true
        }

        // Specific Game Center errors that are retryable
        if nsError.domain == GKErrorDomain {
            switch nsError.code {
            case GKError.networkFailure.rawValue,
                 GKError.unknown.rawValue:
                return true
            default:
                return false
            }
        }

        return false
    }

    // MARK: - Cache Management

    @objc func clearCache(_ call: CAPPluginCall) {
        cachedLeaderboards.removeAll()
        cachedAchievements.removeAll()
        lastFetchTime = nil

        call.resolve(["success": true])
    }

    private func loadCachedData() async {
        do {
            // Preload leaderboards
            _ = try await fetchAllLeaderboardStats()

            // Preload achievements
            _ = try await fetchAchievements()

            print("[GameCenter] Cache loaded successfully")
        } catch {
            print("[GameCenter] Failed to load cache: \(error)")
        }
    }

    // MARK: - Debug & Testing

    @objc func resetAchievements(_ call: CAPPluginCall) {
        #if DEBUG
        guard isAuthenticated else {
            call.reject("Not authenticated")
            return
        }

        Task {
            do {
                try await GKAchievement.resetAchievements()
                cachedAchievements.removeAll()
                call.resolve(["success": true])
            } catch {
                call.reject("Failed to reset achievements", nil, error)
            }
        }
        #else
        call.reject("Only available in debug builds")
        #endif
    }

    @objc func getDebugInfo(_ call: CAPPluginCall) {
        call.resolve([
            "authenticated": isAuthenticated,
            "playerID": localPlayer?.gamePlayerID ?? "",
            "displayName": localPlayer?.displayName ?? "",
            "cacheSize": cachedLeaderboards.count + cachedAchievements.count,
            "lastFetch": lastFetchTime?.timeIntervalSince1970 ?? 0,
            "syncInProgress": syncInProgress
        ])
    }
}