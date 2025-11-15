'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * AuthSessionMigration - Handles migration from localStorage to cookie-based auth
 *
 * This component detects old localStorage sessions and migrates them to cookies.
 * Users will need to re-authenticate once after this migration.
 */
export default function AuthSessionMigration() {
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    async function migrateSession() {
      if (typeof window === 'undefined' || migrated) return;

      try {
        const supabase = getSupabaseBrowserClient();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const oldToken = localStorage.getItem('sb-auth-token');

          if (oldToken) {
            localStorage.removeItem('sb-auth-token');
            localStorage.removeItem('supabase.auth.token');
          }
        } else {
        }

        setMigrated(true);
      } catch (error) {
        console.error('[AuthSessionMigration] Migration failed:', error);
        setMigrated(true);
      }
    }

    migrateSession();
  }, [migrated]);

  // This component doesn't render anything
  return null;
}
