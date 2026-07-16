'use client'

import { getApp, getApps, initializeApp } from 'firebase/app'
import { getToken, getMessaging, isSupported } from 'firebase/messaging'
import { saveFcmDeviceToken, subscribeFcmTopic } from '@/lib/api/firebase'
import { isApiSuccess } from '@/lib/api/response'
import { env } from '@/lib/env'

const fcmStorageKeys = {
  token: 'fcmDeviceToken',
} as const

const hasBrowser = () => typeof window !== 'undefined'

const hasFirebaseMessagingConfig = () =>
  Boolean(
    env.firebaseApiKey &&
    env.firebaseMessagingSenderId &&
    env.firebaseAppId &&
    env.firebaseVapidKey,
  )

const getFirebaseApp = () => {
  if (getApps().length > 0) {
    return getApp()
  }

  return initializeApp({
    apiKey: env.firebaseApiKey,
    authDomain: 'nowdoboss.firebaseapp.com',
    projectId: 'nowdoboss',
    storageBucket: 'nowdoboss.appspot.com',
    messagingSenderId: env.firebaseMessagingSenderId,
    appId: env.firebaseAppId,
    measurementId: env.firebaseMeasurementId || undefined,
  })
}

const registerPushServiceWorker = async () => {
  if (!hasBrowser() || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  } catch (error) {
    console.warn('FCM service worker registration failed.', error)
    return null
  }
}

const requestNotificationPermission = async () => {
  if (!hasBrowser() || !('Notification' in window)) {
    return 'unsupported'
  }

  if (Notification.permission === 'granted') {
    return Notification.permission
  }

  try {
    return await Notification.requestPermission()
  } catch (error) {
    console.warn('FCM notification permission request failed.', error)
    return 'denied'
  }
}

export const getChatMessagingToken = async () => {
  if (!hasBrowser()) {
    return null
  }

  if (!hasFirebaseMessagingConfig()) {
    return null
  }

  if (!(await isSupported())) {
    return null
  }

  const permission = await requestNotificationPermission()

  if (permission !== 'granted') {
    return null
  }

  const serviceWorkerRegistration = await registerPushServiceWorker()

  if (!serviceWorkerRegistration) {
    return null
  }

  try {
    const messaging = getMessaging(getFirebaseApp())
    const token = await getToken(messaging, {
      vapidKey: env.firebaseVapidKey,
      serviceWorkerRegistration,
    })

    if (!token) {
      return null
    }

    const storedToken = window.localStorage.getItem(fcmStorageKeys.token)

    if (storedToken !== token) {
      const saveResponse = await saveFcmDeviceToken(token)

      if (isApiSuccess(saveResponse)) {
        window.localStorage.setItem(fcmStorageKeys.token, token)
      } else {
        console.warn('Saving FCM device token failed.')
      }
    }

    return token
  } catch (error) {
    console.warn('Getting FCM messaging token failed.', error)
    return null
  }
}

export const subscribeChatRoomNotifications = async (roomId: number) => {
  const token = await getChatMessagingToken()

  if (!token) {
    return false
  }

  try {
    const response = await subscribeFcmTopic({
      token,
      topic: String(roomId),
    })

    return isApiSuccess(response)
  } catch (error) {
    console.warn('Subscribing chat room notifications failed.', error)
    return false
  }
}
