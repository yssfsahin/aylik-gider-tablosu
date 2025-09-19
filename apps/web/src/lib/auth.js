// apps/web/src/lib/auth.js
import { supabase } from "./supabaseClient";

// Kayıt ol
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

// Giriş yap
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

// Çıkış
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// Aktif kullanıcıyı getir
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

// Auth olaylarını dinle (login/logout vs)
export function onAuthChange(callback) {
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => sub.subscription.unsubscribe();
}