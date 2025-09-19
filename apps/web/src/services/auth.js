import { supabase } from '../lib/supabaseClient'

// Kayıt
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data, error }
}

// Giriş
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

// Kullanıcı bilgisi
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Çıkış
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}