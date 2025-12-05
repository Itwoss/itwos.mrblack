import api from './api';

/**
 * Analytics Service
 * Handles tracking of user events and analytics data
 */
class AnalyticsService {
  constructor() {
    this.pageStartTime = null;
    this.currentPath = null;
    this.deviceInfo = this.getDeviceInfo();
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = 'unknown';
    let os = 'unknown';
    let deviceType = 'desktop';

    // Detect browser
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    // Detect OS
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    // Detect device type
    if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
      deviceType = 'mobile';
    } else if (ua.includes('Tablet') || ua.includes('iPad')) {
      deviceType = 'tablet';
    }

    return {
      browser,
      os,
      deviceType,
      userAgent: ua
    };
  }

  /**
   * Track a page view
   * @param {string} path - The current path/route
   * @param {string} screen - Optional screen name
   */
  async trackPageView(path, screen = null) {
    try {
      // End previous page stay time if exists
      if (this.currentPath && this.pageStartTime) {
        const duration = Math.floor((Date.now() - this.pageStartTime) / 1000);
        if (duration > 0) {
          await this.trackPageStayTime(this.currentPath, duration);
        }
      }

      // Start new page tracking
      this.currentPath = path;
      this.pageStartTime = Date.now();

      // Send page view event
      await api.post('/analytics/track', {
        eventType: 'page_view',
        path,
        screen: screen || path,
        deviceInfo: this.deviceInfo
      });
    } catch (error) {
      console.error('Error tracking page view:', error);
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  /**
   * Track page stay time
   * @param {string} path - The path user was on
   * @param {number} duration - Duration in seconds
   */
  async trackPageStayTime(path, duration) {
    try {
      await api.post('/analytics/track', {
        eventType: 'page_stay_time',
        path,
        screen: path,
        duration,
        deviceInfo: this.deviceInfo
      });
    } catch (error) {
      console.error('Error tracking page stay time:', error);
    }
  }

  /**
   * Track call start
   * @param {string} callType - 'audio' or 'video'
   * @param {string} receiverId - User ID of the receiver
   * @param {string} path - Current path
   */
  async trackCallStart(callType, receiverId, path = null) {
    try {
      await api.post('/analytics/track', {
        eventType: 'call_start',
        path: path || `/call/${callType}`,
        screen: `${callType}-call`,
        targetUserId: receiverId,
        callType,
        deviceInfo: this.deviceInfo
      });
    } catch (error) {
      console.error('Error tracking call start:', error);
    }
  }

  /**
   * Track call end
   * @param {string} callType - 'audio' or 'video'
   * @param {string} receiverId - User ID of the receiver
   * @param {number} duration - Call duration in seconds
   * @param {string} path - Current path
   */
  async trackCallEnd(callType, receiverId, duration, path = null) {
    try {
      await api.post('/analytics/track', {
        eventType: 'call_end',
        path: path || `/call/${callType}`,
        screen: `${callType}-call`,
        targetUserId: receiverId,
        callType,
        duration,
        deviceInfo: this.deviceInfo
      });
    } catch (error) {
      console.error('Error tracking call end:', error);
    }
  }

  /**
   * Track video play
   * @param {string} videoId - ID of the video
   * @param {string} path - Current path
   */
  async trackVideoPlay(videoId, path = null) {
    try {
      await api.post('/analytics/track', {
        eventType: 'video_play',
        path: path || '/feed',
        screen: 'video-player',
        relatedId: videoId,
        deviceInfo: this.deviceInfo
      });
    } catch (error) {
      console.error('Error tracking video play:', error);
    }
  }

  /**
   * Track video pause
   * @param {string} videoId - ID of the video
   * @param {number} watchDuration - Duration watched in seconds
   * @param {string} path - Current path
   */
  async trackVideoPause(videoId, watchDuration, path = null) {
    try {
      await api.post('/analytics/track', {
        eventType: 'video_pause',
        path: path || '/feed',
        screen: 'video-player',
        relatedId: videoId,
        duration: watchDuration,
        deviceInfo: this.deviceInfo
      });
    } catch (error) {
      console.error('Error tracking video pause:', error);
    }
  }

  /**
   * Track video complete
   * @param {string} videoId - ID of the video
   * @param {number} watchDuration - Total duration watched in seconds
   * @param {string} path - Current path
   */
  async trackVideoComplete(videoId, watchDuration, path = null) {
    try {
      await api.post('/analytics/track', {
        eventType: 'video_complete',
        path: path || '/feed',
        screen: 'video-player',
        relatedId: videoId,
        duration: watchDuration,
        deviceInfo: this.deviceInfo
      });
    } catch (error) {
      console.error('Error tracking video complete:', error);
    }
  }

  /**
   * Track chat room entered
   * @param {string} chatRoomId - ID of the chat room
   * @param {string} path - Current path
   */
  async trackChatRoomEntered(chatRoomId, path = null) {
    try {
      await api.post('/analytics/track', {
        eventType: 'chat_room_entered',
        path: path || `/chat/${chatRoomId}`,
        screen: 'chat',
        relatedId: chatRoomId,
        deviceInfo: this.deviceInfo
      });
    } catch (error) {
      console.error('Error tracking chat room entered:', error);
    }
  }

  /**
   * Track chat room left
   * @param {string} chatRoomId - ID of the chat room
   * @param {number} duration - Time spent in chat room in seconds
   * @param {string} path - Current path
   */
  async trackChatRoomLeft(chatRoomId, duration, path = null) {
    try {
      await api.post('/analytics/track', {
        eventType: 'chat_room_left',
        path: path || `/chat/${chatRoomId}`,
        screen: 'chat',
        relatedId: chatRoomId,
        duration,
        deviceInfo: this.deviceInfo
      });
    } catch (error) {
      console.error('Error tracking chat room left:', error);
    }
  }

  /**
   * Track custom event
   * @param {string} eventType - Type of event
   * @param {object} data - Event data
   */
  async trackCustomEvent(eventType, data = {}) {
    try {
      await api.post('/analytics/track', {
        eventType,
        path: data.path || window.location.pathname,
        screen: data.screen || null,
        targetUserId: data.targetUserId || null,
        relatedId: data.relatedId || null,
        callType: data.callType || null,
        duration: data.duration || 0,
        deviceInfo: this.deviceInfo,
        metadata: data.metadata || {}
      });
    } catch (error) {
      console.error('Error tracking custom event:', error);
    }
  }

  /**
   * Cleanup - call this when component unmounts or user navigates away
   */
  cleanup() {
    if (this.currentPath && this.pageStartTime) {
      const duration = Math.floor((Date.now() - this.pageStartTime) / 1000);
      if (duration > 0) {
        this.trackPageStayTime(this.currentPath, duration);
      }
    }
    this.pageStartTime = null;
    this.currentPath = null;
  }
}

// Export singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService;









