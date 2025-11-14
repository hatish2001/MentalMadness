import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiMethods } from '../api/client';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationContext = createContext({});

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    dailyReminder: true,
    reminderTime: '09:00',
    interventionReminders: true,
  });
  
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listen for notification interactions
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationResponse(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push token:', token);
      
      // Update token on backend
      try {
        await apiMethods.updateProfile({ pushNotificationToken: token });
      } catch (error) {
        console.error('Failed to update push token:', error);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  };

  const handleNotificationResponse = (response) => {
    const { notification } = response;
    const data = notification.request.content.data;

    // Handle different notification types
    switch (data?.type) {
      case 'daily_reminder':
        // Navigate to check-in screen
        // This would be handled by navigation ref in a real app
        break;
      case 'intervention_reminder':
        // Navigate to intervention screen
        break;
      case 'crisis_support':
        // Open crisis support resources
        break;
      default:
        break;
    }
  };

  const scheduleDailyReminder = async (time) => {
    // Cancel existing reminder
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Parse time (format: "HH:MM")
    const [hours, minutes] = time.split(':').map(Number);

    // Schedule daily notification
    const trigger = {
      hour: hours,
      minute: minutes,
      repeats: true,
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time for your daily check-in! 💙",
        body: "Take 2 minutes to check in with yourself",
        data: { type: 'daily_reminder' },
        sound: true,
        badge: 1,
      },
      trigger,
    });

    // Update settings
    const newSettings = { ...notificationSettings, reminderTime: time };
    setNotificationSettings(newSettings);
    
    // Update backend
    try {
      await apiMethods.updateNotificationSettings(newSettings);
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  };

  const toggleDailyReminder = async (enabled) => {
    if (!enabled) {
      // Cancel all notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
    } else {
      // Schedule with current time setting
      await scheduleDailyReminder(notificationSettings.reminderTime);
    }

    const newSettings = { ...notificationSettings, dailyReminder: enabled };
    setNotificationSettings(newSettings);
    
    // Update backend
    try {
      await apiMethods.updateNotificationSettings(newSettings);
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  };

  const sendLocalNotification = async (title, body, data = {}) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Send immediately
    });
  };

  const value = {
    expoPushToken,
    notification,
    notificationSettings,
    scheduleDailyReminder,
    toggleDailyReminder,
    sendLocalNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
