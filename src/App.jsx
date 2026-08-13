import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { interpretSajuStream } from './gemini'
import { supabase } from './supabase'
import {
  ProfileFields,
  ProfileModal,
  emptyProfileForm,
  formToProfilePayload,
  getMissingProfileFields,
  profileToForm,
} from './ProfileModal'
import './App.css'

const GUEST_FORM_KEY = 'saju.guest.form'
const GUEST_RESULT_KEY = 'saju.guest.result'
const GUEST_READINGS_KEY = 'saju.guest.readings'

const MASCOT_MAIN = '/assets/eumppo.png'
const MASCOT_LOADING = [
  '/assets/eumppo-tehe.png',
  '/assets/eumppo-sparkle.png',
  '/assets/eumppo-kimi.png',
]

function LoadingMascot() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % MASCOT_LOADING.length)
    }, 1400)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mascot-loading" aria-hidden="true">
      {MASCOT_LOADING.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`mascot-img mascot-img--loading${i === index ? ' is-active' : ''}`}
        />
      ))}
    </div>
  )
}

function normalizeMarkdown(text) {
  if (!text) return ''
  return text.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
}

function formatReadingDate(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

function readGuestForm() {
  try {
    const raw = sessionStorage.getItem(GUEST_FORM_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? { ...emptyProfileForm(), ...parsed } : null
  } catch {
    return null
  }
}

function readGuestResult() {
  try {
    return sessionStorage.getItem(GUEST_RESULT_KEY) || ''
  } catch {
    return ''
  }
}

function writeGuestForm(form) {
  try {
    sessionStorage.setItem(GUEST_FORM_KEY, JSON.stringify(form))
  } catch {
    /* ignore quota / private mode */
  }
}

function writeGuestResult(result) {
  try {
    if (result) sessionStorage.setItem(GUEST_RESULT_KEY, result)
    else sessionStorage.removeItem(GUEST_RESULT_KEY)
  } catch {
    /* ignore quota / private mode */
  }
}

function clearGuestStorage() {
  try {
    sessionStorage.removeItem(GUEST_FORM_KEY)
    sessionStorage.removeItem(GUEST_RESULT_KEY)
    sessionStorage.removeItem(GUEST_READINGS_KEY)
  } catch {
    /* ignore */
  }
}

function chartKey(form) {
  return [
    form.name?.trim() ?? '',
    form.birthDate ?? '',
    form.birthTime || '',
    form.gender ?? '',
    form.calendarType || 'solar',
  ].join('|')
}

function readingToForm(reading) {
  if (!reading) return emptyProfileForm()
  return {
    name: reading.name ?? '',
    birthDate: reading.birth_date ?? '',
    birthTime: reading.birth_time ? String(reading.birth_time).slice(0, 5) : '',
    gender: reading.gender ?? '',
    calendarType: reading.calendar_type ?? 'solar',
  }
}

function formToReadingPayload(form) {
  return {
    name: form.name.trim(),
    birth_date: form.birthDate,
    birth_time: form.birthTime || null,
    gender: form.gender,
    calendar_type: form.calendarType || 'solar',
  }
}

function readGuestReadings() {
  try {
    const raw = sessionStorage.getItem(GUEST_READINGS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeGuestReading(form, result) {
  try {
    const all = readGuestReadings()
    all[chartKey(form)] = { form, result }
    sessionStorage.setItem(GUEST_READINGS_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

function findGuestReading(form) {
  return readGuestReadings()[chartKey(form)] || null
}

function formatReadingLabel(reading) {
  if (reading?.name && reading?.birth_date) {
    return `${reading.name} · ${reading.birth_date}`
  }
  return formatReadingDate(reading?.created_at)
}

/** 비회원에게 보여줄 앞부분. 문단/줄 끊기는 곳에서 자른다. */
function getPreviewText(text, ratio = 0.5) {
  if (!text) return ''
  const target = Math.max(180, Math.floor(text.length * ratio))
  if (text.length <= target) return text

  const slice = text.slice(0, target)
  const breakAt = Math.max(
    slice.lastIndexOf('\n\n'),
    slice.lastIndexOf('\n'),
    slice.lastIndexOf('. '),
    slice.lastIndexOf('요.'),
  )

  const cut = breakAt > target * 0.35 ? slice.slice(0, breakAt) : slice
  return cut.trimEnd()
}

function App() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [readings, setReadings] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [viewingSaved, setViewingSaved] = useState(false)
  const [composerOpen, setComposerOpen] = useState(true)
  const [openingId, setOpeningId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)

  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileForm, setProfileForm] = useState(emptyProfileForm())
  const [profileModal, setProfileModal] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')

  const resultRef = useRef(null)
  const toastTimerRef = useRef(null)
  const guestBootstrapped = useRef(false)

  const showToast = (message) => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(''), 2800)
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (user) return
    writeGuestForm(profileForm)
  }, [profileForm, user])

  const loadReadings = async (userId) => {
    if (!userId) {
      setReadings([])
      return
    }

    const { data, error: loadError } = await supabase
      .from('saju_readings')
      .select('id, created_at, name, birth_date, birth_time, gender, calendar_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error(loadError)
      setError('저장된 사주 목록을 불러오지 못했습니다.')
      return
    }

    setReadings(data ?? [])
  }

  const saveReading = async (userId, fullText, form) => {
    const { data: saved, error: saveError } = await supabase
      .from('saju_readings')
      .insert({
        user_id: userId,
        result: fullText,
        ...formToReadingPayload(form),
      })
      .select('id, created_at, name, birth_date, birth_time, gender, calendar_type')
      .single()

    if (saveError) throw saveError
    return saved
  }

  const findExistingReading = async (userId, form) => {
    let query = supabase
      .from('saju_readings')
      .select('id, result, created_at, name, birth_date, birth_time, gender, calendar_type')
      .eq('user_id', userId)
      .eq('name', form.name.trim())
      .eq('birth_date', form.birthDate)
      .eq('gender', form.gender)
      .eq('calendar_type', form.calendarType || 'solar')
      .order('created_at', { ascending: false })
      .limit(1)

    query = form.birthTime ? query.eq('birth_time', form.birthTime) : query.is('birth_time', null)

    const { data, error: findError } = await query
    if (findError) {
      console.error(findError)
      return null
    }
    return data?.[0] ?? null
  }

  const upsertProfileFromForm = async (authUser, form) => {
    const payload = {
      id: authUser.id,
      ...formToProfilePayload(form),
    }

    const { data, error: saveError } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single()

    if (saveError) throw saveError
    return data
  }

  const loadProfile = async (authUser, guestForm) => {
    if (!authUser) {
      setProfile(null)
      setProfileModal(null)
      return null
    }

    setProfileLoading(true)
    const { data, error: profileLoadError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

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

    const googleName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      ''
    const incoming = guestForm
      ? { ...guestForm, name: guestForm.name?.trim() || googleName }
      : emptyProfileForm(googleName)

    setProfile(null)
    setProfileForm(incoming)
    setProfileError('')

    if (getMissingProfileFields(incoming).length === 0) {
      try {
        setProfileSaving(true)
        const saved = await upsertProfileFromForm(authUser, incoming)
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

  const clearAuthParamsFromUrl = () => {
    const url = new URL(window.location.href)
    if (!url.search && !url.hash) return
    window.history.replaceState({}, document.title, url.pathname)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error_description') || params.get('error')
    if (oauthError) {
      setError(decodeURIComponent(oauthError.replace(/\+/g, ' ')))
      clearAuthParamsFromUrl()
    }
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
        if (fromOAuth) showToast('로그인했다쨔무. 나머지도 보여줄게쨔무')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setReadings([])
      setListLoading(false)
      setSelectedId(null)
      setViewingSaved(false)
      setProfile(null)
      setProfileModal(null)

      if (!guestBootstrapped.current) {
        guestBootstrapped.current = true
        const savedForm = readGuestForm()
        const savedResult = readGuestResult()
        if (savedForm) setProfileForm(savedForm)
        if (savedResult) {
          setResult(normalizeMarkdown(savedResult))
          setComposerOpen(false)
        }
      }
      return
    }

    guestBootstrapped.current = true

    ;(async () => {
      setListLoading(true)
      const guestForm = readGuestForm()
      const guestResult = readGuestResult()
      const consumeKey = `saju.guest.consumed:${user.id}`
      let alreadyConsumed = false
      try {
        alreadyConsumed = sessionStorage.getItem(consumeKey) === '1'
      } catch {
        alreadyConsumed = false
      }

      if (guestResult && !alreadyConsumed) {
        setResult(normalizeMarkdown(guestResult))
        setComposerOpen(false)
      }
      if (guestForm && !alreadyConsumed) setProfileForm(guestForm)

      const loadedProfile = await loadProfile(user, alreadyConsumed ? null : guestForm)

      if (!alreadyConsumed && guestResult && loadedProfile && guestForm) {
        try {
          sessionStorage.setItem(consumeKey, '1')
          setSaving(true)
          const existing = await findExistingReading(user.id, guestForm)
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
          showToast('해석을 저장했다쨔무')
        } catch (err) {
          console.error(err)
        } finally {
          setSaving(false)
        }
      } else if (loadedProfile) {
        try {
          sessionStorage.setItem(consumeKey, '1')
        } catch {
          /* ignore */
        }
        clearGuestStorage()
      }

      await loadReadings(user.id)
      setListLoading(false)
    })()
  }, [user, authLoading])

  const handleSignInWithGoogle = async () => {
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
      setError(signInError.message || 'Google 로그인에 실패했습니다.')
      setSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    setError('')
    clearGuestStorage()
    try {
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith('saju.guest.consumed:'))
        .forEach((key) => sessionStorage.removeItem(key))
    } catch {
      /* ignore */
    }
    handleNewSaju()
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      console.error(signOutError)
      setError(signOutError.message || '로그아웃에 실패했습니다.')
    } else {
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
      const data = await upsertProfileFromForm(user, profileForm)
      setProfile(data)
      setProfileForm(profileToForm(data))
      setProfileModal(null)
      showToast(profile ? '프로필을 고쳤다쨔무' : '프로필을 저장했다쨔무')

      const guestResult = readGuestResult() || result
      if (guestResult && !selectedId) {
        setSaving(true)
        const existing = await findExistingReading(user.id, profileForm)
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

  const handleNewSaju = () => {
    if (loading || saving) return

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

  const formBusy =
    loading || saving || deletingId !== null || signingIn || profileSaving || profileLoading
  const canSubmit = getMissingProfileFields(profileForm).length === 0 && !formBusy
  const isGuest = !user
  const showLockedPreview = Boolean(isGuest && result && !loading)
  const visibleResult = isGuest ? getPreviewText(result, 0.5) : result

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

  const runInterpretation = async () => {
    if (!canSubmit) return

    setError('')

    if (!user) {
      const cached = findGuestReading(profileForm)
      if (cached?.result) {
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
      const existing = await findExistingReading(user.id, profileForm)
      if (existing?.result) {
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
      showToast('해석을 저장했다쨔무')
    } catch (err) {
      console.error(err)
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

  const handleDeleteReading = async (id, label) => {
    if (formBusy || deletingId === id) return

    const confirmed = window.confirm(`"${label}" 사주 기록을 삭제할까요?`)
    if (!confirmed) return

    setDeletingId(id)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('saju_readings')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      if (selectedId === id) handleNewSaju()

      await loadReadings(user.id)
      showToast('기록을 지웠다쨔무')
    } catch (err) {
      console.error(err)
      setError(err?.message || '삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSelectReading = async (id) => {
    if (formBusy || openingId === id) return

    setOpeningId(id)
    setSelectedId(id)
    setError('')
    setViewingSaved(true)

    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select('id, result, created_at, name, birth_date, birth_time, gender, calendar_type')
      .eq('id', id)
      .single()

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

  const genderLabel = profileForm.gender === 'male' ? '남성' : profileForm.gender === 'female' ? '여성' : ''
  const calendarLabel = profileForm.calendarType === 'lunar' ? '음력' : profileForm.calendarType === 'solar' ? '양력' : ''
  const timeLabel = profileForm.birthTime || '시간 미상'
  const submitLabel = loading
    ? '읽는 중이다쨔무'
    : saving
      ? '저장하는 중이다쨔무'
      : '해석해주겠다쨔무'

  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email || '로그인됨'
  const showComposer = composerOpen && !showLockedPreview
  const showSavedBanner = viewingSaved && selectedId && user && !composerOpen

  return (
    <div className="layout">
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {profileModal && (
        <ProfileModal
          mode={profileModal}
          form={profileForm}
          onChange={setProfileForm}
          onSubmit={handleSaveProfile}
          onClose={() => {
            if (profileModal === 'edit') {
              setProfileForm(profileToForm(profile))
              setProfileError('')
              setProfileModal(null)
            }
          }}
          saving={profileSaving}
          error={profileError}
        />
      )}

      <aside className="sidebar" aria-label="저장된 사주">
        <div className="auth-panel">
          {authLoading ? (
            <p className="auth-status">로그인 보는 중이다쨔무</p>
          ) : user ? (
            <>
              <p className="auth-user" title={user.email ?? ''}>
                {displayName}
              </p>
              {profile && (
                <p className="auth-meta">
                  {profile.birth_date} · {profile.birth_time ? String(profile.birth_time).slice(0, 5) : '시간 미상'}
                </p>
              )}
              <button
                type="button"
                className="auth-btn is-outline"
                onClick={() => {
                  setProfileForm(profileToForm(profile))
                  setProfileError('')
                  setProfileModal('edit')
                }}
                disabled={formBusy || !profile}
              >
                프로필 수정
              </button>
              <button type="button" className="auth-btn is-outline" onClick={handleSignOut} disabled={formBusy}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <p className="auth-status">로그인 안 해도 된다쨔무. 저장은 로그인하면 된다쨔무.</p>
              <button
                type="button"
                className="auth-btn is-google"
                onClick={handleSignInWithGoogle}
                disabled={signingIn}
              >
                {signingIn ? '연결 중이다쨔무' : 'Google로 로그인하자쨔무'}
              </button>
            </>
          )}
        </div>

        <div className="sidebar-head">
          <h2 className="sidebar-title">음뽀쨔무의 기록</h2>
          {!listLoading && (
            <span className="sidebar-count" aria-label={`${readings.length}건`}>
              {readings.length}
            </span>
          )}
        </div>

        <button
          type="button"
          className="new-saju-btn"
          onClick={handleNewSaju}
          disabled={formBusy}
        >
          새 사주 만들기
        </button>

        {listLoading || profileLoading ? (
          <div className="sidebar-loading" aria-busy="true" aria-label="목록 불러오는 중">
            <div className="sidebar-skel" />
            <div className="sidebar-skel" />
            <div className="sidebar-skel short" />
          </div>
        ) : readings.length === 0 ? (
          <p className="sidebar-empty">
            {user ? (
              <>
                아직 기록이 없다쨔무.
                <span>새 사주를 만들면 여기 쌓인다쨔무.</span>
              </>
            ) : (
              <>
                기록은 로그인하면 모인다쨔무.
                <span>지금은 바로 적어봐라쨔무.</span>
              </>
            )}
          </p>
        ) : (
          <ul className="sidebar-list">
            {readings.map((reading, index) => {
              const isActive = selectedId === reading.id
              const isOpening = openingId === reading.id
              const label = formatReadingLabel(reading) || `사주 ${readings.length - index}`
              return (
                <li key={reading.id} className="sidebar-row">
                  <button
                    type="button"
                    className={`sidebar-item${isActive ? ' is-active' : ''}${isOpening ? ' is-opening' : ''}`}
                    onClick={() => handleSelectReading(reading.id)}
                    disabled={formBusy}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span className="sidebar-item-name">{label}</span>
                    <span className="sidebar-item-date">
                      {isOpening ? '여는 중이다쨔무' : formatReadingDate(reading.created_at)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="sidebar-delete"
                    onClick={() => handleDeleteReading(reading.id, label)}
                    disabled={formBusy}
                    aria-label={`${label} 삭제`}
                    title="삭제"
                  >
                    {deletingId === reading.id ? '…' : '×'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      <div className="app">
        <header className="app-header">
          <div className="mascot-hero" aria-hidden="true">
            <img src={MASCOT_MAIN} alt="" className="mascot-img mascot-img--hero" />
          </div>
          <p className="app-eyebrow">Saju Me · 요구르트 요정 음뽀쨔무</p>
          <h1>{showComposer ? '새 사주' : '사주 해석'}</h1>
          <p className="app-lead">
            {showComposer
              ? '날짜랑 시간을 적으면 읽어주겠다쨔무'
              : showLockedPreview
                ? '앞부분만 먼저 보여줄게쨔무'
                : '이 사주는 이렇게 읽었다쨔무'}
          </p>
        </header>

        {showSavedBanner && (
          <div className="mode-banner" role="status">
            <span>저장해 둔 사주다쨔무</span>
            <div className="mode-banner-actions">
              <button
                type="button"
                className="mode-banner-btn is-delete"
                onClick={() =>
                  handleDeleteReading(selectedId, formatReadingLabel(readings.find((item) => item.id === selectedId)) || '이 기록')
                }
                disabled={formBusy}
              >
                삭제
              </button>
              <button type="button" className="mode-banner-btn" onClick={handleNewSaju} disabled={formBusy}>
                새 사주 만들기
              </button>
            </div>
          </div>
        )}

        {showComposer && !profileModal && (
          <form onSubmit={handleSubmit} className={formBusy ? 'is-busy' : ''}>
            <ProfileFields form={profileForm} onChange={setProfileForm} idPrefix="saju" />
            <button type="submit" disabled={!canSubmit} aria-busy={formBusy}>
              {submitLabel}
            </button>
            {!canSubmit && !formBusy && getMissingProfileFields(profileForm).length > 0 && (
              <p className="form-hint">이름, 생일, 성별을 적으면 된다쨔무</p>
            )}
          </form>
        )}

        {error && (
          <div className="error" role="alert">
            <p>{error}</p>
            <button type="button" className="error-dismiss" onClick={() => setError('')}>
              닫기
            </button>
          </div>
        )}

        {(loading || saving) && !result && (
          <section className="result" ref={resultRef} aria-busy="true" aria-label="해석 준비 중">
            <LoadingMascot />
            <h2>{saving ? '저장하는 중이다쨔무' : '읽는 중이다쨔무'}</h2>
            <p className="result-status">
              {saving ? '계정에 남기는 중이다쨔무' : '조금만 기다려라쨔무'}
            </p>
            <div className="skeleton">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-short" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-mid" />
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-short" />
            </div>
          </section>
        )}

        {result && !composerOpen && (
          <section
            className={`result${viewingSaved ? ' is-saved' : ''}${showLockedPreview ? ' is-teaser' : ''}`}
            ref={resultRef}
            key={selectedId ?? 'live'}
          >
            {loading && <LoadingMascot />}
            <h2>
              {profileForm.name ? `${profileForm.name}님 사주` : '사주 해석'}
              {loading && <span className="streaming-dot" aria-label="작성 중" />}
            </h2>

            {(!loading && !saving) && (
              <div className="result-meta" aria-label="사주 입력 정보">
                {profileForm.birthDate && <span>{profileForm.birthDate}</span>}
                <span>{timeLabel}</span>
                {genderLabel && <span>{genderLabel}</span>}
                {calendarLabel && <span>{calendarLabel}</span>}
              </div>
            )}

            {saving && (
              <p className="result-status is-inline" aria-live="polite">
                저장하는 중이다쨔무
              </p>
            )}

            <div className={`markdown ${loading ? 'is-streaming' : ''} ${showLockedPreview ? 'is-preview' : ''}`}>
              <ReactMarkdown>{visibleResult}</ReactMarkdown>
            </div>

            {showLockedPreview && (
              <div className="result-lock">
                <p className="result-lock-title">나머지도 있다쨔무</p>
                <p className="result-lock-lead">로그인하면 이어서 보여줄게쨔무</p>
                <button
                  type="button"
                  className="auth-btn is-google"
                  onClick={handleSignInWithGoogle}
                  disabled={signingIn}
                >
                  {signingIn ? '연결 중이다쨔무' : '로그인하고 이어서 보자쨔무'}
                </button>
              </div>
            )}

            {!loading && !showLockedPreview && (
              <figure className="mascot-rest">
                <img src={MASCOT_MAIN} alt="음뽀쨔무" className="mascot-img mascot-img--rest" />
                <figcaption>옆에 누워 있다쨔무</figcaption>
              </figure>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export default App
