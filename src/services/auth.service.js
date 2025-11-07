import { API_ENDPOINTS } from '@/lib/constants';
import { getApiUrl } from '@/lib/api-helper';

class AuthService {
  constructor() {
    this.csrfToken = null;
  }

  setCSRFToken(token) {
    this.csrfToken = token;
  }

  getCSRFToken() {
    return this.csrfToken;
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
        // Store CSRF token if provided
        if (data.csrfToken) {
          this.setCSRFToken(data.csrfToken);
        }
        return {
          success: true,
          token: data.token,
          user: data.user,
        };
      }

      return {
        success: false,
        error: data.error || 'Login failed',
      };
    } catch (error) {
      console.error('AuthService.login error:', error);
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
        // Update CSRF token if provided
        if (data.csrfToken) {
          this.setCSRFToken(data.csrfToken);
          console.log('CSRF token updated from token verification');
        } else {
          console.warn('No CSRF token received from token verification');
        }
        return data.valid === true;
      }

      return false;
    } catch (error) {
      console.error('AuthService.verifyToken error:', error);
      return false;
    }
  }

  logout() {
    localStorage.removeItem('adminToken');
    this.csrfToken = null;
  }

  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminToken');
    }
    return null;
  }

  isAuthenticated() {
    return this.getToken() !== null;
  }

  // Helper method to get headers with CSRF token for write operations
  getAuthHeaders(includeCSRF = false) {
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (includeCSRF) {
      if (this.csrfToken) {
        headers['x-csrf-token'] = this.csrfToken;
        console.log('Including CSRF token in headers:', this.csrfToken.substring(0, 8) + '...');
      } else {
        console.error('CSRF token requested but not available! This will cause request to fail.');
      }
    }

    return headers;
  }
}

export default new AuthService();
