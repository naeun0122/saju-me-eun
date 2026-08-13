import { supabase } from '../lib/supabase'
import { formToReadingPayload } from '../utils/readings'

const LIST_COLUMNS = 'id, created_at, name, birth_date, birth_time, gender, calendar_type, share_id'
const FULL_COLUMNS = 'id, result, created_at, name, birth_date, birth_time, gender, calendar_type, share_id'

export async function fetchReadings(userId) {
  return supabase
    .from('saju_readings')
    .select(LIST_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export async function insertReading(userId, fullText, form) {
  return supabase
    .from('saju_readings')
    .insert({
      user_id: userId,
      result: fullText,
      ...formToReadingPayload(form),
    })
    .select(LIST_COLUMNS)
    .single()
}

export async function findExistingReading(userId, form) {
  let query = supabase
    .from('saju_readings')
    .select(FULL_COLUMNS)
    .eq('user_id', userId)
    .eq('name', form.name.trim())
    .eq('birth_date', form.birthDate)
    .eq('gender', form.gender)
    .eq('calendar_type', form.calendarType || 'solar')
    .order('created_at', { ascending: false })
    .limit(1)

  query = form.birthTime ? query.eq('birth_time', form.birthTime) : query.is('birth_time', null)
  return query
}

export async function fetchReadingById(id) {
  return supabase.from('saju_readings').select(FULL_COLUMNS).eq('id', id).single()
}

export async function deleteReadingById(id) {
  return supabase.from('saju_readings').delete().eq('id', id)
}

export async function fetchSharedReading(shareId) {
  return supabase.rpc('get_shared_reading', { p_share_id: shareId })
}

export async function publishSharedReading(form, fullText) {
  return supabase.rpc('publish_shared_reading', {
    p_result: fullText,
    p_name: form.name.trim(),
    p_birth_date: form.birthDate,
    p_birth_time: form.birthTime || null,
    p_gender: form.gender,
    p_calendar_type: form.calendarType || 'solar',
  })
}

export async function fetchShareIdByReadingId(id) {
  return supabase.from('saju_readings').select('share_id').eq('id', id).single()
}
