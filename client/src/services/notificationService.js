import api from '../utils/axiosConfig';

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
      const response = await api.get('/notifications/vapid-key');
      const publicKey = response.data.publicKey;

      // Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
          .replace(/\-/g, '+')
          .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      // Subscribe to push notifications
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      await api.post('/notifications/subscribe', {
        subscription
      });

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

const notificationService = new NotificationService();
export default notificationService;



