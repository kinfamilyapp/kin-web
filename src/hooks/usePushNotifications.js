import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseEnabled } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Generate this once: npx web-push generate-vapid-keys
// Paste the PUBLIC key here and in your .env
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

function getDeviceName() {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua) && /Mobile/.test(ua)) return 'Android Phone'
  if (/Android/.test(ua)) return 'Android Tablet'
  if (/Mac/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows PC'
  return 'Browser'
}

export function usePushNotifications(familyId) {
  const { user } = useAuth()
  const [permission, setPermission] = useState(Notification?.permission ?? 'default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [swReady, setSwReady] = useState(false)

  // Register service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      setSwReady(true)
      // Check if already subscribed
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub)
      })
    }).catch(console.error)
  }, [])

  const subscribe = useCallback(async () => {
    if (!isSupabaseEnabled || !user || !familyId || !swReady) return
    if (!VAPID_PUBLIC_KEY) { console.warn('VITE_VAPID_PUBLIC_KEY not set'); return }

    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      setPermission(permission)
      if (permission !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const { endpoint, keys } = sub.toJSON()

      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        family_id: familyId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        device_name: getDeviceName(),
      }, { onConflict: 'endpoint' })

      setSubscribed(true)
    } catch (err) {
      console.error('Push subscribe error:', err)
    } finally {
      setLoading(false)
    }
  }, [user, familyId, swReady])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await supabase.from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint)
      }
      setSubscribed(false)
    } catch (err) {
      console.error('Push unsubscribe error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Send a push to the whole family (calls Edge Function)
  const sendToFamily = useCallback(async (payload) => {
    if (!isSupabaseEnabled || !familyId) return
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ family_id: familyId, ...payload }),
    })
  }, [familyId])

  const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window

  return { permission, subscribed, loading, supported, swReady, subscribe, unsubscribe, sendToFamily }
}
