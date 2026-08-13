import { supabase } from '../lib/supabase'
import { formToProfilePayload } from '../utils/profileForm'

export async function fetchProfile(userId) {
  return supabase.from('users').select('*').eq('id', userId).maybeSingle()
}

export async function upsertProfile(authUser, form) {
  return supabase
    .from('users')
    .upsert(
      {
        id: authUser.id,
        ...formToProfilePayload(form),
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single()
}
