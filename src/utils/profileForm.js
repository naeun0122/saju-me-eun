export function emptyProfileForm(googleName = '') {
  return {
    name: googleName,
    birthDate: '',
    birthTime: '',
    gender: '',
    calendarType: 'solar',
  }
}

export function profileToForm(profile) {
  if (!profile) return emptyProfileForm()
  return {
    name: profile.name ?? '',
    birthDate: profile.birth_date ?? '',
    birthTime: profile.birth_time ? String(profile.birth_time).slice(0, 5) : '',
    gender: profile.gender ?? '',
    calendarType: profile.calendar_type ?? 'solar',
  }
}

export function formToProfilePayload(form) {
  return {
    name: form.name.trim(),
    birth_date: form.birthDate,
    birth_time: form.birthTime || null,
    gender: form.gender,
    calendar_type: form.calendarType,
  }
}

export function getMissingProfileFields(form) {
  const missing = []
  if (!form.name.trim()) missing.push('이름')
  if (!form.birthDate) missing.push('생년월일')
  if (!form.gender) missing.push('성별')
  return missing
}
