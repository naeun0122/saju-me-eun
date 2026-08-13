import ReactMarkdown from 'react-markdown'
import { MASCOT_MAIN } from '../../../constants/mascot'
import { calendarLabel, genderLabel } from '../../../utils/format'
import { LoadingMascot } from './LoadingMascot'
import { ResultSkeleton } from './ResultSkeleton'

export function ResultSection({
  result,
  visibleResult,
  profileForm,
  loading,
  saving,
  composerOpen,
  viewingSaved,
  showLockedPreview,
  signingIn,
  resultRef,
  onSignIn,
}) {
  if ((loading || saving) && !result) {
    return <ResultSkeleton saving={saving} resultRef={resultRef} />
  }

  if (!result || composerOpen) return null

  const timeLabel = profileForm.birthTime || '시간 미상'

  return (
    <section
      className={`result${viewingSaved ? ' is-saved' : ''}${showLockedPreview ? ' is-teaser' : ''}`}
      ref={resultRef}
    >
      {loading && <LoadingMascot />}
      <h2>
        {profileForm.name ? `${profileForm.name}님 사주` : '사주 해석'}
        {loading && <span className="streaming-dot" aria-label="작성 중" />}
      </h2>

      {!loading && !saving && (
        <div className="result-meta" aria-label="사주 입력 정보">
          {profileForm.birthDate && <span>{profileForm.birthDate}</span>}
          <span>{timeLabel}</span>
          {genderLabel(profileForm.gender) && <span>{genderLabel(profileForm.gender)}</span>}
          {calendarLabel(profileForm.calendarType) && <span>{calendarLabel(profileForm.calendarType)}</span>}
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
            onClick={() => onSignIn('teaser')}
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
  )
}
