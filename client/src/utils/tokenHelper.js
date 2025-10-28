// Token validation and cleanup helper
class TokenHelper {
  static INVALID_SHOP_CODES = ['INVALID_SHOP', 'SHOP_CLOSED'];
  
  // Check if an error response indicates an invalid token
  static isInvalidTokenError(error) {
    if (!error?.response?.data) return false;
    
    const { code, message } = error.response.data;
    return this.INVALID_SHOP_CODES.includes(code) || 
           message?.includes('Invalid shop') ||
           message?.includes('Please log in again');
  }
  
  // Clear all authentication data
  static clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    // Clear any other auth-related data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth') || key.includes('token') || key.includes('user'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  // Handle invalid token error
  static handleInvalidToken(error) {
    if (this.isInvalidTokenError(error)) {
      console.warn('Invalid token detected, clearing auth data...');
      this.clearAuthData();
      
      // Redirect to login page
      if (window.location.pathname !== '/shop/login') {
        window.location.href = '/shop/login';
      }
      
      return true;
    }
    return false;
  }
  
  // Validate token before making requests
  static validateToken() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return false;
    
    try {
      // Basic JWT decode (without verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Check if token is expired
      if (payload.exp && payload.exp < now) {
        console.warn('Token expired, clearing auth data...');
        this.clearAuthData();
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('Invalid token format, clearing auth data...');
      this.clearAuthData();
      return false;
    }
  }
}

export default TokenHelper;


