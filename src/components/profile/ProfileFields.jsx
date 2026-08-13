export function ProfileFields({ form, onChange, idPrefix = 'profile' }) {
  const today = new Date().toISOString().slice(0, 10)

  const setField = (key) => (e) => {
    onChange({ ...form, [key]: e.target.value })
  }

  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-name`}>
          이름 <span className="req" aria-hidden="true">*</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          placeholder="예: 김사주"
          value={form.name}
          onChange={setField('name')}
          autoComplete="name"
          required
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={`${idPrefix}-birthDate`}>
            생년월일 <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id={`${idPrefix}-birthDate`}
            type="date"
            value={form.birthDate}
            onChange={setField('birthDate')}
            max={today}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-birthTime`}>
            태어난 시간 <span className="opt">선택</span>
          </label>
          <input
            id={`${idPrefix}-birthTime`}
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
              name={`${idPrefix}-gender`}
              value="male"
              checked={form.gender === 'male'}
              onChange={setField('gender')}
            />
            남성
          </label>
          <label className="radio">
            <input
              type="radio"
              name={`${idPrefix}-gender`}
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
              name={`${idPrefix}-calendarType`}
              value="solar"
              checked={form.calendarType === 'solar'}
              onChange={setField('calendarType')}
            />
            양력
          </label>
          <label className="radio">
            <input
              type="radio"
              name={`${idPrefix}-calendarType`}
              value="lunar"
              checked={form.calendarType === 'lunar'}
              onChange={setField('calendarType')}
            />
            음력
          </label>
        </div>
      </fieldset>
    </>
  )
}
