import { LoadingMascot } from './LoadingMascot'

export function ResultSkeleton({ saving, resultRef }) {
  return (
    <section className="result" ref={resultRef} aria-busy="true" aria-label="해석 준비 중">
      <LoadingMascot />
      <h2>{saving ? '저장하는 중이다쨔무' : '읽는 중이다쨔무'}</h2>
      <p className="result-status">{saving ? '계정에 남기는 중이다쨔무' : '조금만 기다려라쨔무'}</p>
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
  )
}
