export function SavedBanner({ onDelete, onNewSaju, disabled, isSharedView }) {
  if (isSharedView) {
    return (
      <div className="mode-banner" role="status">
        <span>친구가 보낸 사주다쨔무</span>
        <div className="mode-banner-actions">
          <button
            type="button"
            className="mode-banner-btn"
            onClick={() => onNewSaju('shared')}
            disabled={disabled}
          >
            내 사주도 보기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mode-banner" role="status">
      <span>저장해 둔 사주다쨔무</span>
      <div className="mode-banner-actions">
        <button
          type="button"
          className="mode-banner-btn is-delete"
          onClick={onDelete}
          disabled={disabled}
        >
          삭제
        </button>
        <button
          type="button"
          className="mode-banner-btn"
          onClick={() => onNewSaju('banner')}
          disabled={disabled}
        >
          새 사주 만들기
        </button>
      </div>
    </div>
  )
}
