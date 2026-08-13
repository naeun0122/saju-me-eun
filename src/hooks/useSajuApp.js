import { useEffect, useRef, useState } from 'react'
import { fetchProfile, upsertProfile } from '../api/profiles'
import {
  deleteReadingById,
  fetchReadingById,
  fetchReadings,
  findExistingReading,
  insertReading,
} from '../api/readings'
import { setAnalyticsUserId, trackEvent } from '../lib/analytics'
import { interpretSajuStream } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import { formatReadingLabel } from '../utils/format'
import {
  clearGuestConsumedFlags,
  clearGuestStorage,
  findGuestReading,
  markGuestConsumed,
  readGuestForm,
  readGuestResult,
  wasGuestConsumed,
  writeGuestForm,
  writeGuestReading,
  writeGuestResult,
} from '../utils/guestStorage'
import { getPreviewText, normalizeMarkdown } from '../utils/markdown'
import { emptyProfileForm, getMissingProfileFields, profileToForm } from '../utils/profileForm'
import { readingToForm } from '../utils/readings'
import { useToast } from './useToast'

function clearAuthParamsFromUrl() {
  const url = new URL(window.location.href)
  if (!url.search && !url.hash) return
  window.history.replaceState({}, document.title, url.pathname)
}

function readOauthError() {
  const params = new URLSearchParams(window.location.search)
  const oauthError = params.get('error_description') || params.get('error')
  return oauthError ? decodeURIComponent(oauthError.replace(/\+/g, ' ')) : ''
}

export function useSajuApp() {
  const [result, setResult] = useState(() => normalizeMarkdown(readGuestResult()))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(readOauthError)
  const { toast, showToast } = useToast()

  const [readings, setReadings] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [viewingSaved, setViewingSaved] = useState(false)
  const [composerOpen, setComposerOpen] = useState(() => !readGuestResult())
  const [openingId, setOpeningId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)

  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileForm, setProfileForm] = useState(() => readGuestForm() ?? emptyProfileForm())
  const [profileModal, setProfileModal] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')

  const resultRef = useRef(null)

  useEffect(() => {
    if (user) return
    writeGuestForm(profileForm)
  }, [profileForm, user])

  const loadReadings = async (userId) => {
    if (!userId) {
      setReadings([])
      return
    }

    const { data, error: loadError } = await fetchReadings(userId)
    if (loadError) {
      console.error(loadError)
      setError('저장된 사주 목록을 불러오지 못했습니다.')
      return
    }

    setReadings(data ?? [])
  }

  const saveReading = async (userId, fullText, form) => {
    const { data: saved, error: saveError } = await insertReading(userId, fullText, form)
    if (saveError) throw saveError
    return saved
  }

  const findSavedReading = async (userId, form) => {
    const { data, error: findError } = await findExistingReading(userId, form)
    if (findError) {
      console.error(findError)
      return null
    }
    return data?.[0] ?? null
  }

  const loadProfile = async (authUser, guestForm) => {
    if (!authUser) {
      setProfile(null)
      setProfileModal(null)
      return null
    }

    setProfileLoading(true)
    const { data, error: profileLoadError } = await fetchProfile(authUser.id)
    setProfileLoading(false)

    if (profileLoadError) {
      console.error(profileLoadError)
      setError('프로필을 불러오지 못했습니다.')
      return null
    }

    if (data) {
      setProfile(data)
      if (!guestForm || getMissingProfileFields(guestForm).length > 0) {
        setProfileForm(profileToForm(data))
      } else {
        setProfileForm(guestForm)
      }
      setProfileModal(null)
      return data
    }

    const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || ''
    const incoming = guestForm
      ? { ...guestForm, name: guestForm.name?.trim() || googleName }
      : emptyProfileForm(googleName)

    setProfile(null)
    setProfileForm(incoming)
    setProfileError('')

    if (getMissingProfileFields(incoming).length === 0) {
      try {
        setProfileSaving(true)
        const { data: saved, error: saveError } = await upsertProfile(authUser, incoming)
        if (saveError) throw saveError
        setProfile(saved)
        setProfileForm(profileToForm(saved))
        setProfileModal(null)
        return saved
      } catch (err) {
        console.error(err)
        setProfileModal('onboarding')
        return null
      } finally {
        setProfileSaving(false)
      }
    }

    setProfileModal('onboarding')
    return null
  }

  useEffect(() => {
    if (readOauthError()) clearAuthParamsFromUrl()
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setAuthLoading(false)
      if (session) clearAuthParamsFromUrl()
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)

      if (event === 'SIGNED_IN') {
        const params = new URLSearchParams(window.location.search)
        const fromOAuth = params.has('code') || window.location.hash.includes('access_token')
        clearAuthParamsFromUrl()
        if (fromOAuth) {
          trackEvent('login', { method: 'google' })
          showToast('로그인했다쨔무. 나머지도 보여줄게쨔무')
        }
      }

      if (event === 'SIGNED_OUT') {
        setAnalyticsUserId(undefined)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [showToast])

  useEffect(() => {
    if (authLoading) return
    setAnalyticsUserId(user?.id)
  }, [user, authLoading])

  useEffect(() => {
    if (authLoading || !user) return

    let cancelled = false

    Promise.resolve().then(async () => {
      setListLoading(true)
      const guestForm = readGuestForm()
      const guestResult = readGuestResult()
      const alreadyConsumed = wasGuestConsumed(user.id)

      if (cancelled) return

      if (guestResult && !alreadyConsumed) {
        setResult(normalizeMarkdown(guestResult))
        setComposerOpen(false)
      }
      if (guestForm && !alreadyConsumed) setProfileForm(guestForm)

      const loadedProfile = await loadProfile(user, alreadyConsumed ? null : guestForm)
      if (cancelled) return

      if (!alreadyConsumed && guestResult && loadedProfile && guestForm) {
        try {
          markGuestConsumed(user.id)
          setSaving(true)
          const existing = await findSavedReading(user.id, guestForm)
          if (existing) {
            setSelectedId(existing.id)
            setResult(normalizeMarkdown(existing.result ?? guestResult))
            setProfileForm(readingToForm(existing))
          } else {
            const saved = await saveReading(user.id, guestResult, guestForm)
            setSelectedId(saved.id)
          }
          setViewingSaved(true)
          setComposerOpen(false)
          clearGuestStorage()
          trackEvent('save_reading', { source: 'guest_login' })
          showToast('해석을 저장했다쨔무')
        } catch (err) {
          console.error(err)
        } finally {
          setSaving(false)
        }
      } else if (loadedProfile) {
        markGuestConsumed(user.id)
        clearGuestStorage()
      }

      await loadReadings(user.id)
      if (!cancelled) setListLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user, authLoading, showToast])

  const handleSignInWithGoogle = async (source = 'sidebar') => {
    const origin = typeof source === 'string' ? source : 'sidebar'
    trackEvent('login_click', { method: 'google', source: origin })
    setSigningIn(true)
    setError('')
    writeGuestForm(profileForm)
    if (result) writeGuestResult(result)

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    })

    if (signInError) {
      console.error(signInError)
      trackEvent('login_error', { method: 'google', source: origin })
      setError(signInError.message || 'Google 로그인에 실패했습니다.')
      setSigningIn(false)
    }
  }

  const handleNewSaju = (source) => {
    if (loading || saving) return
    if (typeof source === 'string') trackEvent('new_saju', { source })

    setResult('')
    setError('')
    setLoading(false)
    setSaving(false)
    setSelectedId(null)
    setViewingSaved(false)
    setComposerOpen(true)
    setOpeningId(null)
    setDeletingId(null)
    writeGuestResult('')
    setProfileForm(
      emptyProfileForm(
        profile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || '',
      ),
    )

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSignOut = async () => {
    setError('')
    clearGuestStorage()
    clearGuestConsumedFlags()
    handleNewSaju()
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      console.error(signOutError)
      setError(signOutError.message || '로그아웃에 실패했습니다.')
    } else {
      trackEvent('logout')
      showToast('로그아웃했다쨔무')
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    const missing = getMissingProfileFields(profileForm)
    if (missing.length > 0) return

    setProfileSaving(true)
    setProfileError('')

    try {
      const { data, error: saveError } = await upsertProfile(user, profileForm)
      if (saveError) throw saveError
      setProfile(data)
      setProfileForm(profileToForm(data))
      setProfileModal(null)
      trackEvent('save_profile', { mode: profile ? 'edit' : 'onboarding' })
      showToast(profile ? '프로필을 고쳤다쨔무' : '프로필을 저장했다쨔무')

      const guestResult = readGuestResult() || result
      if (guestResult && !selectedId) {
        setSaving(true)
        const existing = await findSavedReading(user.id, profileForm)
        if (existing) {
          setSelectedId(existing.id)
          setResult(normalizeMarkdown(existing.result ?? guestResult))
          setProfileForm(readingToForm(existing))
        } else {
          const saved = await saveReading(user.id, guestResult, profileForm)
          setSelectedId(saved.id)
        }
        setViewingSaved(true)
        setComposerOpen(false)
        setResult(normalizeMarkdown(guestResult))
        clearGuestStorage()
        await loadReadings(user.id)
        trackEvent('save_reading', { source: 'profile_onboarding' })
        showToast('해석을 저장했다쨔무')
      }
    } catch (err) {
      console.error(err)
      setProfileError(err?.message || '프로필 저장에 실패했습니다.')
    } finally {
      setProfileSaving(false)
      setSaving(false)
    }
  }

  const handleCloseProfileModal = () => {
    if (profileModal === 'edit') {
      setProfileForm(profileToForm(profile))
      setProfileError('')
      setProfileModal(null)
    }
  }

  const handleEditProfile = () => {
    trackEvent('edit_profile')
    setProfileForm(profileToForm(profile))
    setProfileError('')
    setProfileModal('edit')
  }

  const formBusy =
    loading || saving || deletingId !== null || signingIn || profileSaving || profileLoading
  const canSubmit = getMissingProfileFields(profileForm).length === 0 && !formBusy
  const isGuest = !user
  const showLockedPreview = Boolean(isGuest && result && !loading)
  const visibleResult = isGuest ? getPreviewText(result, 0.5) : result
  const showComposer = composerOpen && !showLockedPreview
  const showSavedBanner = viewingSaved && selectedId && user && !composerOpen
  const visibleReadings = user ? readings : []
  const visibleListLoading = user ? listLoading : authLoading
  const visibleSelectedId = user ? selectedId : null
  const visibleViewingSaved = Boolean(user && viewingSaved)
  const visibleProfile = user ? profile : null
  const visibleProfileModal = user ? profileModal : null
  const visibleProfileLoading = Boolean(user && profileLoading)

  const showExistingReading = (existing, { saved = false } = {}) => {
    setResult(normalizeMarkdown(existing.result ?? ''))
    setSelectedId(existing.id ?? null)
    setViewingSaved(saved)
    setComposerOpen(false)
    if (existing.name || existing.birth_date) {
      setProfileForm(readingToForm(existing))
    }
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const sajuEventParams = () => ({
    is_guest: !user,
    has_birth_time: Boolean(profileForm.birthTime),
    gender: profileForm.gender || 'unknown',
    calendar_type: profileForm.calendarType || 'unknown',
  })

  const runInterpretation = async () => {
    if (!canSubmit) return

    trackEvent('generate_saju', sajuEventParams())
    setError('')

    if (!user) {
      const cached = findGuestReading(profileForm)
      if (cached?.result) {
        trackEvent('generate_saju_complete', { ...sajuEventParams(), cached: true })
        setResult(normalizeMarkdown(cached.result))
        setComposerOpen(false)
        writeGuestForm(profileForm)
        writeGuestResult(cached.result)
        showToast('이미 읽어둔 사주다쨔무')
        requestAnimationFrame(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
        return
      }
    }

    if (user) {
      const existing = await findSavedReading(user.id, profileForm)
      if (existing?.result) {
        trackEvent('generate_saju_complete', { ...sajuEventParams(), cached: true })
        showExistingReading(existing, { saved: true })
        showToast('이미 읽어둔 사주다쨔무')
        return
      }
    }

    setLoading(true)
    setSaving(false)
    setResult('')
    setViewingSaved(false)
    setSelectedId(null)

    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    try {
      const fullText = await interpretSajuStream(
        {
          name: profileForm.name.trim(),
          birthDate: profileForm.birthDate,
          birthTime: profileForm.birthTime,
          gender: profileForm.gender,
          calendarType: profileForm.calendarType,
        },
        (textSoFar) => {
          setResult(normalizeMarkdown(textSoFar))
        },
      )

      const normalized = normalizeMarkdown(fullText)
      setResult(normalized)
      setLoading(false)
      setComposerOpen(false)
      trackEvent('generate_saju_complete', { ...sajuEventParams(), cached: false })

      if (!user) {
        writeGuestForm(profileForm)
        writeGuestResult(normalized)
        writeGuestReading(profileForm, normalized)
        showToast('앞부분만 먼저 보여줄게쨔무')
        return
      }

      if (!profile) {
        writeGuestForm(profileForm)
        writeGuestResult(normalized)
        writeGuestReading(profileForm, normalized)
        setProfileModal('onboarding')
        return
      }

      setSaving(true)
      const saved = await saveReading(user.id, fullText, profileForm)
      setSelectedId(saved.id)
      setViewingSaved(true)
      await loadReadings(user.id)
      trackEvent('save_reading')
      showToast('해석을 저장했다쨔무')
    } catch (err) {
      console.error(err)
      trackEvent('generate_saju_error')
      setError(err?.message || '해석에 실패했다쨔무. 잠시 뒤 다시 해봐라쨔무.')
    } finally {
      setLoading(false)
      setSaving(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    runInterpretation()
  }

  const handleDeleteReading = async (id, label, source = 'sidebar') => {
    if (formBusy || deletingId === id) return

    const confirmed = window.confirm(`"${label}" 사주 기록을 삭제할까요?`)
    if (!confirmed) return

    setDeletingId(id)
    setError('')

    try {
      const { error: deleteError } = await deleteReadingById(id)
      if (deleteError) throw deleteError

      if (selectedId === id) handleNewSaju()

      await loadReadings(user.id)
      trackEvent('delete_reading', { source })
      showToast('기록을 지웠다쨔무')
    } catch (err) {
      console.error(err)
      setError(err?.message || '삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteSelected = () => {
    const current = readings.find((item) => item.id === selectedId)
    handleDeleteReading(selectedId, formatReadingLabel(current) || '이 기록', 'banner')
  }

  const handleSelectReading = async (id) => {
    if (formBusy || openingId === id) return
    trackEvent('select_reading')

    setOpeningId(id)
    setSelectedId(id)
    setError('')
    setViewingSaved(true)

    const { data, error: fetchError } = await fetchReadingById(id)
    setOpeningId(null)

    if (fetchError) {
      console.error(fetchError)
      setError(fetchError.message || '저장된 해석을 못 불러왔다쨔무.')
      return
    }

    setResult(normalizeMarkdown(data.result ?? ''))
    setComposerOpen(false)
    if (data.name || data.birth_date) setProfileForm(readingToForm(data))

    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return {
    toast,
    error,
    setError,
    result,
    visibleResult,
    loading,
    saving,
    readings: visibleReadings,
    listLoading: visibleListLoading,
    selectedId: visibleSelectedId,
    viewingSaved: visibleViewingSaved,
    composerOpen,
    openingId,
    deletingId,
    user,
    authLoading,
    signingIn,
    profile: visibleProfile,
    profileLoading: visibleProfileLoading,
    profileForm,
    setProfileForm,
    profileModal: visibleProfileModal,
    profileSaving,
    profileError,
    resultRef,
    formBusy,
    canSubmit,
    showLockedPreview,
    showComposer,
    showSavedBanner,
    handleSignInWithGoogle,
    handleSignOut,
    handleSaveProfile,
    handleCloseProfileModal,
    handleEditProfile,
    handleNewSaju,
    handleSubmit,
    handleDeleteReading,
    handleDeleteSelected,
    handleSelectReading,
  }
}
