import * as Device from 'expo-device';
import { Platform } from 'react-native';
import chatService from './chatService';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

if (!isExpoGo) {
  // We can dynamically require here to prevent the top-level error on Android Expo Go
  try {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log('Error setting notification handler', e);
  }
}

export async function registerForPushNotificationsAsync() {
  let token;

  if (isExpoGo) {
    // Silently return null in Expo Go to avoid alarming the user with unsupported warnings
    return null;
  }

  const Notifications = require('expo-notifications');

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    } catch (e) {
      console.log('Failed to set notification channel', e);
    }
  }

  if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      // Get the Expo push token
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      console.log('[PUSH TOKEN]', token);
    } catch (e) {
      console.log('Error fetching push token:', e);
      return null;
    }

    // Send token to our backend
    try {
      await chatService.updatePushToken(token);
    } catch (err) {
      console.warn('Failed to save push token to backend:', err);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
