export function emptyProfileForm(googleName = '') {
  return {
    name: googleName,
    birthDate: '',
    birthTime: '',
    gender: '',
    calendarType: 'solar',
  }
}

export function profileToForm(profile) {
  if (!profile) return emptyProfileForm()
  return {
    name: profile.name ?? '',
    birthDate: profile.birth_date ?? '',
    birthTime: profile.birth_time ? String(profile.birth_time).slice(0, 5) : '',
    gender: profile.gender ?? '',
    calendarType: profile.calendar_type ?? 'solar',
  }
}

export function formToProfilePayload(form) {
  return {
    name: form.name.trim(),
    birth_date: form.birthDate,
    birth_time: form.birthTime || null,
    gender: form.gender,
    calendar_type: form.calendarType,
  }
}

export function getMissingProfileFields(form) {
  const missing = []
  if (!form.name.trim()) missing.push('이름')
  if (!form.birthDate) missing.push('생년월일')
  if (!form.gender) missing.push('성별')
  return missing
}

export function ProfileModal({
  mode,
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  error,
}) {
  const isOnboarding = mode === 'onboarding'
  const missing = getMissingProfileFields(form)
  const canSave = missing.length === 0 && !saving
  const today = new Date().toISOString().slice(0, 10)

  const setField = (key) => (e) => {
    onChange({ ...form, [key]: e.target.value })
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="profile-modal-title">
          {isOnboarding ? '음뽀가 잠깐 물어볼게요' : '프로필 살짝 고치기'}
        </h2>
        <p className="modal-lead">
          {isOnboarding
            ? '처음 왔구나 싶어요. 이름과 생일만 남겨두면, 다음부터는 바로 읽어줄게요.'
            : '출생 정보를 바꾸면 다음 해석부터 반영돼요.'}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSave) onSubmit()
          }}
        >
          <div className="field">
            <label htmlFor="profile-name">
              이름 <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="profile-name"
              type="text"
              placeholder="예: 김사주"
              value={form.name}
              onChange={setField('name')}
              autoComplete="name"
              autoFocus
              required
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="profile-birthDate">
                생년월일 <span className="req" aria-hidden="true">*</span>
              </label>
              <input
                id="profile-birthDate"
                type="date"
                value={form.birthDate}
                onChange={setField('birthDate')}
                max={today}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="profile-birthTime">
                태어난 시간 <span className="opt">선택</span>
              </label>
              <input
                id="profile-birthTime"
                type="time"
                value={form.birthTime}
                onChange={setField('birthTime')}
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
                  name="profile-gender"
                  value="male"
                  checked={form.gender === 'male'}
                  onChange={setField('gender')}
                />
                남성
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="profile-gender"
                  value="female"
                  checked={form.gender === 'female'}
                  onChange={setField('gender')}
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
                  name="profile-calendarType"
                  value="solar"
                  checked={form.calendarType === 'solar'}
                  onChange={setField('calendarType')}
                />
                양력
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="profile-calendarType"
                  value="lunar"
                  checked={form.calendarType === 'lunar'}
                  onChange={setField('calendarType')}
                />
                음력
              </label>
            </div>
          </fieldset>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            {!isOnboarding && (
              <button type="button" className="modal-btn is-ghost" onClick={onClose} disabled={saving}>
                닫기
              </button>
            )}
            <button type="submit" className="modal-btn is-primary" disabled={!canSave}>
              {saving ? '저장 중...' : isOnboarding ? '저장하고 시작하기' : '프로필 저장'}
            </button>
          </div>

          {!canSave && !saving && missing.length > 0 && (
            <p className="form-hint">{missing.join(' · ')}을(를) 입력해 주세요</p>
          )}
        </form>
      </div>
    </div>
  )
}
