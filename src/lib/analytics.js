export const GA_MEASUREMENT_ID = 'G-VFHDGKKE1C'

function gtag(...args) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag(...args)
}

export function trackEvent(eventName, params = {}) {
  gtag('event', eventName, params)
}

export function setAnalyticsUserId(userId) {
  gtag('config', GA_MEASUREMENT_ID, {
    user_id: userId || undefined,
  })
}
