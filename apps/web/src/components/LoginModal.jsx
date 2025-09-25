// apps/web/src/components/LoginModal.jsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function LoginModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");

  const upsertProfile = async (displayName) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles").upsert(
        { id: user.id, email: user.email, name: displayName?.trim() || null },
        { onConflict: "id" }
      );
    } catch {}
  };

  if (!open) return null;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (mode === "signup" && password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      setLoading(false);
      return;
    }
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        else {
          await upsertProfile();
          onClose?.();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        });
        if (error) setError(error.message);
        else {
          await upsertProfile(name);
          onClose?.();
        }
      }
    } catch (err) {
      setError(err.message || (mode === "login" ? "Giriş başarısız." : "Kayıt başarısız."));
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    try {
      setError("");
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
      if (error) setError(error.message);
      // Supabase yönlendirme akışı başlatır; success durumda redirect olur
    } catch (err) {
      setError(err.message || "Google ile giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Lütfen e-posta adresinizi girin.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      alert("Şifre sıfırlama bağlantısı e‑posta adresinize gönderildi.");
    } catch (ex) {
      setError(ex.message || "Şifre sıfırlama başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true">
      {/* arka plan + blur */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-md" onClick={onClose} />

      {/* cam efekti kart */}
      <div className="relative w-[85%] max-w-sm rounded-2xl p-6 shadow-2xl text-white
                      bg-white/20 dark:bg-slate-800/30
                      border border-white/30 dark:border-slate-700/40
                      backdrop-blur-xl">
        <div className="text-center mb-4">
          <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-indigo-500/90 flex items-center justify-center text-white font-bold">
            L
          </div>
          <h2 className="text-2xl font-bold">{mode === "login" ? "Giriş" : "Kayıt Ol"}</h2>
          <p className="text-sm mt-1 text-white/80">{mode === "login" ? "E-posta ve şifreyle giriş yap" : "E-posta ve şifreyle kayıt ol"}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 max-w-xs mx-auto">
          {mode === "signup" && (
            <label className="block">
              <span className="text-sm font-bold">Ad Soyad</span>
              <input
                className="mt-2 input w-full text-base text-slate-900 dark:text-white bg-white/80 dark:bg-slate-900/60 placeholder-slate-500 dark:placeholder-white/60"
                type="text"
                placeholder="Yusuf Demir"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-bold">E-posta</span>
            <input
              className="mt-2 input w-full text-base text-slate-900 dark:text-white bg-white/80 dark:bg-slate-900/60 placeholder-slate-500 dark:placeholder-white/60"
              type="email"
              placeholder="ornek@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold">Şifre</span>
            <input
              className="mt-2 input w-full text-base text-slate-900 dark:text-white bg-white/80 dark:bg-slate-900/60 placeholder-slate-500 dark:placeholder-white/60"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {mode === "signup" && (
            <label className="block">
              <span className="text-sm font-bold">Şifre (Tekrar)</span>
              <input
                className="mt-2 input w-full text-base text-slate-900 dark:text-white bg-white/80 dark:bg-slate-900/60 placeholder-slate-500 dark:placeholder-white/60"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              {confirm && password && confirm !== password && (
                <span className="text-xs text-rose-500 mt-1 inline-block">Şifreler aynı değil</span>
              )}
            </label>
          )}

          {error && (
            <div className="text-sm text-rose-600 bg-rose-50/70 dark:bg-rose-900/30 border border-rose-200/60 dark:border-rose-700/50 rounded-md p-2 mt-3 mb-3">
              {error}
            </div>
          )}

          <div className="flex gap-2 mt-8 mb-5">
            <button
              type="submit"
              disabled={loading}
              className="button button-primary flex-1 disabled:opacity-60"
            >
              {loading ? (mode === "login" ? "Giriş yapılıyor..." : "Kayıt yapılıyor...") : (mode === "login" ? "Giriş Yap" : "Kayıt Ol")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="button flex-1"
            >
              Vazgeç
            </button>
          </div>
          {mode === "login" && (
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={loading}
              className="button w-full mt-2 bg-white text-ink border border-slate-300 hover:bg-slate-50 disabled:opacity-60"
              title="E-postanı gir, şifre sıfırlama bağlantısı gönderelim"
            >
              Şifremi Unuttum
            </button>
          )}
          {mode === "login" ? (
            <button
              type="button"
              className="button w-full bg-green-500 hover:bg-green-600 text-white mt-3"
              onClick={() => { setMode("signup"); setError(""); setConfirm(""); setName(""); }}
            >
              Kayıt Ol
            </button>
          ) : (
            <button
              type="button"
              className="button w-full bg-slate-200 hover:bg-slate-300 text-slate-900 mt-3"
              onClick={() => { setMode("login"); setError(""); setConfirm(""); setName(""); }}
            >
              Zaten hesabın var mı? Girişe Dön
            </button>
          )}
          <button type="button" onClick={onGoogle} disabled={loading} className="button w-full bg-red-500 hover:bg-red-600 text-white mt-4 disabled:opacity-60">
            Google ile Giriş Yap
          </button>

        </form>
      </div>
    </div>
  );
}