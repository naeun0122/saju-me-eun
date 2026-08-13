export function ShareButton({ onShare, sharing, disabled }) {
  return (
    <div className="result-share">
      <button
        type="button"
        className="share-btn"
        onClick={onShare}
        disabled={disabled || sharing}
      >
        {sharing ? '링크 만드는 중이다쨔무' : '친구에게 보내쨔무'}
      </button>
      <p className="share-hint">링크 가진 사람은 로그인 없이 볼 수 있다쨔무</p>
    </div>
  )
}
