export function AuthPanel({
  user,
  profile,
  authLoading,
  signingIn,
  formBusy,
  onSignIn,
  onSignOut,
  onEditProfile,
}) {
  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email || '로그인됨'

  if (authLoading) {
    return (
      <div className="auth-panel">
        <p className="auth-status">로그인 보는 중이다쨔무</p>
      </div>
    )
  }

  if (user) {
    return (
      <div className="auth-panel">
        <p className="auth-user" title={user.email ?? ''}>
          {displayName}
        </p>
        {profile && (
          <p className="auth-meta">
            {profile.birth_date} · {profile.birth_time ? String(profile.birth_time).slice(0, 5) : '시간 미상'}
          </p>
        )}
        <button
          type="button"
          className="auth-btn is-outline"
          onClick={onEditProfile}
          disabled={formBusy || !profile}
        >
          프로필 수정
        </button>
        <button type="button" className="auth-btn is-outline" onClick={onSignOut} disabled={formBusy}>
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <div className="auth-panel">
      <p className="auth-status">로그인 안 해도 된다쨔무. 저장은 로그인하면 된다쨔무.</p>
      <button
        type="button"
        className="auth-btn is-google"
        onClick={() => onSignIn('sidebar')}
        disabled={signingIn}
      >
        {signingIn ? '연결 중이다쨔무' : 'Google로 로그인하자쨔무'}
      </button>
    </div>
  )
}
