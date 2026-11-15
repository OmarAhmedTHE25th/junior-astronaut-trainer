// ─── Junior Astronaut Mission Trainer – Realtime Match Client ───
// Serverless-friendly real-time state synchronization adapter.
// Uses Server-Sent Events (SSE) with seamless optimistic JSON polling fallback.

import type {
  SquadMatch,
  SquadRole,
  TacticalCommsMessage,
} from './matchmakingTypes';

export interface RealtimeClientOptions {
  matchId: string;
  playerId: string;
  playerName: string;
  onStateUpdate: (match: SquadMatch) => void;
  onCommsMessage?: (message: TacticalCommsMessage) => void;
  onError?: (error: Error) => void;
}

export class SquadRealtimeClient {
  private matchId: string;
  private playerId: string;
  private playerName: string;
  private onStateUpdate: (match: SquadMatch) => void;
  private onCommsMessage?: (message: TacticalCommsMessage) => void;
  private onError?: (error: Error) => void;

  private eventSource: EventSource | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pollFallbackTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;
  private sseFailed = false;

  constructor(options: RealtimeClientOptions) {
    this.matchId = options.matchId;
    this.playerId = options.playerId;
    this.playerName = options.playerName;
    this.onStateUpdate = options.onStateUpdate;
    this.onCommsMessage = options.onCommsMessage;
    this.onError = options.onError;

    this.connect();
    this.startHeartbeat();
  }

  private connect(): void {
    if (typeof window === 'undefined' || this.isDestroyed) return;

    try {
      // Connect to Server-Sent Events (SSE) route
      this.eventSource = new EventSource(`/api/match/${this.matchId}/stream`);

      this.eventSource.addEventListener('match_state', (event) => {
        try {
          const match: SquadMatch = JSON.parse(event.data);
          this.onStateUpdate(match);
        } catch (err) {
          console.error('Failed to parse match_state event:', err);
        }
      });

      this.eventSource.onerror = () => {
        // Fallback to high-frequency polling if SSE connection drops or is blocked
        if (!this.sseFailed) {
          this.sseFailed = true;
          this.startPollingFallback();
        }
      };
    } catch {
      this.startPollingFallback();
    }
  }

  private startPollingFallback(): void {
    if (this.pollFallbackTimer || this.isDestroyed) return;

    this.pollFallbackTimer = setInterval(async () => {
      if (this.isDestroyed) return;
      try {
        const res = await fetch(`/api/match/${this.matchId}/stream?poll=true`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.match) {
          this.onStateUpdate(data.match);
        }
      } catch (err) {
        if (this.onError && err instanceof Error) {
          this.onError(err);
        }
      }
    }, 1200);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    // 3-second heartbeat to maintain last_seen_at in Neon Postgres
    this.heartbeatTimer = setInterval(async () => {
      if (this.isDestroyed) return;
      try {
        await fetch(`/api/match/${this.matchId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: this.playerId,
            actionType: 'HEARTBEAT',
            payload: {},
          }),
        });
      } catch {
        // Silent catch for intermittent network drops
      }
    }, 3000);
  }

  // ── Tactical Actions & RPCs ───────────────────────────────

  public async setRole(role: SquadRole): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/match/${this.matchId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          actionType: 'ROLE_CHANGE',
          payload: { role },
        }),
      });
      const data = await res.json();
      if (data.success && data.match) {
        this.onStateUpdate(data.match);
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to switch role' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  public async setReady(isReady: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/match/${this.matchId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          actionType: 'READY_TOGGLE',
          payload: { isReady },
        }),
      });
      const data = await res.json();
      if (data.success && data.match) {
        this.onStateUpdate(data.match);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  public async performTacticalAction(
    actionName: string,
    icon: string,
    deltas: { power?: number; oxygen?: number; water?: number; shielding?: number; morale?: number }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/match/${this.matchId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          actionType: 'PERFORM_ACTION',
          payload: { actionName, icon, deltas },
        }),
      });
      const data = await res.json();
      if (data.success && data.match) {
        this.onStateUpdate(data.match);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  public async sendTacticalChat(
    text: string,
    isQuickPing = false,
    role: SquadRole = 'commander'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/match/${this.matchId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          actionType: 'TACTICAL_CHAT',
          payload: {
            text,
            isQuickPing,
            playerName: this.playerName,
            role,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.match) {
        this.onStateUpdate(data.match);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pollFallbackTimer) {
      clearInterval(this.pollFallbackTimer);
      this.pollFallbackTimer = null;
    }
  }
}
