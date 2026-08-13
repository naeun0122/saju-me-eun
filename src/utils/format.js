export function formatReadingDate(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

export function formatReadingLabel(reading) {
  if (reading?.name && reading?.birth_date) {
    return `${reading.name} · ${reading.birth_date}`
  }
  return formatReadingDate(reading?.created_at)
}

export function genderLabel(gender) {
  if (gender === 'male') return '남성'
  if (gender === 'female') return '여성'
  return ''
}

export function calendarLabel(calendarType) {
  if (calendarType === 'lunar') return '음력'
  if (calendarType === 'solar') return '양력'
  return ''
}
