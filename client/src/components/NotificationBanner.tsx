import React, { useState } from 'react';
import notificationService from '../services/notificationService';
import './NotificationBanner.css';

const NotificationBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(true);
  const [isEnabling, setIsEnabling] = useState(false);

  const handleEnableNotifications = async () => {
    setIsEnabling(true);
    const enabled = await notificationService.enableNotifications();
    setIsEnabling(false);
    
    if (enabled) {
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="notification-banner">
      <div className="banner-content">
        <div className="banner-icon">🔔</div>
        <div className="banner-text">
          <h4>Get Order Notifications!</h4>
          <p>Enable push notifications to get instant alerts when customers place orders</p>
        </div>
        <div className="banner-actions">
          <button 
            onClick={handleEnableNotifications}
            disabled={isEnabling}
            className="btn btn-primary btn-sm"
          >
            {isEnabling ? 'Enabling...' : 'Enable'}
          </button>
          <button 
            onClick={handleDismiss}
            className="btn btn-secondary btn-sm"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBanner;








