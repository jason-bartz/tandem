/**
 * GameCenterProviderWeb - Web stub implementation for Game Center
 *
 * This is a placeholder implementation for web platforms where Game Center is not available.
 * It provides the same interface but returns "not available" for all operations.
 */

export class GameCenterProviderWeb {
  constructor() {}

  async authenticateLocalPlayer() {
    return {
      authenticated: false,
      error: 'Game Center is only available on iOS devices',
    };
  }

  async isAuthenticated() {
    return {
      authenticated: false,
      error: 'Game Center is only available on iOS devices',
    };
  }

  async syncStatsWithGameCenter() {
    return {
      stats: null,
      error: 'Game Center is only available on iOS devices',
    };
  }

  async fetchAchievements() {
    return {
      achievements: [],
      error: 'Game Center is only available on iOS devices',
    };
  }

  async batchSubmitScores() {
    return {
      success: false,
      error: 'Game Center is only available on iOS devices',
    };
  }

  async reportAchievement() {
    return {
      success: false,
      error: 'Game Center is only available on iOS devices',
    };
  }

  async getDebugInfo() {
    return {
      platform: 'web',
      available: false,
      message: 'Game Center is only available on iOS devices',
    };
  }
}

export default GameCenterProviderWeb;
