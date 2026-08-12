import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { interpretSajuStream } from './gemini'
import { supabase } from './supabase'
import './App.css'

/** DB/스트리밍 텍스트의 이스케이프된 줄바꿈을 실제 줄바꿈으로 복원 */
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
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

function App() {
  // --- 입력 상태들 ---
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  // --- 결과 / 로딩 / 에러 ---
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // --- 저장된 사주 목록 (사이드바) ---
  const [readings, setReadings] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [viewingSaved, setViewingSaved] = useState(false)
  const [openingId, setOpeningId] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const resultRef = useRef(null)
  const nameInputRef = useRef(null)
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

  const loadReadings = async () => {
    const { data, error: loadError } = await supabase
      .from('saju_readings')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error(loadError)
      setError('저장된 사주 목록을 불러오지 못했습니다.')
      return
    }

    setReadings(data ?? [])
  }

  useEffect(() => {
    ;(async () => {
      setListLoading(true)
      await loadReadings()
      setListLoading(false)
    })()
  }, [])

  // 입력·결과·선택을 비우고 새 사주 작성 시작
  const handleNewSaju = () => {
    if (loading || saving) return

    setName('')
    setBirthDate('')
    setBirthTime('')
    setGender('')
    setCalendarType('solar')
    setResult('')
    setError('')
    setLoading(false)
    setSaving(false)
    setSelectedId(null)
    setViewingSaved(false)
    setOpeningId(null)
    setUpdating(false)
    setDeletingId(null)

    requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const formBusy = loading || saving || updating || deletingId !== null
  const missingFields = []
  if (!name.trim()) missingFields.push('이름')
  if (!birthDate) missingFields.push('생년월일')
  if (!gender) missingFields.push('성별')
  const canSubmit = missingFields.length === 0 && !formBusy

  // 버튼 클릭 → Gemini 스트리밍 해석 → 완료 후 Supabase 저장(생성 또는 수정)
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

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
          name: name.trim(),
          birthDate,
          birthTime,
          gender,
          calendarType,
        },
        (textSoFar) => {
          setResult(normalizeMarkdown(textSoFar))
        },
      )

      setLoading(false)
      setSaving(true)

      const payload = {
        name: name.trim(),
        birth_date: birthDate,
        birth_time: birthTime || null,
        gender,
        calendar_type: calendarType,
        result: fullText,
      }

      if (isUpdate) {
        const { error: updateError } = await supabase
          .from('saju_readings')
          .update(payload)
          .eq('id', selectedId)

        if (updateError) throw updateError

        setViewingSaved(true)
        await loadReadings()
        showToast('해석 결과가 수정되었습니다')
      } else {
        const { data: saved, error: saveError } = await supabase
          .from('saju_readings')
          .insert(payload)
          .select('id, name, created_at')
          .single()

        if (saveError) throw saveError

        setSelectedId(saved.id)
        setViewingSaved(true)
        await loadReadings()
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

  const buildReadingPayload = () => ({
    name: name.trim(),
    birth_date: birthDate,
    birth_time: birthTime || null,
    gender,
    calendar_type: calendarType,
    result: result || '',
  })

  const canSaveChanges =
    selectedId &&
    name.trim() &&
    birthDate &&
    gender &&
    !formBusy

  const handleSaveChanges = async () => {
    if (!canSaveChanges) return

    setUpdating(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('saju_readings')
        .update(buildReadingPayload())
        .eq('id', selectedId)

      if (updateError) throw updateError

      await loadReadings()
      showToast('변경사항이 저장되었습니다')
    } catch (err) {
      console.error(err)
      setError(err?.message || '변경사항 저장에 실패했습니다.')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteReading = async (id, readingName) => {
    if (formBusy || deletingId === id) return

    const confirmed = window.confirm(`"${readingName}" 사주 기록을 삭제할까요?`)
    if (!confirmed) return

    setDeletingId(id)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('saju_readings')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      if (selectedId === id) {
        handleNewSaju()
      }

      await loadReadings()
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
      .select('*')
      .eq('id', id)
      .single()

    setOpeningId(null)

    if (fetchError) {
      console.error(fetchError)
      setError(fetchError.message || '저장된 해석을 불러오지 못했습니다.')
      return
    }

    setName(data.name ?? '')
    setBirthDate(data.birth_date ?? '')
    setBirthTime(data.birth_time ? String(data.birth_time).slice(0, 5) : '')
    setGender(data.gender ?? '')
    setCalendarType(data.calendar_type ?? 'solar')
    setResult(normalizeMarkdown(data.result ?? ''))

    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const genderLabel = gender === 'male' ? '남성' : gender === 'female' ? '여성' : ''
  const calendarLabel = calendarType === 'lunar' ? '음력' : calendarType === 'solar' ? '양력' : ''
  const timeLabel = birthTime || '시간 미상'
  const submitLabel = loading
    ? '해석 작성 중...'
    : saving
      ? '결과 저장 중...'
      : selectedId
        ? '다시 해석 후 저장'
        : '사주 해석하기'

  return (
    <div className="layout">
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      <aside className="sidebar" aria-label="저장된 사주">
        <div className="sidebar-head">
          <h2 className="sidebar-title">저장된 사주</h2>
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

        {listLoading ? (
          <div className="sidebar-loading" aria-busy="true" aria-label="목록 불러오는 중">
            <div className="sidebar-skel" />
            <div className="sidebar-skel" />
            <div className="sidebar-skel short" />
          </div>
        ) : readings.length === 0 ? (
          <p className="sidebar-empty">
            아직 저장된 사주가 없습니다.
            <span>해석이 끝나면 여기에 이름이 쌓입니다.</span>
          </p>
        ) : (
          <ul className="sidebar-list">
            {readings.map((reading) => {
              const isActive = selectedId === reading.id
              const isOpening = openingId === reading.id
              return (
                <li key={reading.id} className="sidebar-row">
                  <button
                    type="button"
                    className={`sidebar-item${isActive ? ' is-active' : ''}${isOpening ? ' is-opening' : ''}`}
                    onClick={() => handleSelectReading(reading.id)}
                    disabled={formBusy}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span className="sidebar-item-name">{reading.name}</span>
                    <span className="sidebar-item-date">
                      {isOpening ? '불러오는 중' : formatReadingDate(reading.created_at)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="sidebar-delete"
                    onClick={() => handleDeleteReading(reading.id, reading.name)}
                    disabled={formBusy}
                    aria-label={`${reading.name} 삭제`}
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
          <p className="app-eyebrow">Saju Me</p>
          <h1>{viewingSaved ? '저장된 사주' : '사주 입력'}</h1>
          <p className="app-lead">
            {viewingSaved && selectedId
              ? '입력값을 수정하거나 다시 해석할 수 있습니다. 정보만 바꿨다면 변경사항 저장을 눌러 주세요.'
              : '출생 정보를 입력하면 성격·기질·재능을 해석해 드립니다.'}
          </p>
        </header>

        {viewingSaved && selectedId && (
          <div className="mode-banner" role="status">
            <span>
              <strong>{name || '선택됨'}</strong>님 기록 열람 중
            </span>
            <div className="mode-banner-actions">
              <button
                type="button"
                className="mode-banner-btn is-save"
                onClick={handleSaveChanges}
                disabled={!canSaveChanges}
              >
                {updating ? '저장 중...' : '변경사항 저장'}
              </button>
              <button
                type="button"
                className="mode-banner-btn is-delete"
                onClick={() => handleDeleteReading(selectedId, name || '선택됨')}
                disabled={formBusy}
              >
                삭제
              </button>
              <button type="button" className="mode-banner-btn" onClick={handleNewSaju} disabled={formBusy}>
                새로 쓰기
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={formBusy ? 'is-busy' : ''}>
          <fieldset disabled={formBusy} className="form-fields">
            <div className="field">
              <label htmlFor="name">
                이름 <span className="req" aria-hidden="true">*</span>
              </label>
              <input
                id="name"
                ref={nameInputRef}
                type="text"
                placeholder="예: 김사주"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="birthDate">
                  생년월일 <span className="req" aria-hidden="true">*</span>
                </label>
                <input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="birthTime">
                  태어난 시간 <span className="opt">선택</span>
                </label>
                <input
                  id="birthTime"
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                />
                <p className="field-hint">모르면 비워 두어도 됩니다</p>
              </div>
            </div>

            <fieldset className="field">
              <legend>
                성별 <span className="req" aria-hidden="true">*</span>
              </legend>
              <div className="radio-row">
                <label className="radio">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={(e) => setGender(e.target.value)}
                  />
                  남성
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={(e) => setGender(e.target.value)}
                  />
                  여성
                </label>
              </div>
            </fieldset>

            <fieldset className="field">
              <legend>양력 / 음력</legend>
              <div className="radio-row">
                <label className="radio">
                  <input
                    type="radio"
                    name="calendarType"
                    value="solar"
                    checked={calendarType === 'solar'}
                    onChange={(e) => setCalendarType(e.target.value)}
                  />
                  양력
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    name="calendarType"
                    value="lunar"
                    checked={calendarType === 'lunar'}
                    onChange={(e) => setCalendarType(e.target.value)}
                  />
                  음력
                </label>
              </div>
            </fieldset>
          </fieldset>

          <button type="submit" disabled={!canSubmit} aria-busy={formBusy}>
            {submitLabel}
          </button>

          {!canSubmit && !formBusy && missingFields.length > 0 && (
            <p className="form-hint" aria-live="polite">
              {missingFields.join(' · ')}을(를) 입력해 주세요
            </p>
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
            <h2>{saving ? '결과 저장 중' : '해석 준비 중'}</h2>
            <p className="result-status">
              {saving ? '해석이 끝나면 목록에 바로 저장됩니다.' : '잠시만 기다려 주세요. 곧 글이 이어집니다.'}
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
              {viewingSaved && name ? `${name}님 해석 결과` : '해석 결과'}
              {loading && <span className="streaming-dot" aria-label="작성 중" />}
            </h2>

            {(viewingSaved || (!loading && !saving)) && (
              <div className="result-meta" aria-label="사주 입력 정보">
                {birthDate && <span>{birthDate}</span>}
                <span>{timeLabel}</span>
                {genderLabel && <span>{genderLabel}</span>}
                {calendarLabel && <span>{calendarLabel}</span>}
              </div>
            )}

            {saving && (
              <p className="result-status is-inline" aria-live="polite">
                결과를 저장하는 중...
              </p>
            )}

            <div className={`markdown ${loading ? 'is-streaming' : ''}`}>
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default App
