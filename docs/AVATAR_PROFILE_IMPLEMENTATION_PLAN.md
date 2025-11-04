# Avatar Profile Selection - Implementation Plan

## Overview
Implement a character avatar selection system for player profiles following modern game development best practices. Players can select from 8 unique character avatars with personality bios after creating an account, and change their selection at any time.

## Project Context
- **Game**: Tandem - Daily Word Puzzle
- **Platform**: Next.js PWA (Web + iOS via Capacitor)
- **Design System**: Neo-brutalist style with bold borders, shadows, and vibrant gradients
- **Authentication**: Supabase Auth (Email, Google OAuth, Apple Sign In)
- **Database**: PostgreSQL via Supabase with Row-Level Security (RLS)

---

## Character Roster

### Available Avatars
All avatar images are located in `public/images/avatars/` as PNG files:

1. **Berry** (`berry.png`)
   - *"Tweets solutions before you've finished reading the clue. Annoyingly good at spelling bees. Will hum the Wheel of Fortune theme until you solve it faster."*

2. **Clover** (`clover.png`)
   - *"Methodical, careful, and correct every single time. Clover triple-checks everything and has never misspelled a word. Yes, it takes a while. No, you can't rush perfection."*

3. **Nutmeg** (`nutmeg.png`)
   - *"Unscrambles words at chaotic speed and treats every jumble like a personal vendetta. Occasionally forgets what the original letters were. Thrives on caffeine and consonants."*

4. **Pearl** (`pearl.png`)
   - *"Playful wordsmith who finds synonyms in their sleep. Never met a homophone that could fool them. Gets overexcited and knocks the letter tiles everywhere."*

5. **Pip** (`pip.png`)
   - *"Building vocabulary one letter at a time with wholesome determination. Pip will get there eventually and refuses to use hints. Small but stubborn wins the game."*

6. **Poppy** (`poppy.png`)
   - *"Speed demon who spots patterns in half a blink. Terrible at games requiring patience. If there's a timer involved, Poppy's already finished and doing victory laps."*

7. **Thistle** (`thistle.png`)
   - *"Grammar snob with a soft spot for obscure words. Thrives on puzzles that make others rage-quit. Acts tough but gets genuinely emotional over a perfect solve."*

8. **Ziggy** (`ziggy.png`)
   - *"Finds words you didn't know existed and solutions you didn't see coming. Clever, chaotic, light-fingered. Your pencil is gone and Ziggy's not apologizing."*

---

## Database Schema Design

### Migration: `006_avatar_system.sql`

```sql
-- =====================================================
-- Tandem - Avatar Profile System
-- =====================================================
-- Adds avatar selection capability to user profiles
-- Following game dev best practices with normalized data
--
-- Created: 2025-11-04
-- =====================================================

-- =====================================================
-- 1. AVATARS TABLE (Reference Data)
-- =====================================================
-- Master table of available avatar characters
-- Normalized approach for easy management and expansion

CREATE TABLE IF NOT EXISTS avatars (
  id TEXT PRIMARY KEY, -- Lowercase avatar name (e.g., 'berry', 'clover')
  display_name TEXT NOT NULL, -- Capitalized name for UI (e.g., 'Berry')
  bio TEXT NOT NULL, -- Character personality description
  image_path TEXT NOT NULL, -- Path to avatar image (e.g., '/images/avatars/berry.png')
  sort_order INTEGER NOT NULL DEFAULT 0, -- Display order in selection UI
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Allow enabling/disabling avatars
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed initial avatar data
INSERT INTO avatars (id, display_name, bio, image_path, sort_order) VALUES
  ('berry', 'Berry',
   'Tweets solutions before you''ve finished reading the clue. Annoyingly good at spelling bees. Will hum the Wheel of Fortune theme until you solve it faster.',
   '/images/avatars/berry.png', 1),
  ('clover', 'Clover',
   'Methodical, careful, and correct every single time. Clover triple-checks everything and has never misspelled a word. Yes, it takes a while. No, you can''t rush perfection.',
   '/images/avatars/clover.png', 2),
  ('nutmeg', 'Nutmeg',
   'Unscrambles words at chaotic speed and treats every jumble like a personal vendetta. Occasionally forgets what the original letters were. Thrives on caffeine and consonants.',
   '/images/avatars/nutmeg.png', 3),
  ('pearl', 'Pearl',
   'Playful wordsmith who finds synonyms in their sleep. Never met a homophone that could fool them. Gets overexcited and knocks the letter tiles everywhere.',
   '/images/avatars/pearl.png', 4),
  ('pip', 'Pip',
   'Building vocabulary one letter at a time with wholesome determination. Pip will get there eventually and refuses to use hints. Small but stubborn wins the game.',
   '/images/avatars/pip.png', 5),
  ('poppy', 'Poppy',
   'Speed demon who spots patterns in half a blink. Terrible at games requiring patience. If there''s a timer involved, Poppy''s already finished and doing victory laps.',
   '/images/avatars/poppy.png', 6),
  ('thistle', 'Thistle',
   'Grammar snob with a soft spot for obscure words. Thrives on puzzles that make others rage-quit. Acts tough but gets genuinely emotional over a perfect solve.',
   '/images/avatars/thistle.png', 7),
  ('ziggy', 'Ziggy',
   'Finds words you didn''t know existed and solutions you didn''t see coming. Clever, chaotic, light-fingered. Your pencil is gone and Ziggy''s not apologizing.',
   '/images/avatars/ziggy.png', 8)
ON CONFLICT (id) DO NOTHING;

-- No RLS needed - avatars are public reference data
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avatars are viewable by everyone"
  ON avatars
  FOR SELECT
  USING (is_active = true);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_avatars_sort_order ON avatars(sort_order);

-- =====================================================
-- 2. UPDATE USERS TABLE
-- =====================================================
-- Add avatar selection to existing users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS selected_avatar_id TEXT REFERENCES avatars(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS avatar_selected_at TIMESTAMPTZ;

-- Create index for avatar lookups
CREATE INDEX IF NOT EXISTS idx_users_selected_avatar ON users(selected_avatar_id);

-- Update existing users to have no avatar (they'll select on next login)
-- This is safe because the column defaults to NULL

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to get user profile with avatar details (JOIN)
CREATE OR REPLACE FUNCTION get_user_profile_with_avatar(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  selected_avatar_id TEXT,
  avatar_display_name TEXT,
  avatar_bio TEXT,
  avatar_image_path TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.full_name,
    u.avatar_url,
    u.selected_avatar_id,
    a.display_name,
    a.bio,
    a.image_path,
    u.created_at
  FROM users u
  LEFT JOIN avatars a ON u.selected_avatar_id = a.id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Trigger for avatars table updated_at
DROP TRIGGER IF EXISTS update_avatars_updated_at ON avatars;
CREATE TRIGGER update_avatars_updated_at
  BEFORE UPDATE ON avatars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. GRANTS
-- =====================================================

-- Grant SELECT on avatars to all authenticated users
GRANT SELECT ON avatars TO authenticated, anon;

-- Users can UPDATE their avatar selection (RLS restricts to own record)
-- This permission already exists from 001_initial_schema.sql

-- =====================================================
-- SECURITY VERIFICATION
-- =====================================================
--
-- ✅ RLS enabled on avatars table
-- ✅ Avatars are read-only reference data for users
-- ✅ Users can only update their own avatar selection (via existing RLS)
-- ✅ Avatar selection is nullable (users don't need to choose immediately)
-- ✅ Foreign key constraint ensures valid avatar selection
--
-- =====================================================

-- Migration complete!
```

---

## User Experience Flow

### First-Time User Journey
1. **Sign Up/Sign In** → User creates account or signs in
2. **Avatar Selection Modal** → Modal appears prompting avatar selection
   - *Skippable* - User can dismiss and select later
   - Shows all 8 avatars in grid layout
   - Each card displays: Avatar image, name, and bio
   - Selection highlights card with visual feedback
3. **Confirmation** → User confirms selection
4. **Profile Updated** → Avatar appears in Settings and Account page

### Existing User Journey
1. User can change avatar from **Account page** (`/account`)
2. Avatar displays next to "Hi {name}!" in **Settings modal**
3. Avatar change modal similar to first-time selection

### Avatar Display Locations
- **Settings Modal** (`src/components/Settings.jsx` line 324-358)
  - Avatar image next to "Hi {user.user_metadata.full_name}!"
  - Small circular avatar (48x48px)
- **Account Page** (`src/app/account/page.jsx` line 262-332)
  - Larger avatar in Profile card (96x96px)
  - Click to open avatar selection modal
  - Shows current avatar name below greeting

---

## Technical Implementation Plan

### Phase 1: Database Setup
**Files to Create:**
- `supabase/migrations/006_avatar_system.sql`

**Tasks:**
1. Create `avatars` reference table with character data
2. Alter `users` table to add `selected_avatar_id` and `avatar_selected_at`
3. Seed avatar data with all 8 characters
4. Create helper function `get_user_profile_with_avatar()`
5. Set up RLS policies
6. Test migration locally

**Acceptance Criteria:**
- ✅ Migration runs without errors
- ✅ All 8 avatars inserted into `avatars` table
- ✅ `users.selected_avatar_id` is nullable with foreign key constraint
- ✅ RLS policies allow users to read avatars and update own avatar selection

---

### Phase 2: Avatar Data Service
**Files to Create:**
- `src/services/avatar.service.js`

**Implementation:**
```javascript
// src/services/avatar.service.js
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

class AvatarService {
  /**
   * Get all available avatars
   * @returns {Promise<Array>} List of avatars
   */
  async getAllAvatars() {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('avatars')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return data;
  }

  /**
   * Update user's selected avatar
   * @param {string} userId - User ID
   * @param {string} avatarId - Avatar ID to select
   * @returns {Promise<Object>} Updated user data
   */
  async updateUserAvatar(userId, avatarId) {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('users')
      .update({
        selected_avatar_id: avatarId,
        avatar_selected_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get user profile with avatar details
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile with avatar data
   */
  async getUserProfileWithAvatar(userId) {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .rpc('get_user_profile_with_avatar', { p_user_id: userId });

    if (error) throw error;
    return data?.[0] || null;
  }
}

export default new AvatarService();
```

**Acceptance Criteria:**
- ✅ Service methods handle errors gracefully
- ✅ Data fetched with proper RLS authentication
- ✅ Service is stateless and reusable

---

### Phase 3: Avatar Selection Modal Component
**Files to Create:**
- `src/components/AvatarSelectionModal.jsx`

**Implementation:**
```jsx
'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import avatarService from '@/services/avatar.service';

export default function AvatarSelectionModal({
  isOpen,
  onClose,
  userId,
  currentAvatarId = null,
  isFirstTime = false
}) {
  const [avatars, setAvatars] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatarId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { highContrast, theme } = useTheme();
  const { correctAnswer: successHaptic, lightTap } = useHaptics();

  useEffect(() => {
    if (isOpen) {
      loadAvatars();
    }
  }, [isOpen]);

  const loadAvatars = async () => {
    try {
      setLoading(true);
      const data = await avatarService.getAllAvatars();
      setAvatars(data);
    } catch (error) {
      console.error('Failed to load avatars:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (avatarId) => {
    setSelectedAvatar(avatarId);
    lightTap();
  };

  const handleConfirm = async () => {
    if (!selectedAvatar) {
      alert('Please select an avatar');
      return;
    }

    try {
      setSaving(true);
      await avatarService.updateUserAvatar(userId, selectedAvatar);
      successHaptic();
      onClose(selectedAvatar); // Pass selected avatar back
    } catch (error) {
      console.error('Failed to save avatar:', error);
      alert('Failed to save avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    lightTap();
    onClose(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 animate-fadeIn"
      onClick={isFirstTime ? undefined : onClose} // Prevent closing on backdrop click for first-time
    >
      <div
        className={`rounded-[32px] border-[3px] p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto modal-scrollbar shadow-[8px_8px_0px_rgba(0,0,0,1)] ${
          highContrast
            ? 'bg-hc-surface border-hc-border'
            : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            {isFirstTime ? 'Choose Your Avatar' : 'Change Your Avatar'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pick a character that matches your puzzle-solving style!
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
          </div>
        )}

        {/* Avatar Grid */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleSelect(avatar.id)}
                className={`p-4 rounded-2xl border-[3px] transition-all ${
                  selectedAvatar === avatar.id
                    ? highContrast
                      ? 'bg-hc-primary border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
                      : 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border-purple-500 shadow-[6px_6px_0px_rgba(147,51,234,0.5)]'
                    : highContrast
                      ? 'bg-hc-surface border-hc-border hover:bg-hc-focus'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 shadow-[3px_3px_0px_rgba(0,0,0,0.2)]'
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className="relative w-20 h-20 mb-2">
                    <Image
                      src={avatar.image_path}
                      alt={avatar.display_name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <h3 className={`font-bold text-lg mb-1 ${
                    selectedAvatar === avatar.id
                      ? 'text-purple-700 dark:text-purple-300'
                      : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    {avatar.display_name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center line-clamp-3">
                    {avatar.bio}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {isFirstTime && (
            <button
              onClick={handleSkip}
              disabled={saving}
              className={`flex-1 py-3 px-4 rounded-2xl border-[3px] font-semibold transition-all ${
                highContrast
                  ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              }`}
            >
              Skip for Now
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={!selectedAvatar || saving}
            className={`flex-1 py-3 px-4 rounded-2xl border-[3px] font-semibold transition-all ${
              !selectedAvatar || saving
                ? 'opacity-50 cursor-not-allowed'
                : ''
            } ${
              highContrast
                ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
            }`}
          >
            {saving ? 'Saving...' : 'Confirm Selection'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- ✅ Modal displays all 8 avatars in responsive grid
- ✅ Selection highlights chosen avatar
- ✅ Bios are readable and truncated appropriately
- ✅ Haptic feedback on interactions (mobile)
- ✅ Loading and saving states displayed
- ✅ First-time modal is not dismissable by backdrop click
- ✅ Follows existing design system (neo-brutalist style)

---

### Phase 4: Settings Integration
**Files to Modify:**
- `src/components/Settings.jsx`

**Changes:**
1. Import avatar service and add state for avatar data
2. Fetch user avatar on mount
3. Display avatar image next to greeting (line 324-358)
4. Add "Change Avatar" button that opens modal
5. Refresh avatar after selection

**Code Changes:**
```jsx
// Add at top of Settings.jsx
import AvatarSelectionModal from '@/components/AvatarSelectionModal';
import avatarService from '@/services/avatar.service';
import Image from 'next/image';

// Add state
const [userAvatar, setUserAvatar] = useState(null);
const [showAvatarModal, setShowAvatarModal] = useState(false);

// Add useEffect to load avatar
useEffect(() => {
  if (isOpen && user) {
    loadUserAvatar();
  }
}, [isOpen, user]);

const loadUserAvatar = async () => {
  try {
    const profile = await avatarService.getUserProfileWithAvatar(user.id);
    setUserAvatar(profile);
  } catch (error) {
    console.error('Failed to load user avatar:', error);
  }
};

// Update Account section (around line 324-358)
{user && (
  <>
    <div className="flex items-start gap-3">
      {/* Avatar Image */}
      {userAvatar?.selected_avatar_id && (
        <div className="relative w-12 h-12 rounded-full overflow-hidden border-[2px] border-gray-300 dark:border-gray-600 flex-shrink-0">
          <Image
            src={userAvatar.avatar_image_path}
            alt={userAvatar.avatar_display_name}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="flex-1">
        {user.user_metadata?.full_name && (
          <p className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Hi {user.user_metadata.full_name}! 👋
          </p>
        )}
        {/* ... rest of account section ... */}
      </div>
    </div>

    {/* Change Avatar Button */}
    <button
      onClick={() => setShowAvatarModal(true)}
      className="text-sm text-sky-600 dark:text-sky-400 hover:underline"
    >
      {userAvatar?.selected_avatar_id ? 'Change Avatar' : 'Select Avatar'}
    </button>
  </>
)}

// Add modal at end of component
<AvatarSelectionModal
  isOpen={showAvatarModal}
  onClose={(avatarId) => {
    setShowAvatarModal(false);
    if (avatarId) {
      loadUserAvatar(); // Refresh avatar
    }
  }}
  userId={user?.id}
  currentAvatarId={userAvatar?.selected_avatar_id}
  isFirstTime={false}
/>
```

**Acceptance Criteria:**
- ✅ Avatar displays next to greeting when selected
- ✅ "Change Avatar" button opens modal
- ✅ Avatar updates immediately after selection
- ✅ No avatar shows placeholder state with "Select Avatar" button

---

### Phase 5: Account Page Integration
**Files to Modify:**
- `src/app/account/page.jsx`

**Changes:**
1. Import avatar service and modal
2. Fetch user avatar with profile data
3. Display larger avatar in Profile card
4. Add click handler to change avatar
5. Show avatar name below greeting

**Code Changes:**
```jsx
// Add at top
import AvatarSelectionModal from '@/components/AvatarSelectionModal';
import avatarService from '@/services/avatar.service';
import Image from 'next/image';

// Add state
const [userAvatar, setUserAvatar] = useState(null);
const [showAvatarModal, setShowAvatarModal] = useState(false);

// Add useEffect to load avatar
useEffect(() => {
  if (user) {
    loadUserAvatar();
  }
}, [user]);

const loadUserAvatar = async () => {
  try {
    const profile = await avatarService.getUserProfileWithAvatar(user.id);
    setUserAvatar(profile);
  } catch (error) {
    console.error('Failed to load user avatar:', error);
  }
};

// Update Profile card (around line 254-332)
<div className="space-y-3">
  {/* Avatar Section */}
  {userAvatar?.selected_avatar_id && (
    <div className="flex flex-col items-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setShowAvatarModal(true)}
        className="relative w-24 h-24 rounded-full overflow-hidden border-[3px] border-purple-500 shadow-[4px_4px_0px_rgba(147,51,234,0.5)] mb-2 hover:scale-105 transition-transform"
      >
        <Image
          src={userAvatar.avatar_image_path}
          alt={userAvatar.avatar_display_name}
          fill
          className="object-cover"
        />
      </button>
      <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
        {userAvatar.avatar_display_name}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
        {userAvatar.avatar_bio}
      </p>
      <button
        onClick={() => setShowAvatarModal(true)}
        className="mt-2 text-sm text-sky-600 dark:text-sky-400 hover:underline"
      >
        Change Avatar
      </button>
    </div>
  )}

  {!userAvatar?.selected_avatar_id && (
    <div className="flex flex-col items-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
      <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
        <span className="text-4xl">👤</span>
      </div>
      <button
        onClick={() => setShowAvatarModal(true)}
        className={`mt-2 py-2 px-4 rounded-xl border-[2px] font-medium text-sm transition-all ${
          highContrast
            ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus'
            : 'bg-purple-500 text-white border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
        }`}
      >
        Select Your Avatar
      </button>
    </div>
  )}

  {/* Existing email, name, etc. */}
  <div>
    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
    {/* ... rest ... */}
  </div>
</div>

// Add modal before closing tag
<AvatarSelectionModal
  isOpen={showAvatarModal}
  onClose={(avatarId) => {
    setShowAvatarModal(false);
    if (avatarId) {
      loadUserAvatar(); // Refresh avatar
    }
  }}
  userId={user?.id}
  currentAvatarId={userAvatar?.selected_avatar_id}
  isFirstTime={false}
/>
```

**Acceptance Criteria:**
- ✅ Large avatar displays in Profile section (96x96px)
- ✅ Avatar name and bio shown below image
- ✅ Clicking avatar opens selection modal
- ✅ Placeholder shown for users without avatar
- ✅ "Select Your Avatar" CTA for new users

---

### Phase 6: First-Time User Flow
**Files to Modify:**
- `src/contexts/AuthContext.jsx`
- Create: `src/hooks/useAvatarPrompt.js`

**Implementation:**

**1. Custom Hook: `useAvatarPrompt.js`**
```javascript
// src/hooks/useAvatarPrompt.js
import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import avatarService from '@/services/avatar.service';

export function useAvatarPrompt(user) {
  const [showAvatarPrompt, setShowAvatarPrompt] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (user && !hasChecked) {
      checkAvatarStatus();
    }
  }, [user, hasChecked]);

  const checkAvatarStatus = async () => {
    try {
      const profile = await avatarService.getUserProfileWithAvatar(user.id);

      // Show prompt if user has no avatar and hasn't dismissed it
      const dismissed = localStorage.getItem('avatar_prompt_dismissed');
      if (!profile?.selected_avatar_id && !dismissed) {
        setShowAvatarPrompt(true);
      }

      setHasChecked(true);
    } catch (error) {
      console.error('Failed to check avatar status:', error);
      setHasChecked(true);
    }
  };

  const dismissPrompt = () => {
    setShowAvatarPrompt(false);
    localStorage.setItem('avatar_prompt_dismissed', 'true');
  };

  const resetPrompt = () => {
    setShowAvatarPrompt(false);
    setHasChecked(false);
  };

  return {
    showAvatarPrompt,
    dismissPrompt,
    resetPrompt
  };
}
```

**2. Add to Main Game Component** (e.g., `src/app/page.jsx` or main game screen)
```jsx
import { useAvatarPrompt } from '@/hooks/useAvatarPrompt';
import AvatarSelectionModal from '@/components/AvatarSelectionModal';

// Inside component
const { user } = useAuth();
const { showAvatarPrompt, dismissPrompt, resetPrompt } = useAvatarPrompt(user);

// Add modal
<AvatarSelectionModal
  isOpen={showAvatarPrompt}
  onClose={(avatarId) => {
    if (avatarId) {
      resetPrompt(); // Avatar selected, reset prompt
    } else {
      dismissPrompt(); // Skipped, don't show again
    }
  }}
  userId={user?.id}
  isFirstTime={true}
/>
```

**Acceptance Criteria:**
- ✅ Modal appears once after user signs up/in without avatar
- ✅ Modal can be skipped (dismisses for session via localStorage)
- ✅ Prompt doesn't show if user already has avatar
- ✅ Non-intrusive timing (appears after game loads)

---

### Phase 7: Testing & Polish

#### Unit Tests
**Files to Create:**
- `__tests__/services/avatar.service.test.js`
- `__tests__/components/AvatarSelectionModal.test.jsx`

**Test Cases:**
1. Avatar service fetches all avatars correctly
2. Avatar service updates user avatar
3. Modal renders all 8 avatars
4. Modal selection updates state
5. Modal confirmation saves avatar
6. RLS policies prevent unauthorized access

#### Integration Tests
1. Sign up new user → Avatar prompt appears
2. Select avatar → Avatar displays in Settings
3. Change avatar from Account page
4. Avatar persists across sessions
5. Web and iOS native flows work identically

#### Visual Regression Tests
1. Avatar grid responsive on mobile, tablet, desktop
2. High contrast mode styling
3. Dark mode styling
4. Loading states
5. Error states

---

## Modern Game Dev Best Practices Applied

### 1. **Normalized Data Model**
- Avatar data stored in reference table (`avatars`)
- Users reference avatars via foreign key
- Easy to add/modify avatars without touching user data
- Supports future features (avatar unlocks, seasonal avatars, etc.)

### 2. **Immutability & Versioning**
- Avatar data is immutable for users (read-only)
- `is_active` flag allows soft-deleting avatars
- `sort_order` enables reordering without code changes
- Timestamp tracking for analytics

### 3. **Security-First Architecture**
- Row-Level Security (RLS) on all tables
- Users can only update their own avatar selection
- Avatar data is public (safe to expose)
- Service role bypasses RLS for admin operations

### 4. **Performance Optimization**
- Indexed foreign keys for fast lookups
- Helper function `get_user_profile_with_avatar()` uses JOIN
- Images optimized (PNG format, under 200KB each)
- Next.js Image component for lazy loading

### 5. **User Experience Design**
- Non-blocking first-time flow (skippable)
- Visual feedback (hover, selection states, haptics)
- Responsive grid layout
- Accessible (keyboard navigation, ARIA labels)

### 6. **Scalability**
- Easy to add new avatars (just insert into `avatars` table)
- Support for future features:
  - Avatar unlocks (add `unlock_condition` column)
  - Seasonal avatars (add `available_from`/`available_until`)
  - Avatar customization (add `customization_options` JSONB)
  - Animated avatars (add `animation_path` column)

### 7. **Analytics Ready**
- `avatar_selected_at` timestamp for tracking
- Can add `avatar_change_history` table for analytics
- Track popular avatars, change frequency, etc.

---

## File Structure Summary

```
Tandem/
├── docs/
│   └── AVATAR_PROFILE_IMPLEMENTATION_PLAN.md ← This file
├── public/
│   └── images/
│       └── avatars/
│           ├── berry.png ✅ Existing
│           ├── clover.png ✅ Existing
│           ├── nutmeg.png ✅ Existing
│           ├── pearl.png ✅ Existing
│           ├── pip.png ✅ Existing
│           ├── poppy.png ✅ Existing
│           ├── thistle.png ✅ Existing
│           └── ziggy.png ✅ Existing
├── src/
│   ├── app/
│   │   └── account/
│   │       └── page.jsx ← Modify (Phase 5)
│   ├── components/
│   │   ├── AvatarSelectionModal.jsx ← Create (Phase 3)
│   │   └── Settings.jsx ← Modify (Phase 4)
│   ├── contexts/
│   │   └── AuthContext.jsx ← Reference (Phase 6)
│   ├── hooks/
│   │   └── useAvatarPrompt.js ← Create (Phase 6)
│   └── services/
│       └── avatar.service.js ← Create (Phase 2)
├── supabase/
│   └── migrations/
│       └── 006_avatar_system.sql ← Create (Phase 1)
└── __tests__/
    ├── components/
    │   └── AvatarSelectionModal.test.jsx ← Create (Phase 7)
    └── services/
        └── avatar.service.test.js ← Create (Phase 7)
```

---

## Rollout Strategy

### Development Environment
1. Run migration on dev Supabase instance
2. Test all flows in dev environment
3. Verify RLS policies with different user roles
4. Test on multiple devices/browsers

### Staging Environment
1. Deploy to staging with feature flag
2. Internal team testing
3. Beta testers opt-in
4. Monitor for issues

### Production Deployment
1. Run migration during low-traffic window
2. Deploy code with feature flag enabled
3. Monitor error logs and analytics
4. Gradual rollout (10% → 50% → 100%)

### Rollback Plan
- Feature flag disable if critical issues
- Migration rollback script ready
- Fallback UI without avatars

---

## Success Metrics

### Technical Metrics
- ✅ Zero database migration errors
- ✅ <100ms avatar fetch time (p95)
- ✅ <500ms avatar update time (p95)
- ✅ 100% RLS policy coverage

### User Engagement Metrics
- **Target:** 60%+ avatar selection rate within 7 days of signup
- **Target:** 80%+ retention of avatar selection (not changed back to null)
- **Target:** <5% user reports/confusion about avatar feature

### Product Metrics
- Track most/least popular avatars
- Monitor avatar change frequency
- Measure impact on user profile completion rate

---

## Future Enhancements (Post-MVP)

### Phase 2 Features
1. **Avatar Unlocks**: Unlock special avatars by completing challenges
2. **Animated Avatars**: Add animated WebP/APNG versions
3. **Seasonal Avatars**: Limited-time holiday-themed avatars
4. **Avatar Customization**: Let users customize colors/accessories
5. **Avatar Badges**: Display achievements/stats on avatar cards
6. **Avatar Frames**: Premium borders for subscribed users
7. **Leaderboard Integration**: Show avatars on global leaderboards

### Technical Improvements
1. Add avatar analytics dashboard for admins
2. A/B test different avatar display sizes
3. Add avatar preview in auth flows
4. Implement avatar change history table
5. Add avatar recommendation system based on play style

---

## Questions & Decisions Log

### Decision 1: Storage Location
**Question:** Store avatar images in Supabase Storage or public folder?
**Decision:** Public folder (`public/images/avatars/`)
**Rationale:**
- Images are static and publicly accessible
- No need for access control
- Faster load times (CDN-served)
- Simpler implementation
- Already have folder structure

### Decision 2: Avatar Data Structure
**Question:** Store avatar bio in users table or separate reference table?
**Decision:** Separate `avatars` reference table
**Rationale:**
- Normalized database design
- Easy to update bios globally
- Supports future features (unlock conditions, seasonal, etc.)
- Reduces data duplication
- Standard game dev pattern

### Decision 3: First-Time Flow
**Question:** Force avatar selection or make it optional?
**Decision:** Optional (skippable modal)
**Rationale:**
- Reduces onboarding friction
- Respects user agency
- Can still prompt later
- Better conversion rates
- Follows modern UX best practices

### Decision 4: Avatar Change Frequency
**Question:** Limit how often users can change avatars?
**Decision:** No limit (can change anytime)
**Rationale:**
- Better user experience
- No technical reason to limit
- Encourages exploration
- Can add limits later if needed
- Low database cost

---

## API Endpoints (Optional - Future)

If you want admin control over avatars:

### `POST /api/admin/avatars` (Create Avatar)
- Admin only (protected by auth check)
- Add new avatar to system

### `PATCH /api/admin/avatars/:id` (Update Avatar)
- Admin only
- Update avatar bio, image, sort order, active status

### `DELETE /api/admin/avatars/:id` (Soft Delete Avatar)
- Admin only
- Sets `is_active = false`
- Users with this avatar keep it, but new selections can't choose it

---

## Conclusion

This implementation plan provides a complete, production-ready avatar profile system following modern game development best practices. The design is:

- **Secure**: RLS policies prevent unauthorized access
- **Scalable**: Normalized data model supports future features
- **User-Friendly**: Intuitive selection flow with visual feedback
- **Performant**: Indexed queries and optimized images
- **Maintainable**: Clean service layer and reusable components
- **Testable**: Unit and integration test coverage
- **Accessible**: Keyboard navigation and screen reader support

The phased approach allows for incremental development and testing, reducing risk and ensuring quality at each step.

---

**Ready to implement? Start with Phase 1 (Database Setup) and work through each phase sequentially.**
