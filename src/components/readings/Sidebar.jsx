import { AuthPanel } from '../auth'
import { ReadingList } from './ReadingList'

export function Sidebar({
  user,
  profile,
  authLoading,
  signingIn,
  formBusy,
  readings,
  listLoading,
  profileLoading,
  selectedId,
  openingId,
  deletingId,
  onSignIn,
  onSignOut,
  onEditProfile,
  onNewSaju,
  onSelectReading,
  onDeleteReading,
}) {
  return (
    <aside className="sidebar" aria-label="저장된 사주">
      <AuthPanel
        user={user}
        profile={profile}
        authLoading={authLoading}
        signingIn={signingIn}
        formBusy={formBusy}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        onEditProfile={onEditProfile}
      />

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
        onClick={() => onNewSaju('sidebar')}
        disabled={formBusy}
      >
        새 사주 만들기
      </button>

      <ReadingList
        user={user}
        readings={readings}
        listLoading={listLoading}
        profileLoading={profileLoading}
        selectedId={selectedId}
        openingId={openingId}
        deletingId={deletingId}
        formBusy={formBusy}
        onSelectReading={onSelectReading}
        onDeleteReading={onDeleteReading}
      />
    </aside>
  )
}
