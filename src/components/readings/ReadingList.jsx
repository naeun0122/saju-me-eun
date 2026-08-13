import { formatReadingDate, formatReadingLabel } from '../../utils/format'

export function ReadingList({
  user,
  readings,
  listLoading,
  profileLoading,
  selectedId,
  openingId,
  deletingId,
  formBusy,
  onSelectReading,
  onDeleteReading,
}) {
  if (listLoading || profileLoading) {
    return (
      <div className="sidebar-loading" aria-busy="true" aria-label="목록 불러오는 중">
        <div className="sidebar-skel" />
        <div className="sidebar-skel" />
        <div className="sidebar-skel short" />
      </div>
    )
  }

  if (readings.length === 0) {
    return (
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
    )
  }

  return (
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
              onClick={() => onSelectReading(reading.id)}
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
              onClick={() => onDeleteReading(reading.id, label)}
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
  )
}
