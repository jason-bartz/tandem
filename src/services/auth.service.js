import { API_ENDPOINTS } from '@/lib/constants';
import { getApiUrl } from '@/lib/api-helper';

class AuthService {
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
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
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
}

export default new AuthService();