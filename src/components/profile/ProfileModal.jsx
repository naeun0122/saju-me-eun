import { getMissingProfileFields } from '../../utils/profileForm'
import { ProfileFields } from './ProfileFields'

export function ProfileModal({ mode, form, onChange, onSubmit, onClose, saving, error }) {
  const isOnboarding = mode === 'onboarding'
  const missing = getMissingProfileFields(form)
  const canSave = missing.length === 0 && !saving

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="profile-modal-title">{isOnboarding ? '잠깐 물어볼게쨔무' : '프로필 수정'}</h2>
        <p className="modal-lead">
          {isOnboarding
            ? '저장하려면 이름과 생일이 필요하다쨔무'
            : '여기 정보를 바꾸면 다음 사주부터 반영된다쨔무'}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSave) onSubmit()
          }}
        >
          <ProfileFields form={form} onChange={onChange} idPrefix="profile" />

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            {!isOnboarding && (
              <button type="button" className="modal-btn is-ghost" onClick={onClose} disabled={saving}>
                닫기
              </button>
            )}
            <button type="submit" className="modal-btn is-primary" disabled={!canSave}>
              {saving ? '저장하는 중이다쨔무' : isOnboarding ? '저장하고 이어서 보자쨔무' : '프로필 저장'}
            </button>
          </div>

          {!canSave && !saving && missing.length > 0 && (
            <p className="form-hint">{missing.join(' · ')}을 적어라쨔무</p>
          )}
        </form>
      </div>
    </div>
  )
}
