import { getMissingProfileFields } from '../../../utils/profileForm'
import { ProfileFields } from '../../profile'

export function SajuForm({ form, onChange, onSubmit, formBusy, canSubmit, loading, saving }) {
  const submitLabel = loading
    ? '읽는 중이다쨔무'
    : saving
      ? '저장하는 중이다쨔무'
      : '해석해주겠다쨔무'

  return (
    <form onSubmit={onSubmit} className={formBusy ? 'is-busy' : ''}>
      <ProfileFields form={form} onChange={onChange} idPrefix="saju" />
      <button type="submit" disabled={!canSubmit} aria-busy={formBusy}>
        {submitLabel}
      </button>
      {!canSubmit && !formBusy && getMissingProfileFields(form).length > 0 && (
        <p className="form-hint">이름, 생일, 성별을 적으면 된다쨔무</p>
      )}
    </form>
  )
}
