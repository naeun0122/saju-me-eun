import { MASCOT_MAIN } from '../../../constants/mascot'

export function AppHeader({ showComposer, showLockedPreview }) {
  const title = showComposer ? '새 사주' : '사주 해석'
  const lead = showComposer
    ? '날짜랑 시간을 적으면 읽어주겠다쨔무'
    : showLockedPreview
      ? '앞부분만 먼저 보여줄게쨔무'
      : '이 사주는 이렇게 읽었다쨔무'

  return (
    <header className="app-header">
      <div className="mascot-hero" aria-hidden="true">
        <img src={MASCOT_MAIN} alt="" className="mascot-img mascot-img--hero" />
      </div>
      <p className="app-eyebrow">Saju Me · 요구르트 요정 음뽀쨔무</p>
      <h1>{title}</h1>
      <p className="app-lead">{lead}</p>
    </header>
  )
}
