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

    private let container = CKContainer(identifier: "iCloud.com.tandemdaily.app")
    private var privateDatabase: CKDatabase {
        return container.privateCloudDatabase
    }

    private let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString

    // Record type names
    private enum RecordType: String {
        case userStats = "UserStats"
        case puzzleResult = "PuzzleResult"
        case puzzleProgress = "PuzzleProgress"
        case userPreferences = "UserPreferences"
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

        let recordID = CKRecord.ID(recordName: "userStats_\(deviceId)")
        let record = CKRecord(recordType: RecordType.userStats.rawValue, recordID: recordID)

        record["played"] = (stats["played"] as? Int) ?? 0
        record["wins"] = (stats["wins"] as? Int) ?? 0
        record["currentStreak"] = (stats["currentStreak"] as? Int) ?? 0
        record["bestStreak"] = (stats["bestStreak"] as? Int) ?? 0
        record["lastStreakDate"] = stats["lastStreakDate"] as? String
        record["deviceId"] = deviceId
        record["modifiedAt"] = Date()

        privateDatabase.save(record) { savedRecord, error in
            if let error = error {
                call.reject("Failed to sync stats", nil, error)
                return
            }

            call.resolve([
                "success": true,
                "recordName": savedRecord?.recordID.recordName ?? ""
            ])
        }
    }

    @objc func fetchStats(_ call: CAPPluginCall) {
        let query = CKQuery(recordType: RecordType.userStats.rawValue, predicate: NSPredicate(value: true))
        query.sortDescriptors = [NSSortDescriptor(key: "modifiedAt", ascending: false)]

        privateDatabase.perform(query, inZoneWith: nil) { records, error in
            if let error = error {
                call.reject("Failed to fetch stats", nil, error)
                return
            }

            guard let records = records, !records.isEmpty else {
                call.resolve(["stats": nil])
                return
            }

            // Merge stats from all devices
            var mergedStats: [String: Any] = [
                "played": 0,
                "wins": 0,
                "currentStreak": 0,
                "bestStreak": 0,
                "lastStreakDate": nil as String?
            ]

            var latestDate: Date?

            for record in records {
                let played = record["played"] as? Int ?? 0
                let wins = record["wins"] as? Int ?? 0
                let currentStreak = record["currentStreak"] as? Int ?? 0
                let bestStreak = record["bestStreak"] as? Int ?? 0
                let modifiedAt = record["modifiedAt"] as? Date

                // Sum plays and wins across devices
                mergedStats["played"] = (mergedStats["played"] as! Int) + played
                mergedStats["wins"] = (mergedStats["wins"] as! Int) + wins

                // Take max streaks
                mergedStats["bestStreak"] = max(mergedStats["bestStreak"] as! Int, bestStreak)

                // Take most recent current streak
                if latestDate == nil || (modifiedAt != nil && modifiedAt! > latestDate!) {
                    latestDate = modifiedAt
                    mergedStats["currentStreak"] = currentStreak
                    mergedStats["lastStreakDate"] = record["lastStreakDate"] as? String
                }
            }

            call.resolve(["stats": mergedStats])
        }
    }

    // MARK: - Puzzle Results Sync

    @objc func syncPuzzleResult(_ call: CAPPluginCall) {
        guard let date = call.getString("date"),
              let result = call.getObject("result") else {
            call.reject("Date and result are required")
            return
        }

        let recordID = CKRecord.ID(recordName: "puzzleResult_\(date)_\(deviceId)")
        let record = CKRecord(recordType: RecordType.puzzleResult.rawValue, recordID: recordID)

        record["date"] = date
        record["won"] = result["won"] as? Bool ?? false
        record["mistakes"] = (result["mistakes"] as? Int) ?? 0
        record["solved"] = (result["solved"] as? Int) ?? 0
        record["hintsUsed"] = (result["hintsUsed"] as? Int) ?? 0
        record["theme"] = result["theme"] as? String
        record["timestamp"] = result["timestamp"] as? String
        record["deviceId"] = deviceId

        privateDatabase.save(record) { savedRecord, error in
            if let error = error {
                call.reject("Failed to sync puzzle result", nil, error)
                return
            }

            call.resolve(["success": true])
        }
    }

    @objc func fetchPuzzleResults(_ call: CAPPluginCall) {
        let startDate = call.getString("startDate")
        let endDate = call.getString("endDate")

        var predicate: NSPredicate
        if let start = startDate, let end = endDate {
            predicate = NSPredicate(format: "date >= %@ AND date <= %@", start, end)
        } else {
            predicate = NSPredicate(value: true)
        }

        let query = CKQuery(recordType: RecordType.puzzleResult.rawValue, predicate: predicate)

        privateDatabase.perform(query, inZoneWith: nil) { records, error in
            if let error = error {
                call.reject("Failed to fetch puzzle results", nil, error)
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

                results[date] = [
                    "date": date,
                    "won": record["won"] as? Bool ?? false,
                    "mistakes": record["mistakes"] as? Int ?? 0,
                    "solved": record["solved"] as? Int ?? 0,
                    "hintsUsed": record["hintsUsed"] as? Int ?? 0,
                    "theme": record["theme"] as? String ?? "",
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

        let recordID = CKRecord.ID(recordName: "puzzleProgress_\(date)_\(deviceId)")
        let record = CKRecord(recordType: RecordType.puzzleProgress.rawValue, recordID: recordID)

        record["date"] = date
        record["started"] = progress["started"] as? Bool ?? false
        record["solved"] = (progress["solved"] as? Int) ?? 0
        record["mistakes"] = (progress["mistakes"] as? Int) ?? 0
        record["hintsUsed"] = (progress["hintsUsed"] as? Int) ?? 0
        record["lastUpdated"] = progress["lastUpdated"] as? String ?? ISO8601DateFormatter().string(from: Date())
        record["deviceId"] = deviceId

        privateDatabase.save(record) { savedRecord, error in
            if let error = error {
                call.reject("Failed to sync puzzle progress", nil, error)
                return
            }

            call.resolve(["success": true])
        }
    }

    @objc func fetchPuzzleProgress(_ call: CAPPluginCall) {
        guard let date = call.getString("date") else {
            call.reject("Date is required")
            return
        }

        let predicate = NSPredicate(format: "date == %@", date)
        let query = CKQuery(recordType: RecordType.puzzleProgress.rawValue, predicate: predicate)
        query.sortDescriptors = [NSSortDescriptor(key: "lastUpdated", ascending: false)]

        privateDatabase.perform(query, inZoneWith: nil) { records, error in
            if let error = error {
                call.reject("Failed to fetch puzzle progress", nil, error)
                return
            }

            guard let record = records?.first else {
                call.resolve(["progress": nil])
                return
            }

            let progress: [String: Any] = [
                "started": record["started"] as? Bool ?? false,
                "solved": record["solved"] as? Int ?? 0,
                "mistakes": record["mistakes"] as? Int ?? 0,
                "hintsUsed": record["hintsUsed"] as? Int ?? 0,
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
        record["highContrast"] = preferences["highContrast"] as? Bool ?? false
        record["sound"] = preferences["sound"] as? Bool ?? true
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
        let query = CKQuery(recordType: RecordType.userPreferences.rawValue, predicate: NSPredicate(value: true))
        query.sortDescriptors = [NSSortDescriptor(key: "modifiedAt", ascending: false)]

        privateDatabase.perform(query, inZoneWith: nil) { records, error in
            if let error = error {
                call.reject("Failed to fetch preferences", nil, error)
                return
            }

            guard let record = records?.first else {
                call.resolve(["preferences": nil])
                return
            }

            let preferences: [String: Any] = [
                "theme": record["theme"] as? String ?? "light",
                "themeMode": record["themeMode"] as? String ?? "auto",
                "highContrast": record["highContrast"] as? Bool ?? false,
                "sound": record["sound"] as? Bool ?? true
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
