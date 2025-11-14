# Feedback System Fix Instructions

## Issues Found

### 1. Status Update Error (500 Internal Server Error)
**Problem**: When trying to change feedback status to "In Review" or "Archived", the update fails with a database constraint violation.

**Root Cause**: The database `feedback_status_check` constraint only allows `'new'` and `'resolved'` status values, but the application code expects four values: `'new'`, `'in_review'`, `'resolved'`, and `'archived'`.

### 2. Invalid Date Display on Internal Notes
**Problem**: When saving an internal note, it shows "Invalid Date" even though the timestamp is saved correctly.

**Root Cause**: The `comments` field didn't exist in the database. Comments were being stored as plain text in `admin_notes`, but the UI was trying to access structured fields like `createdAt`, `author`, and `id` which didn't exist.

---

## Solution

Two SQL migrations need to be run in your Supabase dashboard:

### Step 1: Fix Status Constraint

1. Open your Supabase Dashboard
2. Navigate to: **SQL Editor**
3. Click "New Query"
4. Copy and paste the contents of: `FIX-FEEDBACK-STATUS.sql`
5. Click "Run"
6. Verify you see: ✅ Constraint updated successfully!

This will allow all four status values: `new`, `in_review`, `resolved`, `archived`

### Step 2: Add Comments Column

1. Still in the SQL Editor
2. Click "New Query"
3. Copy and paste the contents of: `ADD-COMMENTS-COLUMN.sql`
4. Click "Run"
5. Verify you see: ✅ Comments column added successfully!

This will:
- Add a `comments` JSONB column to store structured comment data
- Migrate any existing `admin_notes` into the new format
- Preserve all existing data

---

## Code Changes Made

### Updated Files:

#### 1. `src/lib/db.js`

**`transformFeedbackEntry()` function** (lines 805-839)
- Now properly parses the `comments` JSONB field from the database
- Falls back to `admin_notes` for backward compatibility
- Returns structured comment objects with `id`, `author`, `message`, and `createdAt`

**`addFeedbackComment()` function** (lines 938-987)
- Changed from appending text to `admin_notes`
- Now properly stores comments as JSON array in `comments` field
- Maintains comment structure with all required fields

---

## Testing After Migration

1. **Test Status Updates**:
   - Go to `/admin` page
   - Click on "Feedback" tab
   - Try changing a feedback status to "In Review" → Should work ✅
   - Try changing a feedback status to "Archived" → Should work ✅

2. **Test Internal Notes**:
   - Select any feedback item
   - Add an internal note in the text area
   - Click "Add Note"
   - Verify the note appears with:
     - Your username ✅
     - A proper timestamp (e.g., "2m ago" or "Nov 14") ✅
     - The note message ✅

---

## Migration Files Reference

- **FIX-FEEDBACK-STATUS.sql** - Fixes the status constraint
- **ADD-COMMENTS-COLUMN.sql** - Adds the comments JSONB column
- **check-feedback-schema.sql** - Helper to inspect table structure
- **fix-feedback-status-constraint.sql** - Alternative format for status fix

---

## Rollback (if needed)

If you need to rollback these changes:

```sql
-- Rollback comments column
ALTER TABLE feedback DROP COLUMN IF EXISTS comments;

-- Rollback status constraint (back to just new/resolved)
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_status_check;
ALTER TABLE feedback ADD CONSTRAINT feedback_status_check
  CHECK (status IN ('new', 'resolved'));
```

---

## Notes

- The migration preserves all existing data
- Old `admin_notes` are converted to the new comment format
- The system is backward compatible (if `comments` field doesn't exist, falls back to `admin_notes`)
- All changes are non-destructive
