import { API_ENDPOINTS } from '@/lib/constants';
import { getApiUrl } from '@/lib/api-helper';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';

class AuthService {
  constructor() {
    this.csrfToken = null;
    this.cachedToken = null;
    this.currentUser = null;
    // Try to restore CSRF token from sessionStorage on init
    if (typeof window !== 'undefined') {
      const storedToken = sessionStorage.getItem('csrfToken');
      if (storedToken) {
        this.csrfToken = storedToken;
      }
      // Restore user data from sessionStorage
      const storedUser = sessionStorage.getItem('adminUser');
      if (storedUser) {
        try {
          this.currentUser = JSON.parse(storedUser);
        } catch {
          // ignore
        }
      }
    }
  }

  setCSRFToken(token) {
    this.csrfToken = token;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('csrfToken', token);
    }
  }

  getCSRFToken() {
    if (!this.csrfToken && typeof window !== 'undefined') {
      this.csrfToken = sessionStorage.getItem('csrfToken');
    }
    return this.csrfToken;
  }

  setCurrentUser(user) {
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('adminUser', JSON.stringify(user));
    }
  }

  getCurrentUser() {
    if (!this.currentUser && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('adminUser');
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }
    return this.currentUser;
  }

  async login(username, password) {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.ADMIN_AUTH), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.csrfToken) {
          this.setCSRFToken(data.csrfToken);
        }
        if (data.user) {
          this.setCurrentUser(data.user);
        }
        this.cachedToken = data.token;
        return {
          success: true,
          token: data.token,
          user: data.user,
        };
      }

      return {
        success: false,
        error: data.error || 'Login failed',
        remainingAttempts: data.remainingAttempts,
        locked: data.locked,
      };
    } catch (error) {
      logger.error('AuthService.login error', error);
      throw error;
    }
  }

  async verifyToken(token) {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.ADMIN_AUTH), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.csrfToken) {
          this.setCSRFToken(data.csrfToken);
        } else {
          logger.warn('No CSRF token received from token verification');
        }
        if (data.user) {
          this.setCurrentUser(data.user);
        }
        this.cachedToken = token;
        return data.valid === true;
      }

      return false;
    } catch (error) {
      logger.error('AuthService.verifyToken error', error);
      return false;
    }
  }

  async logout() {
    await storageService.remove('adminToken');
    this.cachedToken = null;
    this.csrfToken = null;
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('csrfToken');
      sessionStorage.removeItem('adminUser');
    }
  }

  async getToken() {
    if (typeof window === 'undefined') {
      return null;
    }
    if (this.cachedToken) {
      return this.cachedToken;
    }
    const token = await storageService.get('adminToken');
    this.cachedToken = token;
    return token;
  }

  async isAuthenticated() {
    const token = await this.getToken();
    return token !== null;
  }

  async getAuthHeaders(includeCSRF = false) {
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = await this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (includeCSRF) {
      if (this.csrfToken) {
        headers['x-csrf-token'] = this.csrfToken;
      } else {
        logger.error(
          'CSRF token requested but not available! This will cause request to fail',
          null
        );
      }
    }

    return headers;
  }
}

export default new AuthService();
