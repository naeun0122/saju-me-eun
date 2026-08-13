export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null

  return (
    <div className="error" role="alert">
      <p>{message}</p>
      <button type="button" className="error-dismiss" onClick={onDismiss}>
        닫기
      </button>
    </div>
  )
}
