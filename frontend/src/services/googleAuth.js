// Google OAuth service for frontend using Google Identity Services
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id';

class GoogleAuthService {
  constructor() {
    this.clientId = GOOGLE_CLIENT_ID;
    this.isInitialized = false;
  }

  // Initialize Google Identity Services
  async initializeGoogleAuth() {
    try {
      if (this.isInitialized) return true;
      
      // Load Google Identity Services script
      if (!window.google) {
        await this.loadGoogleScript();
      }
      
      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: this.clientId,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true
      });

      this.isInitialized = true;
      console.log('✅ Google Identity Services initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Auth:', error);
      return false;
    }
  }

  // Load Google Identity Services script
  loadGoogleScript() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.accounts) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('✅ Google Identity Services script loaded');
        resolve();
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load Google script:', error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  // Handle Google credential response
  handleCredentialResponse(response) {
    console.log('🔐 Google credential response received');
    return response.credential;
  }

  // Sign in with Google using OAuth 2.0 flow
  async signInWithGoogle() {
    try {
      if (!this.isInitialized) {
        await this.initializeGoogleAuth();
      }

      if (!window.google || !window.google.accounts) {
        throw new Error('Google Identity Services not loaded');
      }

      return new Promise((resolve, reject) => {
        // Use OAuth 2.0 token client for explicit sign-in
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: 'openid email profile',
          callback: (response) => {
            if (response.error) {
              console.error('❌ Google OAuth error:', response.error);
              reject(new Error(response.error));
            } else {
              console.log('✅ Google OAuth token received');
              // Get user info using the access token
              this.getUserInfo(response.access_token)
                .then(userInfo => {
                  resolve({
                    access_token: response.access_token,
                    userInfo: userInfo
                  });
                })
                .catch(error => {
                  console.error('❌ Failed to get user info:', error);
                  reject(error);
                });
            }
          }
        });

        // Request access token
        tokenClient.requestAccessToken();
      });
    } catch (error) {
      console.error('❌ Google Sign-In error:', error);
      throw error;
    }
  }

  // Get user info from Google using access token
  async getUserInfo(accessToken) {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }
      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get user info:', error);
      throw error;
    }
  }

  // Alternative method using redirect
  async signInWithGoogleRedirect() {
    try {
      if (!this.isInitialized) {
        await this.initializeGoogleAuth();
      }

      const redirectUri = window.location.origin;
      const scope = 'openid email profile';
      const responseType = 'code';
      
      const authUrl = `https://accounts.google.com/oauth/authorize?` +
        `client_id=${this.clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=${responseType}&` +
        `access_type=offline&` +
        `prompt=consent`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('❌ Google redirect sign-in error:', error);
      throw error;
    }
  }

  // Sign out from Google
  signOut() {
    try {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.disableAutoSelect();
        console.log('✅ Google sign-out completed');
      }
    } catch (error) {
      console.error('❌ Google sign-out error:', error);
    }
  }

  // Check if Google services are available
  isGoogleAvailable() {
    return !!(window.google && window.google.accounts);
  }

  // Get user info from credential (basic parsing)
  parseCredential(credential) {
    try {
      // Decode the JWT token (basic parsing)
      const parts = credential.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT token format');
      }

      const payload = JSON.parse(atob(parts[1]));
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        email_verified: payload.email_verified
      };
    } catch (error) {
      console.error('❌ Failed to parse Google credential:', error);
      throw error;
    }
  }
}

export default new GoogleAuthService();