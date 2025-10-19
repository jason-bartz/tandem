import Foundation
import Capacitor
import CloudKit

/**
 * CloudKit Sync Plugin for Tandem
 *
 * Provides iCloud sync capabilities for game data, stats, and preferences
 * Uses private CloudKit database for user-specific data
 * Implements conflict resolution and offline support
 */
@objc(CloudKitSyncPlugin)
public class CloudKitSyncPlugin: CAPPlugin {

    // MARK: - Properties

    // Use the default container (reads from entitlements)
    // This is more reliable than hardcoding the identifier
    private let container = CKContainer.default()
    private var privateDatabase: CKDatabase {
        return container.privateCloudDatabase
    }

    // MARK: - Initialization

    override public func load() {
        super.load()
        // Log container information for debugging
        print("CloudKit container identifier: \(container.containerIdentifier ?? "nil")")

        // Log which environment we're using
        #if DEBUG
        print("CloudKit environment: Development (running from Xcode)")
        #else
        print("CloudKit environment: Production (release build)")
        #endif

        // Verify the container identifier matches our expectations
        if let identifier = container.containerIdentifier {
            if identifier != "iCloud.com.tandemdaily.app" {
                print("⚠️ WARNING: Container identifier mismatch!")
                print("Expected: iCloud.com.tandemdaily.app")
                print("Got: \(identifier)")
            }
        }

        container.accountStatus { status, error in
            if let error = error {
                print("CloudKit account status error: \(error.localizedDescription)")
            } else {
                print("CloudKit account status: \(self.accountStatusString(status))")
            }
        }
    }

    private let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString

    // For syncing across devices, we need a user-specific identifier
    // This will be fetched from CloudKit account
    private var userRecordID: CKRecord.ID?
    private var cachedUserID: String?

    // Record type names
    private enum RecordType: String {
        case userStats = "UserStats"
        case puzzleResult = "PuzzleResult"
        case puzzleProgress = "PuzzleProgress"
        case userPreferences = "UserPreferences"
    }

    // MARK: - User ID Management

    private func getUserID(completion: @escaping (String) -> Void) {
        // Return cached ID if available
        if let cached = cachedUserID {
            completion(cached)
            return
        }

        // Fetch user record ID from CloudKit
        container.fetchUserRecordID { recordID, error in
            if let recordID = recordID {
                // Store the user record ID
                self.userRecordID = recordID
                // Create a stable user ID from the record name
                let userID = recordID.recordName.replacingOccurrences(of: "_", with: "")
                self.cachedUserID = userID
                completion(userID)
            } else {
                // Fallback to device ID if CloudKit not available
                print("CloudKit user record fetch failed, using device ID as fallback")
                let fallbackID = self.deviceId
                self.cachedUserID = fallbackID
                completion(fallbackID)
            }
        }
    }

    // MARK: - Account Status

    @objc func checkAccountStatus(_ call: CAPPluginCall) {
        container.accountStatus { status, error in
            if let error = error {
                call.reject("Failed to check iCloud account status", nil, error)
                return
            }

            let available = status == .available
            call.resolve([
                "available": available,
                "status": self.accountStatusString(status)
            ])
        }
    }

    private func accountStatusString(_ status: CKAccountStatus) -> String {
        switch status {
        case .available:
            return "available"
        case .noAccount:
            return "noAccount"
        case .restricted:
            return "restricted"
        case .couldNotDetermine:
            return "couldNotDetermine"
        case .temporarilyUnavailable:
            return "temporarilyUnavailable"
        @unknown default:
            return "unknown"
        }
    }

    // MARK: - User Stats Sync

    @objc func syncStats(_ call: CAPPluginCall) {
        guard let stats = call.getObject("stats") else {
            call.reject("Stats object is required")
            return
        }

        // Use a single record for all devices of the same user
        // The record name is just "userStats" - CloudKit handles user scoping automatically
        let recordID = CKRecord.ID(recordName: "userStats_primary")

        // First, try to fetch existing record to merge stats properly
        privateDatabase.fetch(withRecordID: recordID) { existingRecord, fetchError in
            let record: CKRecord

            if let existingRecord = existingRecord {
                // Update existing record
                record = existingRecord
            } else {
                // Create new record
                record = CKRecord(recordType: RecordType.userStats.rawValue, recordID: recordID)
            }

            // Get existing values for proper merging
            let existingPlayed = (record["played"] as? Int64) ?? 0
            let existingWins = (record["wins"] as? Int64) ?? 0
            let existingBestStreak = (record["bestStreak"] as? Int64) ?? 0
            let existingCurrentStreak = (record["currentStreak"] as? Int64) ?? 0
            let existingLastStreakDate = record["lastStreakDate"] as? String
            let existingModifiedAt = record["modifiedAt"] as? Date ?? Date.distantPast

            let newPlayed = Int64((stats["played"] as? Int) ?? 0)
            let newWins = Int64((stats["wins"] as? Int) ?? 0)
            let newCurrentStreak = Int64((stats["currentStreak"] as? Int) ?? 0)
            let newBestStreak = Int64((stats["bestStreak"] as? Int) ?? 0)
            let newLastStreakDate = stats["lastStreakDate"] as? String

            // Merge logic: take the maximum values (most advanced progress)
            record["played"] = max(existingPlayed, newPlayed)
            record["wins"] = max(existingWins, newWins)
            record["bestStreak"] = max(existingBestStreak, newBestStreak)

            // For current streak, use the one with the most recent date
            if let existingDate = existingLastStreakDate, let newDate = newLastStreakDate {
                if newDate >= existingDate {
                    record["currentStreak"] = newCurrentStreak
                    record["lastStreakDate"] = newDate
                } else {
                    record["currentStreak"] = existingCurrentStreak
                    record["lastStreakDate"] = existingDate
                }
            } else if newLastStreakDate != nil {
                record["currentStreak"] = newCurrentStreak
                record["lastStreakDate"] = newLastStreakDate
            } else {
                record["currentStreak"] = existingCurrentStreak
                record["lastStreakDate"] = existingLastStreakDate
            }

            record["lastSyncedDeviceId"] = self.deviceId
            record["modifiedAt"] = Date()

            self.privateDatabase.save(record) { savedRecord, error in
                if let error = error {
                    call.reject("Failed to sync stats", nil, error)
                    return
                }

                // Return the merged stats back to the app
                if let savedRecord = savedRecord {
                    call.resolve([
                        "success": true,
                        "recordName": savedRecord.recordID.recordName,
                        "mergedStats": [
                            "played": Int(savedRecord["played"] as? Int64 ?? 0),
                            "wins": Int(savedRecord["wins"] as? Int64 ?? 0),
                            "currentStreak": Int(savedRecord["currentStreak"] as? Int64 ?? 0),
                            "bestStreak": Int(savedRecord["bestStreak"] as? Int64 ?? 0),
                            "lastStreakDate": savedRecord["lastStreakDate"] as? String
                        ]
                    ])
                } else {
                    call.resolve(["success": true])
                }
            }
        }
    }

    @objc func fetchStats(_ call: CAPPluginCall) {
        // First, try to fetch the single primary user stats record
        let recordID = CKRecord.ID(recordName: "userStats_primary")

        privateDatabase.fetch(withRecordID: recordID) { record, error in
            if let error = error {
                let ckError = error as NSError

                // Check if it's a "record not found" error
                if ckError.code == 11 { // CKError.unknownItem.rawValue
                    print("CloudKit fetchStats: No primary record found, checking for legacy device records...")

                    // Try to fetch legacy device-specific records and migrate them
                    self.fetchAndMigrateLegacyStats(call)
                    return
                }

                print("CloudKit fetchStats error: \(error.localizedDescription)")
                print("CloudKit error code: \(ckError.code), domain: \(ckError.domain)")
                call.reject("Failed to fetch stats: \(error.localizedDescription)")
                return
            }

            guard let record = record else {
                print("CloudKit fetchStats: No record found")
                // Try migration as fallback
                self.fetchAndMigrateLegacyStats(call)
                return
            }

            print("CloudKit fetchStats: Found user stats record")

            // Extract stats from the record
            let stats: [String: Any] = [
                "played": Int(record["played"] as? Int64 ?? 0),
                "wins": Int(record["wins"] as? Int64 ?? 0),
                "currentStreak": Int(record["currentStreak"] as? Int64 ?? 0),
                "bestStreak": Int(record["bestStreak"] as? Int64 ?? 0),
                "lastStreakDate": record["lastStreakDate"] as? String,
                "lastSyncedDeviceId": record["lastSyncedDeviceId"] as? String,
                "modifiedAt": (record["modifiedAt"] as? Date)?.timeIntervalSince1970
            ]

            call.resolve(["stats": stats])
        }
    }

    // MARK: - Legacy Stats Migration

    private func fetchAndMigrateLegacyStats(_ call: CAPPluginCall) {
        // Query for all legacy device-specific records (looking for any userStats records with deviceId)
        let predicate = NSPredicate(format: "deviceId != %@", "")
        let query = CKQuery(recordType: RecordType.userStats.rawValue, predicate: predicate)

        privateDatabase.perform(query, inZoneWith: nil) { records, error in
            if let error = error {
                print("CloudKit migration query error: \(error.localizedDescription)")
                // If query fails, try fetching this device's specific record
                self.fetchDeviceSpecificRecord(call)
                return
            }

            guard let records = records, !records.isEmpty else {
                print("CloudKit: No legacy records found")
                call.resolve(["stats": nil])
                return
            }

            print("CloudKit: Found \(records.count) legacy device record(s), migrating...")

            // Merge all device records
            var mergedStats: [String: Any] = [
                "played": 0,
                "wins": 0,
                "currentStreak": 0,
                "bestStreak": 0,
                "lastStreakDate": nil as String?
            ]

            var latestDate: Date?
            var mostRecentStreak: (current: Int, date: String?)?

            for record in records {
                let played = Int(record["played"] as? Int64 ?? 0)
                let wins = Int(record["wins"] as? Int64 ?? 0)
                let currentStreak = Int(record["currentStreak"] as? Int64 ?? 0)
                let bestStreak = Int(record["bestStreak"] as? Int64 ?? 0)
                let lastStreakDate = record["lastStreakDate"] as? String
                let modifiedAt = record["modifiedAt"] as? Date

                // Take maximum values for cumulative stats
                mergedStats["played"] = max(mergedStats["played"] as! Int, played)
                mergedStats["wins"] = max(mergedStats["wins"] as! Int, wins)
                mergedStats["bestStreak"] = max(mergedStats["bestStreak"] as! Int, bestStreak)

                // For current streak, use the most recent one
                if let modDate = modifiedAt {
                    if latestDate == nil || modDate > latestDate! {
                        latestDate = modDate
                        mostRecentStreak = (currentStreak, lastStreakDate)
                    }
                }
            }

            // Apply the most recent streak
            if let streak = mostRecentStreak {
                mergedStats["currentStreak"] = streak.current
                mergedStats["lastStreakDate"] = streak.date
            }

            print("CloudKit: Migration complete, merged stats: \(mergedStats)")

            // Save the merged stats to the new primary record
            self.saveMigratedStats(mergedStats, call: call)
        }
    }

    private func fetchDeviceSpecificRecord(_ call: CAPPluginCall) {
        // Last resort: try to fetch this specific device's old record
        let legacyRecordID = CKRecord.ID(recordName: "userStats_\(deviceId)")

        privateDatabase.fetch(withRecordID: legacyRecordID) { record, error in
            if let error = error {
                print("CloudKit: No device-specific record found: \(error.localizedDescription)")
                call.resolve(["stats": nil])
                return
            }

            guard let record = record else {
                call.resolve(["stats": nil])
                return
            }

            print("CloudKit: Found device-specific record, migrating...")

            let stats: [String: Any] = [
                "played": Int(record["played"] as? Int64 ?? 0),
                "wins": Int(record["wins"] as? Int64 ?? 0),
                "currentStreak": Int(record["currentStreak"] as? Int64 ?? 0),
                "bestStreak": Int(record["bestStreak"] as? Int64 ?? 0),
                "lastStreakDate": record["lastStreakDate"] as? String
            ]

            // Save to new primary record
            self.saveMigratedStats(stats, call: call)
        }
    }

    private func saveMigratedStats(_ stats: [String: Any], call: CAPPluginCall) {
        // Create the new unified record
        let recordID = CKRecord.ID(recordName: "userStats_primary")
        let record = CKRecord(recordType: RecordType.userStats.rawValue, recordID: recordID)

        record["played"] = Int64(stats["played"] as? Int ?? 0)
        record["wins"] = Int64(stats["wins"] as? Int ?? 0)
        record["currentStreak"] = Int64(stats["currentStreak"] as? Int ?? 0)
        record["bestStreak"] = Int64(stats["bestStreak"] as? Int ?? 0)
        record["lastStreakDate"] = stats["lastStreakDate"] as? String
        record["lastSyncedDeviceId"] = deviceId
        record["modifiedAt"] = Date()
        record["migratedAt"] = Date() // Track that this was migrated

        privateDatabase.save(record) { savedRecord, error in
            if let error = error {
                print("CloudKit: Migration save failed: \(error.localizedDescription)")
                // Still return the stats we found
                call.resolve(["stats": stats])
                return
            }

            print("CloudKit: Migration successful, stats saved to primary record")
            call.resolve(["stats": stats])
        }
    }

    // MARK: - Puzzle Results Sync

    @objc func syncPuzzleResult(_ call: CAPPluginCall) {
        guard let date = call.getString("date"),
              let result = call.getObject("result") else {
            call.reject("Date and result are required")
            return
        }

        // Use user ID instead of device ID for cross-device sync
        getUserID { userID in
            let recordID = CKRecord.ID(recordName: "puzzleResult_\(date)_\(userID)")
            let record = CKRecord(recordType: RecordType.puzzleResult.rawValue, recordID: recordID)

            record["date"] = date
            // Store won as Int64 for CloudKit
            record["won"] = Int64((result["won"] as? Bool ?? false) ? 1 : 0)
            record["mistakes"] = Int64((result["mistakes"] as? Int) ?? 0)
            record["solved"] = Int64((result["solved"] as? Int) ?? 0)
            record["hintsUsed"] = Int64((result["hintsUsed"] as? Int) ?? 0)
            // Store theme as Int64 if it's a number, otherwise as String
            if let themeString = result["theme"] as? String, let themeInt = Int64(themeString) {
                record["theme"] = themeInt
            } else {
                record["theme"] = result["theme"] as? String
            }
            record["timestamp"] = result["timestamp"] as? String
            record["deviceId"] = self.deviceId  // Still store device ID for tracking
            // userID is already part of the record name, no need to store separately

            self.privateDatabase.save(record) { savedRecord, error in
                if let error = error {
                    call.reject("Failed to sync puzzle result", nil, error)
                    return
                }

                call.resolve(["success": true])
            }
        }
    }

    @objc func fetchPuzzleResults(_ call: CAPPluginCall) {
        let startDate = call.getString("startDate")
        let endDate = call.getString("endDate")

        var predicate: NSPredicate
        if let start = startDate, let end = endDate {
            predicate = NSPredicate(format: "date >= %@ AND date <= %@", start, end)
        } else {
            // Query for all records where deviceId exists
            predicate = NSPredicate(format: "deviceId != %@", "")
        }

        let query = CKQuery(recordType: RecordType.puzzleResult.rawValue, predicate: predicate)

        privateDatabase.perform(query, inZoneWith: nil) { records, error in
            if let error = error {
                print("CloudKit fetchPuzzleResults error: \(error.localizedDescription)")
                call.reject("Failed to fetch puzzle results: \(error.localizedDescription)")
                return
            }

            var results: [String: [String: Any]] = [:]

            for record in records ?? [] {
                guard let date = record["date"] as? String else { continue }

                let timestamp = record["timestamp"] as? String ?? ""

                // Keep most recent result per date
                if let existing = results[date],
                   let existingTimestamp = existing["timestamp"] as? String,
                   existingTimestamp > timestamp {
                    continue
                }

                // Handle both Bool and Int64 for won field
                let wonValue = record["won"]
                let won: Bool = {
                    if let boolValue = wonValue as? Bool {
                        return boolValue
                    } else if let intValue = wonValue as? Int64 {
                        return intValue != 0
                    } else if let intValue = wonValue as? Int {
                        return intValue != 0
                    }
                    return false
                }()

                let mistakes: Int = {
                    if let val = record["mistakes"] as? Int64 { return Int(val) }
                    if let val = record["mistakes"] as? Int { return val }
                    return 0
                }()
                let solved: Int = {
                    if let val = record["solved"] as? Int64 { return Int(val) }
                    if let val = record["solved"] as? Int { return val }
                    return 0
                }()
                let hintsUsed: Int = {
                    if let val = record["hintsUsed"] as? Int64 { return Int(val) }
                    if let val = record["hintsUsed"] as? Int { return val }
                    return 0
                }()
                let theme: String = {
                    if let val = record["theme"] as? Int64 { return String(val) }
                    if let val = record["theme"] as? String { return val }
                    return ""
                }()

                results[date] = [
                    "date": date,
                    "won": won,
                    "mistakes": mistakes,
                    "solved": solved,
                    "hintsUsed": hintsUsed,
                    "theme": theme,
                    "timestamp": timestamp
                ]
            }

            call.resolve(["results": Array(results.values)])
        }
    }

    // MARK: - Puzzle Progress Sync

    @objc func syncPuzzleProgress(_ call: CAPPluginCall) {
        guard let date = call.getString("date"),
              let progress = call.getObject("progress") else {
            call.reject("Date and progress are required")
            return
        }

        // Use user ID instead of device ID for cross-device sync
        getUserID { userID in
            let recordID = CKRecord.ID(recordName: "puzzleProgress_\(date)_\(userID)")
            let record = CKRecord(recordType: RecordType.puzzleProgress.rawValue, recordID: recordID)

            record["date"] = date
            // Store started as Int64 for CloudKit (1 for true, 0 for false)
            record["started"] = Int64((progress["started"] as? Bool ?? false) ? 1 : 0)
            record["solved"] = Int64((progress["solved"] as? Int) ?? 0)
            record["mistakes"] = Int64((progress["mistakes"] as? Int) ?? 0)
            record["hintsUsed"] = Int64((progress["hintsUsed"] as? Int) ?? 0)
            record["lastUpdated"] = progress["lastUpdated"] as? String ?? ISO8601DateFormatter().string(from: Date())
            record["deviceId"] = self.deviceId  // Still store device ID for tracking
            // userID is already part of the record name, no need to store separately

            self.privateDatabase.save(record) { savedRecord, error in
                if let error = error {
                    call.reject("Failed to sync puzzle progress", nil, error)
                    return
                }

                call.resolve(["success": true])
            }
        }
    }

    @objc func fetchPuzzleProgress(_ call: CAPPluginCall) {
        guard let date = call.getString("date") else {
            call.reject("Date is required")
            return
        }

        let predicate = NSPredicate(format: "date == %@", date)
        let query = CKQuery(recordType: RecordType.puzzleProgress.rawValue, predicate: predicate)
        // Don't use sort descriptors

        privateDatabase.perform(query, inZoneWith: nil) { records, error in
            if let error = error {
                call.reject("Failed to fetch puzzle progress", nil, error)
                return
            }

            guard let records = records, !records.isEmpty else {
                call.resolve(["progress": nil])
                return
            }

            // Sort by lastUpdated client-side
            let sortedRecords = records.sorted { record1, record2 in
                let ts1 = record1["lastUpdated"] as? String ?? ""
                let ts2 = record2["lastUpdated"] as? String ?? ""
                return ts1 > ts2
            }

            guard let record = sortedRecords.first else {
                call.resolve(["progress": nil])
                return
            }

            // Handle started as Int64 or Bool
            let startedValue: Bool = {
                if let intValue = record["started"] as? Int64 {
                    return intValue != 0
                } else if let intValue = record["started"] as? Int {
                    return intValue != 0
                } else if let boolValue = record["started"] as? Bool {
                    return boolValue
                }
                return false
            }()

            let solved: Int = {
                if let val = record["solved"] as? Int64 { return Int(val) }
                if let val = record["solved"] as? Int { return val }
                return 0
            }()
            let mistakes: Int = {
                if let val = record["mistakes"] as? Int64 { return Int(val) }
                if let val = record["mistakes"] as? Int { return val }
                return 0
            }()
            let hintsUsed: Int = {
                if let val = record["hintsUsed"] as? Int64 { return Int(val) }
                if let val = record["hintsUsed"] as? Int { return val }
                return 0
            }()

            let progress: [String: Any] = [
                "started": startedValue,
                "solved": solved,
                "mistakes": mistakes,
                "hintsUsed": hintsUsed,
                "lastUpdated": record["lastUpdated"] as? String ?? ""
            ]

            call.resolve(["progress": progress])
        }
    }

    // MARK: - User Preferences Sync

    @objc func syncPreferences(_ call: CAPPluginCall) {
        guard let preferences = call.getObject("preferences") else {
            call.reject("Preferences object is required")
            return
        }

        let recordID = CKRecord.ID(recordName: "userPreferences_\(deviceId)")
        let record = CKRecord(recordType: RecordType.userPreferences.rawValue, recordID: recordID)

        record["theme"] = preferences["theme"] as? String
        record["themeMode"] = preferences["themeMode"] as? String
        // Store highContrast as String for CloudKit
        record["highContrast"] = (preferences["highContrast"] as? Bool ?? false) ? "true" : "false"
        // Store sound as Int64 for CloudKit
        record["sound"] = Int64((preferences["sound"] as? Bool ?? true) ? 1 : 0)
        record["deviceId"] = deviceId
        record["modifiedAt"] = Date()

        privateDatabase.save(record) { savedRecord, error in
            if let error = error {
                call.reject("Failed to sync preferences", nil, error)
                return
            }

            call.resolve(["success": true])
        }
    }

    @objc func fetchPreferences(_ call: CAPPluginCall) {
        // Query for all records where deviceId exists
        let predicate = NSPredicate(format: "deviceId != %@", "")
        let query = CKQuery(recordType: RecordType.userPreferences.rawValue, predicate: predicate)

        privateDatabase.perform(query, inZoneWith: nil) { records, error in
            if let error = error {
                print("CloudKit fetchPreferences error: \(error.localizedDescription)")
                call.reject("Failed to fetch preferences: \(error.localizedDescription)")
                return
            }

            guard let records = records, !records.isEmpty else {
                print("CloudKit fetchPreferences: No records found")
                call.resolve(["preferences": nil])
                return
            }

            print("CloudKit fetchPreferences: Found \(records.count) record(s)")

            // Sort by modifiedAt and take the most recent
            let sortedRecords = records.sorted { record1, record2 in
                let date1 = record1["modifiedAt"] as? Date ?? Date.distantPast
                let date2 = record2["modifiedAt"] as? Date ?? Date.distantPast
                return date1 > date2
            }

            guard let record = sortedRecords.first else {
                call.resolve(["preferences": nil])
                return
            }

            // Handle highContrast as String (stored as "true"/"false" in CloudKit)
            let highContrastValue: Bool = {
                if let stringValue = record["highContrast"] as? String {
                    return stringValue == "true" || stringValue == "1"
                } else if let boolValue = record["highContrast"] as? Bool {
                    return boolValue
                }
                return false
            }()

            // Handle sound as Int64 or Bool
            let soundValue: Bool = {
                if let intValue = record["sound"] as? Int64 {
                    return intValue != 0
                } else if let intValue = record["sound"] as? Int {
                    return intValue != 0
                } else if let boolValue = record["sound"] as? Bool {
                    return boolValue
                }
                return true
            }()

            let preferences: [String: Any] = [
                "theme": record["theme"] as? String ?? "light",
                "themeMode": record["themeMode"] as? String ?? "auto",
                "highContrast": highContrastValue,
                "sound": soundValue
            ]

            call.resolve(["preferences": preferences])
        }
    }

    // MARK: - Full Sync

    @objc func performFullSync(_ call: CAPPluginCall) {
        // This would trigger a comprehensive sync of all data types
        // For now, we'll resolve with success and let JS layer coordinate individual syncs
        call.resolve(["success": true, "message": "Full sync initiated"])
    }

    // MARK: - Clear Cloud Data

    @objc func clearCloudData(_ call: CAPPluginCall) {
        let group = DispatchGroup()
        var errors: [Error] = []

        // Delete all record types for this device
        let recordTypes = [
            RecordType.userStats.rawValue,
            RecordType.puzzleResult.rawValue,
            RecordType.puzzleProgress.rawValue,
            RecordType.userPreferences.rawValue
        ]

        for recordType in recordTypes {
            group.enter()

            let predicate = NSPredicate(format: "deviceId == %@", deviceId)
            let query = CKQuery(recordType: recordType, predicate: predicate)

            privateDatabase.perform(query, inZoneWith: nil) { records, error in
                defer { group.leave() }

                if let error = error {
                    errors.append(error)
                    return
                }

                guard let records = records, !records.isEmpty else { return }

                let recordIDs = records.map { $0.recordID }
                let operation = CKModifyRecordsOperation(recordsToSave: nil, recordIDsToDelete: recordIDs)

                operation.modifyRecordsCompletionBlock = { _, deletedRecordIDs, error in
                    if let error = error {
                        errors.append(error)
                    }
                }

                self.privateDatabase.add(operation)
            }
        }

        group.notify(queue: .main) {
            if !errors.isEmpty {
                call.reject("Failed to clear some cloud data", nil, errors.first)
            } else {
                call.resolve(["success": true])
            }
        }
    }
}
