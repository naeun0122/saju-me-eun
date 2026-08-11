import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { interpretSajuStream } from './gemini'
import './App.css'

function App() {
  // --- 입력 상태들 ---
  const [name, setName] = useState('') // 이름
  const [birthDate, setBirthDate] = useState('') // 생년월일 (예: 1990-01-01)
  const [birthTime, setBirthTime] = useState('') // 태어난 시간 (예: 14:30)
  const [gender, setGender] = useState('') // 성별: 'male' | 'female'
  const [calendarType, setCalendarType] = useState('solar') // 양력/음력: 'solar' | 'lunar'

  // --- 결과 / 로딩 / 에러 ---
  const [result, setResult] = useState('') // Gemini 해석 결과 (스트리밍으로 점점 채워짐)
  const [loading, setLoading] = useState(false) // 요청 중인지
  const [error, setError] = useState('') // 에러 메시지

  const handleNameChange = (e) => {
    setName(e.target.value)
  }

  const handleBirthDateChange = (e) => {
    setBirthDate(e.target.value)
  }

  const handleBirthTimeChange = (e) => {
    setBirthTime(e.target.value)
  }

  const handleGenderChange = (e) => {
    setGender(e.target.value)
  }

  const handleCalendarTypeChange = (e) => {
    setCalendarType(e.target.value)
  }

  // 필수 값이 다 채워졌는지 확인
  const canSubmit = name && birthDate && gender && calendarType && !loading

  // 버튼 클릭 → Gemini 스트리밍 해석
  const handleSubmit = async (e) => {
    e.preventDefault() // form 새로고침 방지
    if (!canSubmit) return

    setLoading(true)
    setError('')
    setResult('')

    try {
      await interpretSajuStream(
        {
          name,
          birthDate,
          birthTime,
          gender,
          calendarType,
        },
        // 글자가 올 때마다 화면에 바로 반영
        (textSoFar) => {
          setResult(textSoFar)
        },
      )
    } catch (err) {
      console.error(err)
      setError(err?.message || '해석 요청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <h1>사주 입력</h1>

      <form onSubmit={handleSubmit}>
        {/* 이름 */}
        <div className="field">
          <label htmlFor="name">이름</label>
          <input
            id="name"
            type="text"
            placeholder="이름을 입력하세요"
            value={name}
            onChange={handleNameChange}
          />
        </div>

        {/* 생년월일 */}
        <div className="field">
          <label htmlFor="birthDate">생년월일</label>
          <input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={handleBirthDateChange}
          />
        </div>

        {/* 태어난 시간 */}
        <div className="field">
          <label htmlFor="birthTime">태어난 시간</label>
          <input
            id="birthTime"
            type="time"
            value={birthTime}
            onChange={handleBirthTimeChange}
          />
        </div>

        {/* 성별 */}
        <fieldset className="field">
          <legend>성별</legend>
          <label className="radio">
            <input
              type="radio"
              name="gender"
              value="male"
              checked={gender === 'male'}
              onChange={handleGenderChange}
            />
            남성
          </label>
          <label className="radio">
            <input
              type="radio"
              name="gender"
              value="female"
              checked={gender === 'female'}
              onChange={handleGenderChange}
            />
            여성
          </label>
        </fieldset>

        {/* 양력/음력 */}
        <fieldset className="field">
          <legend>양력 / 음력</legend>
          <label className="radio">
            <input
              type="radio"
              name="calendarType"
              value="solar"
              checked={calendarType === 'solar'}
              onChange={handleCalendarTypeChange}
            />
            양력
          </label>
          <label className="radio">
            <input
              type="radio"
              name="calendarType"
              value="lunar"
              checked={calendarType === 'lunar'}
              onChange={handleCalendarTypeChange}
            />
            음력
          </label>
        </fieldset>

        <button type="submit" disabled={!canSubmit}>
          {loading ? '해석 중...' : '사주 해석하기'}
        </button>
      </form>

      {/* 에러 메시지 */}
      {error && <p className="error">{error}</p>}

      {/* 첫 글자 오기 전: 스켈레톤 */}
      {loading && !result && (
        <section className="result" aria-busy="true" aria-label="해석 준비 중">
          <h2>해석 결과</h2>
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

      {/* 스트리밍 중/완료: 글자가 나오는 대로 마크다운 표시 */}
      {result && (
        <section className="result">
          <h2>
            해석 결과
            {loading && <span className="streaming-dot" aria-label="작성 중" />}
          </h2>
          <div className={`markdown ${loading ? 'is-streaming' : ''}`}>
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </section>
      )}
    </div>
  )
}

export default App
