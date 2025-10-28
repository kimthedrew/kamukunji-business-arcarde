import axios from 'axios';

class NotificationService {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.registration = null;
  }

  async requestPermission() {
    if (!this.isSupported) {
      console.log('Push notifications are not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }

  async subscribe() {
    if (!this.isSupported) {
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID key from server
      const response = await axios.get('http://localhost:5000/api/notifications/vapid-key');
      const publicKey = response.data.publicKey;

      // Subscribe to push notifications
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });

      // Send subscription to server
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post('http://localhost:5000/api/notifications/subscribe', {
          subscription
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      return true;
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      return false;
    }
  }

  async enableNotifications() {
    const hasPermission = await this.requestPermission();
    if (hasPermission) {
      return await this.subscribe();
    }
    return false;
  }
}

export default new NotificationService();



