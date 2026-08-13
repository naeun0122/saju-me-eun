import { emptyProfileForm } from './profileForm'

export function chartKey(form) {
  return [
    form.name?.trim() ?? '',
    form.birthDate ?? '',
    form.birthTime || '',
    form.gender ?? '',
    form.calendarType || 'solar',
  ].join('|')
}

export function readingToForm(reading) {
  if (!reading) return emptyProfileForm()
  return {
    name: reading.name ?? '',
    birthDate: reading.birth_date ?? '',
    birthTime: reading.birth_time ? String(reading.birth_time).slice(0, 5) : '',
    gender: reading.gender ?? '',
    calendarType: reading.calendar_type ?? 'solar',
  }
}

export function formToReadingPayload(form) {
  return {
    name: form.name.trim(),
    birth_date: form.birthDate,
    birth_time: form.birthTime || null,
    gender: form.gender,
    calendar_type: form.calendarType || 'solar',
  }
}
