import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { interpretSajuStream } from './gemini'
import { supabase } from './supabase'
import {
  ProfileModal,
  emptyProfileForm,
  formToProfilePayload,
  getMissingProfileFields,
  profileToForm,
} from './ProfileModal'
import './App.css'

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

  const loadReadings = async (userId) => {
    if (!userId) {
      setReadings([])
      return
    }

    const { data, error: loadError } = await supabase
      .from('saju_readings')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error(loadError)
      setError('저장된 사주 목록을 불러오지 못했습니다.')
      return
    }

    setReadings(data ?? [])
  }

  const loadProfile = async (authUser) => {
    if (!authUser) {
      setProfile(null)
      setProfileForm(emptyProfileForm())
      setProfileModal(null)
      return
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
      return
    }

    if (!data) {
      const googleName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        ''
      setProfile(null)
      setProfileForm(emptyProfileForm(googleName))
      setProfileError('')
      setProfileModal('onboarding')
      return
    }

    setProfile(data)
    setProfileForm(profileToForm(data))
    setProfileModal(null)
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
        if (fromOAuth) showToast('Google 로그인에 성공했습니다')
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
      setResult('')
      setProfile(null)
      setProfileForm(emptyProfileForm())
      setProfileModal(null)
      return
    }

    ;(async () => {
      setListLoading(true)
      await Promise.all([loadProfile(user), loadReadings(user.id)])
      setListLoading(false)
    })()
  }, [user, authLoading])

  const handleSignInWithGoogle = async () => {
    setSigningIn(true)
    setError('')

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
    handleNewSaju()
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      console.error(signOutError)
      setError(signOutError.message || '로그아웃에 실패했습니다.')
    } else {
      showToast('로그아웃되었습니다')
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    const missing = getMissingProfileFields(profileForm)
    if (missing.length > 0) return

    setProfileSaving(true)
    setProfileError('')

    const payload = {
      id: user.id,
      ...formToProfilePayload(profileForm),
    }

    try {
      const { data, error: saveError } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' })
        .select('*')
        .single()

      if (saveError) throw saveError

      setProfile(data)
      setProfileForm(profileToForm(data))
      setProfileModal(null)
      showToast(profile ? '프로필이 수정되었습니다' : '프로필이 저장되었습니다')
    } catch (err) {
      console.error(err)
      setProfileError(err?.message || '프로필 저장에 실패했습니다.')
    } finally {
      setProfileSaving(false)
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
    setOpeningId(null)
    setDeletingId(null)
    if (profile) setProfileForm(profileToForm(profile))

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const formBusy =
    loading || saving || deletingId !== null || signingIn || profileSaving || profileLoading
  const profileReady = Boolean(profile)
  const canSubmit = Boolean(user) && profileReady && getMissingProfileFields(profileForm).length === 0 && !formBusy

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || !user || !profile) return

    const isUpdate = Boolean(selectedId)

    setLoading(true)
    setSaving(false)
    setError('')
    if (!isUpdate) {
      setResult('')
      setViewingSaved(false)
    }

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

      setLoading(false)
      setSaving(true)

      if (isUpdate) {
        const { error: updateError } = await supabase
          .from('saju_readings')
          .update({ result: fullText })
          .eq('id', selectedId)

        if (updateError) throw updateError

        setViewingSaved(true)
        await loadReadings(user.id)
        showToast('해석 결과가 수정되었습니다')
      } else {
        const { data: saved, error: saveError } = await supabase
          .from('saju_readings')
          .insert({
            user_id: user.id,
            result: fullText,
          })
          .select('id, created_at')
          .single()

        if (saveError) throw saveError

        setSelectedId(saved.id)
        setViewingSaved(true)
        await loadReadings(user.id)
        showToast('해석 결과가 저장되었습니다')
      }
    } catch (err) {
      console.error(err)
      setError(err?.message || '해석 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
      setSaving(false)
    }
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
      showToast('사주 기록이 삭제되었습니다')
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
      .select('id, result, created_at')
      .eq('id', id)
      .single()

    setOpeningId(null)

    if (fetchError) {
      console.error(fetchError)
      setError(fetchError.message || '저장된 해석을 불러오지 못했습니다.')
      return
    }

    setResult(normalizeMarkdown(data.result ?? ''))

    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const genderLabel = profileForm.gender === 'male' ? '남성' : profileForm.gender === 'female' ? '여성' : ''
  const calendarLabel = profileForm.calendarType === 'lunar' ? '음력' : profileForm.calendarType === 'solar' ? '양력' : ''
  const timeLabel = profileForm.birthTime || '시간 미상'
  const submitLabel = loading
    ? '음뽀가 읽는 중...'
    : saving
      ? '살짝 저장하는 중...'
      : selectedId
        ? '다시 읽어 저장하기'
        : '음뽀에게 물어보기'

  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email || '로그인됨'

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
            <p className="auth-status">로그인 확인 중...</p>
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
              <p className="auth-status">Google 로그인 후 내 사주가 저장됩니다.</p>
              <button
                type="button"
                className="auth-btn is-google"
                onClick={handleSignInWithGoogle}
                disabled={signingIn}
              >
                {signingIn ? '연결 중...' : 'Google로 로그인'}
              </button>
            </>
          )}
        </div>

        <div className="sidebar-head">
          <h2 className="sidebar-title">음뽀의 기록</h2>
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
          disabled={formBusy || !user || !profile}
        >
          새 해석 하기
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
                아직 해석이 없어요.
                <span>다 읽으면 날짜별로 차곡차곡 쌓여요.</span>
              </>
            ) : (
              <>
                로그인하면 내 사주가 여기에 모여요.
                <span>Google로 살짝 들어와 주세요.</span>
              </>
            )}
          </p>
        ) : (
          <ul className="sidebar-list">
            {readings.map((reading, index) => {
              const isActive = selectedId === reading.id
              const isOpening = openingId === reading.id
              const label = formatReadingDate(reading.created_at) || `해석 ${readings.length - index}`
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
                      {isOpening ? '불러오는 중' : `${displayName}님`}
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
            <img src="/assets/eumppo.png" alt="" className="mascot-img mascot-img--hero" />
          </div>
          <p className="app-eyebrow">Saju Me · 음뽀</p>
          <h1>{viewingSaved ? '저장된 해석' : '사주 해석'}</h1>
          <p className="app-lead">
            {!user
              ? '로그인하고 프로필만 살짝 남겨두면, 음뽀가 천천히 사주를 읽어 줄게요.'
              : viewingSaved && selectedId
                ? '예전에 본 해석이에요. 다시 보면 기록이 새로 바뀌어요.'
                : '저장된 프로필로, 음뽀가 설렁설렁 읽어 줄게요.'}
          </p>
        </header>

        {viewingSaved && selectedId && (
          <div className="mode-banner" role="status">
            <span>이전 해석 열람 중</span>
            <div className="mode-banner-actions">
              <button
                type="button"
                className="mode-banner-btn is-delete"
                onClick={() =>
                  handleDeleteReading(selectedId, formatReadingDate(readings.find((item) => item.id === selectedId)?.created_at) || '이 기록')
                }
                disabled={formBusy}
              >
                삭제
              </button>
              <button type="button" className="mode-banner-btn" onClick={handleNewSaju} disabled={formBusy}>
                새 해석
              </button>
            </div>
          </div>
        )}

        {!authLoading && !user && (
          <div className="login-gate">
            <p>Google 계정으로 로그인하면 사주가 내 계정에만 저장됩니다.</p>
            <button
              type="button"
              className="auth-btn is-google"
              onClick={handleSignInWithGoogle}
              disabled={signingIn}
            >
              {signingIn ? '연결 중...' : 'Google로 로그인'}
            </button>
          </div>
        )}

        {user && profile && (
          <section className="profile-card" aria-label="내 프로필">
            <div className="profile-card-head">
              <h2>{profile.name}님</h2>
              <button
                type="button"
                className="profile-edit-btn"
                onClick={() => {
                  setProfileForm(profileToForm(profile))
                  setProfileError('')
                  setProfileModal('edit')
                }}
                disabled={formBusy}
              >
                수정
              </button>
            </div>
            <div className="result-meta" aria-label="사주 입력 정보">
              <span>{profile.birth_date}</span>
              <span>{profile.birth_time ? String(profile.birth_time).slice(0, 5) : '시간 미상'}</span>
              <span>{genderLabel}</span>
              <span>{calendarLabel}</span>
            </div>
          </section>
        )}

        <form onSubmit={handleSubmit} className={formBusy || !user || !profile ? 'is-busy' : ''}>
          <button type="submit" disabled={!canSubmit} aria-busy={formBusy}>
            {submitLabel}
          </button>
          {user && !profile && !profileLoading && !profileModal && (
            <p className="form-hint">프로필을 먼저 저장해 주세요</p>
          )}
        </form>

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
            <div className="mascot-loading" aria-hidden="true">
              <img src="/assets/eumppo.png" alt="" className="mascot-img mascot-img--loading" />
            </div>
            <h2>{saving ? '살짝 저장하는 중' : '음뽀가 읽는 중'}</h2>
            <p className="result-status">
              {saving
                ? '다 읽으면 목록에 조용히 남겨둘게요.'
                : '조금만 기다려 주세요. 천천히 글이 이어질 거예요.'}
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

        {result && (
          <section
            className={`result${viewingSaved ? ' is-saved' : ''}`}
            ref={resultRef}
            key={selectedId ?? 'live'}
          >
            <h2>
              {profileForm.name ? `${profileForm.name}님, 이렇게 보여요` : '음뽀의 해석'}
              {loading && <span className="streaming-dot" aria-label="작성 중" />}
            </h2>

            {(viewingSaved || (!loading && !saving)) && (
              <div className="result-meta" aria-label="사주 입력 정보">
                {profileForm.birthDate && <span>{profileForm.birthDate}</span>}
                <span>{timeLabel}</span>
                {genderLabel && <span>{genderLabel}</span>}
                {calendarLabel && <span>{calendarLabel}</span>}
              </div>
            )}

            {saving && (
              <p className="result-status is-inline" aria-live="polite">
                결과를 살짝 저장하는 중이에요...
              </p>
            )}

            <div className={`markdown ${loading ? 'is-streaming' : ''}`}>
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>

            {!loading && (
              <figure className="mascot-rest">
                <img src="/assets/eumppo.png" alt="음뽀 마스코트" className="mascot-img mascot-img--rest" />
                <figcaption>음뽀가 옆에 누워서 듣고 있어요</figcaption>
              </figure>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export default App
