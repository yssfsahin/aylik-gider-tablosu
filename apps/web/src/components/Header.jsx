import React from "react";

export default function Header({ activeTab, onSelectTab = () => {}, user, onOpenAuth = () => {}, onSignOut = () => {} }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const displayName = React.useMemo(() => {
    return (user?.user_metadata?.name || user?.email || user?.phone || "Kullanıcı");
  }, [user]);

  // ESC ile kapat + body scroll lock
  React.useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Header / Full-width menu */}
      <nav className="w-full bg-white/10 backdrop-blur border-b border-white/15">
        <div className="container py-4 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2 text-white">
            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
              💳
            </div>
            <div className="leading-tight">
              <div className="text-white/80 text-xs">Hesap Yönetim Sistemi</div>
              <div className="text-lg font-semibold">Hesabın Kralı</div>
            </div>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => onSelectTab("plan")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === "plan"
                  ? "bg-indigo-600 text-white"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              }`}
            >
              Aylık Hesaplama
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("aylik")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === "aylik"
                  ? "bg-indigo-600 text-white"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              }`}
            >
              Yıllık Hesaplama
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("zam")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === "zam"
                  ? "bg-indigo-600 text-white"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              }`}
            >
              Zam Hesaplama
            </button>
            {user ? (
              <div className="ml-2 flex items-center gap-2">
                <span className="hidden sm:inline text-sm text-white/90">Merhaba, {displayName}.</span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="px-3 py-2 rounded-md text-sm font-semibold bg-white text-slate-900 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  Çıkış
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="ml-2 px-3 py-2 rounded-md text-sm font-semibold bg-white text-slate-900 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                Giriş
              </button>
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Menüyü aç/kapat"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {mobileOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-72 bg-slate-900/95 text-white backdrop-blur border-l border-white/10 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                  💳
                </div>
                <span className="font-semibold">Hesabın Kralı</span>
              </div>
              <button
                className="rounded-md p-2 hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
                aria-label="Kapat"
              >
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <button
              className={`w-full text-left px-3 py-2 rounded-md ${
                activeTab === "plan" ? "bg-indigo-600" : "hover:bg-white/10"
              }`}
              onClick={() => {
                onSelectTab("plan");
                setMobileOpen(false);
              }}
            >
              Aylık Hesaplama
            </button>
            <button
              className={`w-full text-left px-3 py-2 rounded-md ${
                activeTab === "aylik" ? "bg-indigo-600" : "hover:bg-white/10"
              }`}
              onClick={() => {
                onSelectTab("aylik");
                setMobileOpen(false);
              }}
            >
              Yıllık Hesaplama
            </button>
            <button
              className={`w-full text-left px-3 py-2 rounded-md ${
                activeTab === "zam" ? "bg-indigo-600" : "hover:bg-white/10"
              }`}
              onClick={() => {
                onSelectTab("zam");
                setMobileOpen(false);
              }}
            >
              Zam Hesaplama
            </button>
            {user ? (
              <div className="mt-2">
                <div className="px-3 text-sm text-white/90 mb-2">Merhaba, {displayName}.</div>
                <button
                  className="w-full text-left px-3 py-2 rounded-md bg-white text-slate-900 font-semibold text-sm"
                  onClick={() => { onSignOut(); setMobileOpen(false); }}
                >
                  Çıkış
                </button>
              </div>
            ) : (
              <button
                className="mt-2 w-full text-left px-3 py-2 rounded-md bg-white text-slate-900 font-semibold text-sm"
                onClick={() => { onOpenAuth(); setMobileOpen(false); }}
              >
                Giriş
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}