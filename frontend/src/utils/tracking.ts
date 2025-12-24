// Utility for collecting user tracking information
export interface UserTrackingInfo {
  userIp?: string;
  geoLocation?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  browserInfo: string;
  deviceType: string;
  operatingSystem: string;
  trafficSource?: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export class TrackingService {
  static async collectTrackingInfo(): Promise<UserTrackingInfo> {
    const trackingInfo: UserTrackingInfo = {
      browserInfo: this.getBrowserInfo(),
      deviceType: this.getDeviceType(),
      operatingSystem: this.getOperatingSystem(),
      referrerUrl: document.referrer || undefined,
    };

    // Get UTM parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    trackingInfo.utmSource = urlParams.get('utm_source') || undefined;
    trackingInfo.utmMedium = urlParams.get('utm_medium') || undefined;
    trackingInfo.utmCampaign = urlParams.get('utm_campaign') || undefined;

    // Determine traffic source
    trackingInfo.trafficSource = this.determineTrafficSource(
      trackingInfo.referrerUrl,
      trackingInfo.utmSource
    );

    // Try to get IP and geolocation (requires external API)
    try {
      const geoData = await this.getGeoLocation();
      trackingInfo.userIp = geoData.ip;
      trackingInfo.geoLocation = {
        country: geoData.country,
        city: geoData.city,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
      };
    } catch (error) {
      console.error('Error getting geolocation:', error);
    }

    return trackingInfo;
  }

  static getBrowserInfo(): string {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = '';

    if (ua.indexOf('Firefox') > -1) {
      browserName = 'Firefox';
      browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || '';
    } else if (ua.indexOf('Chrome') > -1) {
      browserName = 'Chrome';
      browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || '';
    } else if (ua.indexOf('Safari') > -1) {
      browserName = 'Safari';
      browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1] || '';
    } else if (ua.indexOf('Edge') > -1) {
      browserName = 'Edge';
      browserVersion = ua.match(/Edge\/(\d+\.\d+)/)?.[1] || '';
    } else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) {
      browserName = 'Internet Explorer';
    }

    return `${browserName}${browserVersion ? ' ' + browserVersion : ''}`;
  }

  static getDeviceType(): string {
    const ua = navigator.userAgent;
    
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  static getOperatingSystem(): string {
    const ua = navigator.userAgent;
    
    if (ua.indexOf('Win') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'MacOS';
    if (ua.indexOf('X11') > -1 || ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
    
    return 'Unknown';
  }

  static determineTrafficSource(referrerUrl?: string, utmSource?: string): string {
    if (utmSource) {
      if (utmSource.toLowerCase().includes('facebook')) return 'facebook_ads';
      if (utmSource.toLowerCase().includes('google')) return 'google_ads';
      if (utmSource.toLowerCase().includes('instagram')) return 'instagram_ads';
      if (utmSource.toLowerCase().includes('tiktok')) return 'tiktok_ads';
      return utmSource;
    }

    if (!referrerUrl) return 'direct';

    const ref = referrerUrl.toLowerCase();
    if (ref.includes('facebook.com') || ref.includes('fb.com')) return 'facebook';
    if (ref.includes('google.com')) return 'organic_search';
    if (ref.includes('instagram.com')) return 'instagram';
    if (ref.includes('twitter.com') || ref.includes('t.co')) return 'twitter';
    if (ref.includes('linkedin.com')) return 'linkedin';
    if (ref.includes('youtube.com')) return 'youtube';
    
    return 'referral';
  }

  static async getGeoLocation(): Promise<{
    ip: string;
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  }> {
    try {
      // Using ipapi.co free API (100 requests per day)
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('Failed to fetch geolocation');
      
      const data = await response.json();
      return {
        ip: data.ip || 'unknown',
        country: data.country_name || 'Unknown',
        city: data.city || 'Unknown',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
      };
    } catch (error) {
      // Fallback to basic info
      return {
        ip: 'unknown',
        country: 'Unknown',
        city: 'Unknown',
        latitude: 0,
        longitude: 0,
      };
    }
  }

  static saveTrackingToLocalStorage(trackingInfo: UserTrackingInfo): void {
    localStorage.setItem('userTracking', JSON.stringify(trackingInfo));
  }

  static loadTrackingFromLocalStorage(): UserTrackingInfo | null {
    const data = localStorage.getItem('userTracking');
    return data ? JSON.parse(data) : null;
  }
}
