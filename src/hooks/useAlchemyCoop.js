'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getApiUrl, capacitorFetch } from '@/lib/api-config';
import { SOUP_API, SOUP_STORAGE_KEYS, COOP_CONFIG } from '@/lib/daily-alchemy.constants';
import logger from '@/lib/logger';

/**
 * useAlchemyCoop - Manages co-op session, Supabase Realtime sync, and partner state
 *
 * Separate from useDailyAlchemyGame to keep concerns isolated.
 * Communicates with the game hook via callbacks.
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Whether co-op mode is active
 * @param {string|null} options.sessionId - Current session ID
 * @param {Object|null} options.user - Current authenticated user
 * @param {Object|null} options.userProfile - Current user's profile (username, avatar)
 * @param {Function} options.onPartnerElement - Callback when partner discovers new element
 * @param {Function} options.onSessionEnded - Callback when session ends
 * @param {Function} options.onPartnerJoined - Callback when partner joins the session
 * @param {Function} options.onPartnerGameOver - Callback when partner's timer expires (daily co-op)
 * @param {Function} options.onPartnerMove - Callback when partner makes a first-time combination (shared move counter)
 * @param {Function} options.onPartnerContinueCreative - Callback when partner opts in to continue creative mode
 * @param {Function} options.onPartnerDeclineCreative - Callback when partner declines to continue creative mode
 */
export function useAlchemyCoop({
  enabled = false,
  sessionId: externalSessionId = null,
  user = null,
  userProfile = null,
  onPartnerElement,
  onSessionEnded,
  onPartnerJoined,
  onPartnerGameOver,
  onPartnerMove,
  onPartnerContinueCreative,
  onPartnerDeclineCreative,
}) {
  // Session state
  const [sessionId, setSessionId] = useState(externalSessionId);
  const [inviteCode, setInviteCode] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  // Partner state
  const [partner, setPartner] = useState(null);
  const [partnerStatus, setPartnerStatus] = useState(null);

  // Emote state
  const [receivedEmote, setReceivedEmote] = useState(null);
  const [lastEmoteSentAt, setLastEmoteSentAt] = useState(0);

  // Error state
  const [error, setError] = useState(null);

  // Refs
  const channelRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const emoteTimeoutRef = useRef(null);
  const partnerPresenceRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);

  // Callback refs — prevent stale closures in Supabase channel listeners
  const onPartnerElementRef = useRef(onPartnerElement);
  const onSessionEndedRef = useRef(onSessionEnded);
  const onPartnerJoinedRef = useRef(onPartnerJoined);
  useEffect(() => {
    onPartnerElementRef.current = onPartnerElement;
  }, [onPartnerElement]);
  useEffect(() => {
    onSessionEndedRef.current = onSessionEnded;
  }, [onSessionEnded]);
  useEffect(() => {
    onPartnerJoinedRef.current = onPartnerJoined;
  }, [onPartnerJoined]);
  const onPartnerGameOverRef = useRef(onPartnerGameOver);
  useEffect(() => {
    onPartnerGameOverRef.current = onPartnerGameOver;
  }, [onPartnerGameOver]);
  const onPartnerMoveRef = useRef(onPartnerMove);
  useEffect(() => {
    onPartnerMoveRef.current = onPartnerMove;
  }, [onPartnerMove]);
  const onPartnerContinueCreativeRef = useRef(onPartnerContinueCreative);
  useEffect(() => {
    onPartnerContinueCreativeRef.current = onPartnerContinueCreative;
  }, [onPartnerContinueCreative]);
  const onPartnerDeclineCreativeRef = useRef(onPartnerDeclineCreative);
  useEffect(() => {
    onPartnerDeclineCreativeRef.current = onPartnerDeclineCreative;
  }, [onPartnerDeclineCreative]);

  // Sync external sessionId changes
  useEffect(() => {
    if (externalSessionId) {
      setSessionId(externalSessionId);
    }
  }, [externalSessionId]);

  /**
   * Compute partner status from presence data
   */
  const computePartnerStatus = useCallback(() => {
    const presence = partnerPresenceRef.current;
    if (!presence) {
      setPartnerStatus('disconnected');
      return;
    }

    const now = Date.now();
    const timeSinceInteraction = now - (presence.lastInteractionAt || 0);

    if (presence.status === 'backgrounded' || timeSinceInteraction > COOP_CONFIG.PRESENCE_IDLE_MS) {
      setPartnerStatus('idle');
    } else if (timeSinceInteraction > COOP_CONFIG.PRESENCE_DISCONNECT_MS) {
      setPartnerStatus('disconnected');
    } else {
      setPartnerStatus('active');
    }
  }, []);

  /**
   * Set up Supabase Realtime channel for the session
   */
  const setupChannel = useCallback(
    (sid) => {
      if (!sid || !user) return;

      const supabase = getSupabaseBrowserClient();
      const channelName = `coop:${sid}`;

      // Clean up existing channel
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: user.id },
        },
      });

      // Broadcast listeners (use refs to always call latest callbacks)
      channel.on('broadcast', { event: 'new_element' }, ({ payload }) => {
        if (payload.addedBy !== user.id) {
          onPartnerElementRef.current?.({
            name: payload.element.name,
            emoji: payload.element.emoji,
            isFirstDiscovery: payload.element.isFirstDiscovery,
            addedByUsername: payload.addedByUsername,
          });
        }
      });

      channel.on('broadcast', { event: 'emote' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          // Clear any existing emote timeout
          if (emoteTimeoutRef.current) {
            clearTimeout(emoteTimeoutRef.current);
          }

          setReceivedEmote({
            emoji: payload.emoji,
            username: payload.username,
            timestamp: Date.now(),
          });

          // Auto-clear after display duration
          emoteTimeoutRef.current = setTimeout(() => {
            setReceivedEmote(null);
          }, COOP_CONFIG.EMOTE_DISPLAY_MS);
        }
      });

      channel.on('broadcast', { event: 'session_ended' }, ({ payload }) => {
        if (payload.endedBy !== user.id) {
          onSessionEndedRef.current?.('partner_left');
        }
      });

      channel.on('broadcast', { event: 'game_over' }, ({ payload }) => {
        if (payload.endedBy !== user.id) {
          onPartnerGameOverRef.current?.();
        }
      });

      channel.on('broadcast', { event: 'save_completed' }, ({ payload }) => {
        if (payload.savedBy !== user.id) {
          // This is informational — the game component can show a toast
          logger.info('[Coop] Partner saved the session', {
            savedBy: payload.savedByUsername,
          });
        }
      });

      channel.on('broadcast', { event: 'move_increment' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          onPartnerMoveRef.current?.();
        }
      });

      channel.on('broadcast', { event: 'creative_continue' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          onPartnerContinueCreativeRef.current?.();
        }
      });

      channel.on('broadcast', { event: 'creative_decline' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          onPartnerDeclineCreativeRef.current?.();
        }
      });

      // Presence listeners
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Find the partner's presence (the one that isn't us)
        for (const [key, presences] of Object.entries(state)) {
          if (key !== user.id && presences.length > 0) {
            const partnerPresence = presences[0];
            partnerPresenceRef.current = partnerPresence;
            setPartner({
              userId: partnerPresence.user_id,
              username: partnerPresence.username,
              avatarPath: partnerPresence.avatarPath,
            });
            computePartnerStatus();
          }
        }
      });

      channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== user.id && newPresences.length > 0) {
          const partnerPresence = newPresences[0];
          partnerPresenceRef.current = partnerPresence;
          setPartner({
            userId: partnerPresence.user_id,
            username: partnerPresence.username,
            avatarPath: partnerPresence.avatarPath,
          });
          setPartnerStatus('active');
          setIsWaiting(false);
          onPartnerJoinedRef.current?.(partnerPresence);
        }
      });

      channel.on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== user.id) {
          partnerPresenceRef.current = null;
          setPartnerStatus('disconnected');
        }
      });

      // Subscribe
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);

          // Track own presence
          await channel.track({
            user_id: user.id,
            username: userProfile?.username || 'Anonymous',
            avatarPath: userProfile?.avatar_image_path || null,
            status: 'active',
            lastInteractionAt: Date.now(),
            joinedAt: Date.now(),
          });

          logger.info('[Coop] Channel subscribed', { channelName });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          logger.warn('[Coop] Channel disconnected', { status, channelName });
        }
      });

      channelRef.current = channel;

      // Start periodic heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(() => {
        if (channelRef.current && document.visibilityState === 'visible') {
          channelRef.current.track({
            user_id: user.id,
            username: userProfile?.username || 'Anonymous',
            avatarPath: userProfile?.avatar_image_path || null,
            status: 'active',
            lastInteractionAt: Date.now(),
            joinedAt: Date.now(),
          });
        }
      }, COOP_CONFIG.HEARTBEAT_INTERVAL_MS);

      // Start partner status check interval
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
      statusCheckIntervalRef.current = setInterval(computePartnerStatus, 30000);
    },
    [user, userProfile, computePartnerStatus] // Callbacks accessed via refs — no need in deps
  );

  /**
   * Handle visibility change (tab focus/blur)
   */
  useEffect(() => {
    if (!enabled || !channelRef.current || !user) return;

    const handleVisibilityChange = () => {
      if (!channelRef.current) return;

      const status = document.visibilityState === 'visible' ? 'active' : 'backgrounded';
      channelRef.current.track({
        user_id: user.id,
        username: userProfile?.username || 'Anonymous',
        avatarPath: userProfile?.avatar_image_path || null,
        status,
        lastInteractionAt: status === 'active' ? Date.now() : undefined,
        joinedAt: Date.now(),
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, user, userProfile]);

  /**
   * Clean up on unmount or when disabled
   */
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        const supabase = getSupabaseBrowserClient();
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
      if (emoteTimeoutRef.current) {
        clearTimeout(emoteTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Create a new co-op session
   */
  const createSession = useCallback(
    async (saveSlot = null, mode = 'creative') => {
      try {
        setError(null);
        const url = getApiUrl(SOUP_API.COOP_CREATE);
        const response = await capacitorFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ saveSlot, mode }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Failed to create session');
          return null;
        }

        const { session } = data;
        setSessionId(session.id);
        setInviteCode(session.inviteCode);
        setIsHost(true);
        setIsWaiting(true);

        // Persist session ID for reconnection
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(SOUP_STORAGE_KEYS.COOP_SESSION_ID, session.id);
        }

        // Set up realtime channel
        setupChannel(session.id);

        return {
          sessionId: session.id,
          inviteCode: session.inviteCode,
          elementBank: session.elementBank,
          hostFavorites: data.hostFavorites || [],
        };
      } catch (err) {
        logger.error('[Coop] Failed to create session', { error: err.message });
        setError('Failed to create session');
        return null;
      }
    },
    [setupChannel]
  );

  /**
   * Join an existing co-op session via invite code
   */
  const joinSession = useCallback(
    async (code) => {
      try {
        setError(null);
        const url = getApiUrl(SOUP_API.COOP_JOIN);
        const response = await capacitorFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode: code }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Failed to join session');
          return null;
        }

        const { session } = data;
        setSessionId(session.id);
        setInviteCode(null);
        setIsHost(false);
        setIsWaiting(false);
        setPartner({
          userId: null, // Will be set by presence
          username: session.hostUsername,
          avatarPath: session.hostAvatarPath,
        });
        setPartnerStatus('active');

        // Persist session ID for reconnection
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(SOUP_STORAGE_KEYS.COOP_SESSION_ID, session.id);
        }

        // Set up realtime channel
        setupChannel(session.id);

        return {
          sessionId: session.id,
          elementBank: session.elementBank,
          mode: session.mode || 'creative',
          totalMoves: session.totalMoves,
          totalDiscoveries: session.totalDiscoveries,
          firstDiscoveries: session.firstDiscoveries,
          firstDiscoveryElements: session.firstDiscoveryElements,
        };
      } catch (err) {
        logger.error('[Coop] Failed to join session', { error: err.message });
        setError('Failed to join session');
        return null;
      }
    },
    [setupChannel]
  );

  /**
   * Leave the current co-op session
   */
  const leaveSession = useCallback(async () => {
    try {
      if (sessionId) {
        // Broadcast that we're leaving
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'session_ended',
            payload: {
              endedBy: user?.id,
              reason: 'left',
            },
          });
        }

        // API call to end session
        const url = getApiUrl(SOUP_API.COOP_LEAVE);
        await capacitorFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      }

      // Clean up channel
      if (channelRef.current) {
        const supabase = getSupabaseBrowserClient();
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Reset state
      setSessionId(null);
      setInviteCode(null);
      setIsHost(false);
      setIsConnected(false);
      setIsWaiting(false);
      setPartner(null);
      setPartnerStatus(null);
      setReceivedEmote(null);

      // Clear persisted session ID
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(SOUP_STORAGE_KEYS.COOP_SESSION_ID);
      }
    } catch (err) {
      logger.error('[Coop] Failed to leave session', { error: err.message });
    }
  }, [sessionId, user]);

  /**
   * Save the current session to a creative save slot
   */
  const saveSession = useCallback(
    async (
      saveSlot,
      {
        elementBank,
        totalMoves,
        totalDiscoveries,
        firstDiscoveries,
        firstDiscoveryElements,
        favorites,
      } = {}
    ) => {
      try {
        if (!sessionId) return false;

        const url = getApiUrl(SOUP_API.COOP_SAVE);
        const response = await capacitorFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            saveSlot,
            elementBank,
            totalMoves,
            totalDiscoveries,
            firstDiscoveries,
            firstDiscoveryElements,
            favorites: favorites || [],
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Failed to save');
          return false;
        }

        // Broadcast save event to partner
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'save_completed',
            payload: {
              savedBy: user?.id,
              savedByUsername: userProfile?.username || 'Anonymous',
            },
          });
        }

        return true;
      } catch (err) {
        logger.error('[Coop] Failed to save session', { error: err.message });
        setError('Failed to save');
        return false;
      }
    },
    [sessionId, user, userProfile]
  );

  /**
   * Broadcast a new element discovery to the partner
   */
  const broadcastNewElement = useCallback(
    (element, combinedFrom = []) => {
      if (!channelRef.current || !user) return;

      channelRef.current.send({
        type: 'broadcast',
        event: 'new_element',
        payload: {
          element: {
            name: element.name,
            emoji: element.emoji,
            isFirstDiscovery: element.isFirstDiscovery || false,
          },
          addedBy: user.id,
          addedByUsername: userProfile?.username || 'Anonymous',
          combinedFrom,
        },
      });
    },
    [user, userProfile]
  );

  /**
   * Broadcast game over (timer expired) to the partner in daily co-op
   */
  const broadcastGameOver = useCallback(() => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'game_over',
      payload: {
        endedBy: user.id,
      },
    });
  }, [user]);

  /**
   * Broadcast a move increment to the partner (shared move counter)
   */
  const broadcastMoveIncrement = useCallback(() => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'move_increment',
      payload: { userId: user.id },
    });
  }, [user]);

  /**
   * Broadcast that this player wants to continue in creative mode after daily co-op
   */
  const broadcastContinueCreative = useCallback(() => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'creative_continue',
      payload: { userId: user.id },
    });
  }, [user]);

  /**
   * Broadcast that this player declines to continue in creative mode
   */
  const broadcastDeclineCreative = useCallback(() => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'creative_decline',
      payload: { userId: user.id },
    });
  }, [user]);

  /**
   * Send an emote to the partner
   */
  const sendEmote = useCallback(
    (emoji) => {
      if (!channelRef.current || !user) return;

      // Cooldown check
      const now = Date.now();
      if (now - lastEmoteSentAt < COOP_CONFIG.EMOTE_COOLDOWN_MS) return;

      channelRef.current.send({
        type: 'broadcast',
        event: 'emote',
        payload: {
          emoji,
          userId: user.id,
          username: userProfile?.username || 'Anonymous',
        },
      });

      setLastEmoteSentAt(now);
    },
    [user, userProfile, lastEmoteSentAt]
  );

  /**
   * Update presence (call on user interactions to keep status fresh)
   */
  const updatePresence = useCallback(() => {
    if (!channelRef.current || !user) return;

    channelRef.current.track({
      user_id: user.id,
      username: userProfile?.username || 'Anonymous',
      avatarPath: userProfile?.avatar_image_path || null,
      status: 'active',
      lastInteractionAt: Date.now(),
      joinedAt: Date.now(),
    });
  }, [user, userProfile]);

  /**
   * Sync element bank to the database (debounced, called by game hook)
   */
  const syncElementBank = useCallback(
    async (elementBank, stats) => {
      if (!sessionId) return;

      try {
        const supabase = getSupabaseBrowserClient();
        await supabase
          .from('alchemy_coop_sessions')
          .update({
            element_bank: elementBank,
            total_moves: stats.totalMoves || 0,
            total_discoveries: stats.totalDiscoveries || 0,
            first_discoveries: stats.firstDiscoveries || 0,
            first_discovery_elements: stats.firstDiscoveryElements || [],
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', sessionId);
      } catch (err) {
        logger.error('[Coop] Failed to sync element bank', { error: err.message });
      }
    },
    [sessionId]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    // Session management
    createSession,
    joinSession,
    leaveSession,
    saveSession,

    // Session state
    sessionId,
    inviteCode,
    isHost,
    isConnected,
    isWaiting,

    // Partner info
    partner,
    partnerStatus,

    // Emotes
    sendEmote,
    receivedEmote,
    emoteCooldownActive: Date.now() - lastEmoteSentAt < COOP_CONFIG.EMOTE_COOLDOWN_MS,

    // Broadcast helpers
    broadcastNewElement,
    broadcastGameOver,
    broadcastMoveIncrement,
    broadcastContinueCreative,
    broadcastDeclineCreative,
    updatePresence,
    syncElementBank,

    // Error state
    error,
    clearError,
  };
}

export default useAlchemyCoop;
