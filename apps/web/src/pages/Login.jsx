// apps/web/src/pages/Login.jsx
import { useState } from 'react'
import { signIn, signUp } from '../services/auth'

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        'px-4 py-2 rounded-lg text-sm font-medium transition ' +
        (active
          ? 'bg-indigo-600 text-white shadow'
          : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800')
      }
      type="button"
    >
      {children}
    </button>
  )
}

function Message({ kind, children }) {
  const base =
    'mt-3 text-sm px-3 py-2 rounded-md border'
  const style =
    kind === 'error'
      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  return <div className={`${base} ${style}`}>{children}</div>
}

export default function LoginPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null) // { kind: 'error'|'ok', text: string } | null

  const validate = () => {
    if (!email || !email.includes('@')) {
      setMsg({ kind: 'error', text: 'Geçerli bir e-posta girin.' })
      return false
    }
    if (!password || password.length < 6) {
      setMsg({ kind: 'error', text: 'Şifre en az 6 karakter olmalı.' })
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg(null)
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
        setMsg({ kind: 'ok', text: 'Giriş başarılı!' })
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setMsg({ kind: 'ok', text: 'Kayıt başarılı! Lütfen e-postanı doğrula.' })
      }
    } catch (err) {
      setMsg({ kind: 'error', text: err?.message || 'Bir hata oluştu.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur p-6 shadow-sm">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-5">
            <TabButton active={mode === 'signin'} onClick={() => setMode('signin')}>
              Giriş
            </TabButton>
            <TabButton active={mode === 'signup'} onClick={() => setMode('signup')}>
              Kayıt Ol
            </TabButton>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                E-posta
              </label>
              <input
                type="email"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label={showPwd ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={
                'w-full rounded-lg px-4 py-2 font-semibold text-white transition ' +
                (loading
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700')
              }
            >
              {loading ? 'İşleniyor…' : mode === 'signin' ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>
          </form>

          {msg && <Message kind={msg.kind}>{msg.text}</Message>}

          {/* Alt yardımcı metin */}
          <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
            {mode === 'signin' ? (
              <>
                Hesabın yok mu?{' '}
                <button
                  type="button"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  onClick={() => setMode('signup')}
                >
                  Kayıt ol
                </button>
              </>
            ) : (
              <>
                Zaten hesabın var mı?{' '}
                <button
                  type="button"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  onClick={() => setMode('signin')}
                >
                  Giriş yap
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}