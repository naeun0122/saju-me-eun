import { ErrorBanner, Toast } from './components/common'
import { ProfileModal } from './components/profile'
import { SavedBanner, Sidebar } from './components/readings'
import { AppHeader, ResultSection, SajuForm } from './components/saju'
import { useSajuApp } from './hooks/useSajuApp'
import './styles/layout.css'
import './styles/sidebar.css'
import './styles/modal.css'
import './styles/form.css'
import './styles/result.css'
import './styles/mascot.css'

export default function App() {
  const {
    toast,
    error,
    setError,
    result,
    visibleResult,
    loading,
    saving,
    readings,
    listLoading,
    selectedId,
    viewingSaved,
    composerOpen,
    openingId,
    deletingId,
    user,
    authLoading,
    signingIn,
    profile,
    profileLoading,
    profileForm,
    setProfileForm,
    profileModal,
    profileSaving,
    profileError,
    resultRef,
    formBusy,
    canSubmit,
    showLockedPreview,
    showComposer,
    showSavedBanner,
    handleSignInWithGoogle,
    handleSignOut,
    handleSaveProfile,
    handleCloseProfileModal,
    handleEditProfile,
    handleNewSaju,
    handleSubmit,
    handleDeleteReading,
    handleDeleteSelected,
    handleSelectReading,
  } = useSajuApp()

  return (
    <div className="layout">
      <Toast message={toast} />

      {profileModal && (
        <ProfileModal
          mode={profileModal}
          form={profileForm}
          onChange={setProfileForm}
          onSubmit={handleSaveProfile}
          onClose={handleCloseProfileModal}
          saving={profileSaving}
          error={profileError}
        />
      )}

      <Sidebar
        user={user}
        profile={profile}
        authLoading={authLoading}
        signingIn={signingIn}
        formBusy={formBusy}
        readings={readings}
        listLoading={listLoading}
        profileLoading={profileLoading}
        selectedId={selectedId}
        openingId={openingId}
        deletingId={deletingId}
        onSignIn={handleSignInWithGoogle}
        onSignOut={handleSignOut}
        onEditProfile={handleEditProfile}
        onNewSaju={handleNewSaju}
        onSelectReading={handleSelectReading}
        onDeleteReading={handleDeleteReading}
      />

      <div className="app">
        <AppHeader showComposer={showComposer} showLockedPreview={showLockedPreview} />

        {showSavedBanner && (
          <SavedBanner onDelete={handleDeleteSelected} onNewSaju={handleNewSaju} disabled={formBusy} />
        )}

        {showComposer && !profileModal && (
          <SajuForm
            form={profileForm}
            onChange={setProfileForm}
            onSubmit={handleSubmit}
            formBusy={formBusy}
            canSubmit={canSubmit}
            loading={loading}
            saving={saving}
          />
        )}

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <ResultSection
          key={selectedId ?? 'live'}
          result={result}
          visibleResult={visibleResult}
          profileForm={profileForm}
          loading={loading}
          saving={saving}
          composerOpen={composerOpen}
          viewingSaved={viewingSaved}
          showLockedPreview={showLockedPreview}
          signingIn={signingIn}
          resultRef={resultRef}
          onSignIn={handleSignInWithGoogle}
        />
      </div>
    </div>
  )
}
