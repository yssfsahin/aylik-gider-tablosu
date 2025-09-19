// apps/web/src/components/AuthModal.jsx
import React, { useState } from "react";
import { signIn, signUp } from "../lib/auth";

export default function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const fn = mode === "login" ? signIn : signUp;
      const { error } = await fn(email, pw);
      if (error) throw error;
      onSuccess?.();
      onClose?.();
    } catch (ex) {
      setErr(ex.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{mode === "login" ? "Giriş Yap" : "Kayıt Ol"}</h3>
          <button className="button" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">E-posta</label>
            <input className="input w-full" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@mail.com"/>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Şifre</label>
            <input className="input w-full" type="password" required value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••"/>
          </div>

          {err && <div className="text-sm text-rose-600">{err}</div>}

          <button className="button button-primary w-full" type="submit" disabled={loading}>
            {loading ? "Gönderiliyor..." : (mode === "login" ? "Giriş Yap" : "Kayıt Ol")}
          </button>
        </form>

        <div className="mt-3 text-sm text-slate-600 text-center">
          {mode === "login" ? (
            <>Hesabın yok mu?{" "}
              <button className="text-indigo-600" onClick={()=>setMode("signup")}>Kayıt ol</button></>
          ) : (
            <>Hesabın var mı?{" "}
              <button className="text-indigo-600" onClick={()=>setMode("login")}>Giriş yap</button></>
          )}
        </div>
      </div>
    </div>
  );
}