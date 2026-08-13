import {
  GUEST_FORM_KEY,
  GUEST_READINGS_KEY,
  GUEST_RESULT_KEY,
  GUEST_SHARE_IDS_KEY,
  guestConsumedKey,
} from '../constants/storage'
import { emptyProfileForm } from './profileForm'
import { chartKey } from './readings'

export function readGuestForm() {
  try {
    const raw = sessionStorage.getItem(GUEST_FORM_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? { ...emptyProfileForm(), ...parsed } : null
  } catch {
    return null
  }
}

export function readGuestResult() {
  try {
    return sessionStorage.getItem(GUEST_RESULT_KEY) || ''
  } catch {
    return ''
  }
}

export function writeGuestForm(form) {
  try {
    sessionStorage.setItem(GUEST_FORM_KEY, JSON.stringify(form))
  } catch {
    /* ignore quota / private mode */
  }
}

export function writeGuestResult(result) {
  try {
    if (result) sessionStorage.setItem(GUEST_RESULT_KEY, result)
    else sessionStorage.removeItem(GUEST_RESULT_KEY)
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearGuestStorage() {
  try {
    sessionStorage.removeItem(GUEST_FORM_KEY)
    sessionStorage.removeItem(GUEST_RESULT_KEY)
    sessionStorage.removeItem(GUEST_READINGS_KEY)
    sessionStorage.removeItem(GUEST_SHARE_IDS_KEY)
  } catch {
    /* ignore */
  }
}

function readGuestShareIds() {
  try {
    const raw = sessionStorage.getItem(GUEST_SHARE_IDS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function readGuestShareId(form) {
  return readGuestShareIds()[chartKey(form)] || ''
}

export function writeGuestShareId(form, shareId) {
  try {
    const all = readGuestShareIds()
    all[chartKey(form)] = shareId
    sessionStorage.setItem(GUEST_SHARE_IDS_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

export function readGuestReadings() {
  try {
    const raw = sessionStorage.getItem(GUEST_READINGS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function writeGuestReading(form, result) {
  try {
    const all = readGuestReadings()
    all[chartKey(form)] = { form, result }
    sessionStorage.setItem(GUEST_READINGS_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

export function findGuestReading(form) {
  return readGuestReadings()[chartKey(form)] || null
}

export function markGuestConsumed(userId) {
  try {
    sessionStorage.setItem(guestConsumedKey(userId), '1')
  } catch {
    /* ignore */
  }
}

export function wasGuestConsumed(userId) {
  try {
    return sessionStorage.getItem(guestConsumedKey(userId)) === '1'
  } catch {
    return false
  }
}

export function clearGuestConsumedFlags() {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('saju.guest.consumed:'))
      .forEach((key) => sessionStorage.removeItem(key))
  } catch {
    /* ignore */
  }
}
