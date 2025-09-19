import React from "react";

export default function Footer({ onSelectTab }) {
  return (
    <footer className="w-full border-t border-white/15 bg-white/5 backdrop-blur mt-10">
      <div className="container py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-white/80">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">💳</div>
            <span className="font-semibold text-white">Hesabın Kralı</span>
          </div>
          <p className="text-sm leading-6 text-white/70">
            Kişisel bütçe ve gider planlamasını sade, modern ve hızlı bir deneyimle yap.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Ürün</h4>
          <ul className="space-y-2 text-sm">
            <li><button className="hover:text-white" onClick={() => onSelectTab("plan")}>Aylık Hesaplama</button></li>
            <li><button className="hover:text-white" onClick={() => onSelectTab("aylik")}>Yıllık Hesaplama</button></li>
            <li><button className="hover:text-white" onClick={() => onSelectTab("zam")}>Zam Hesaplama</button></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Kaynaklar</h4>
          <ul className="space-y-2 text-sm">
            <li><a className="hover:text-white" href="#" rel="noreferrer">Sık Sorulanlar</a></li>
            <li><a className="hover:text-white" href="#" rel="noreferrer">Gizlilik</a></li>
            <li><a className="hover:text-white" href="#" rel="noreferrer">Kullanım Şartları</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Bizi Takip Et</h4>
          <div className="flex items-center gap-3">
            <a href="#" className="p-2 rounded-lg hover:bg-white/10">𝕏</a>
            <a href="#" className="p-2 rounded-lg hover:bg-white/10">GH</a>
            <a href="#" className="p-2 rounded-lg hover:bg-white/10">in</a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container py-4 text-center text-xs text-white/60">
          © {new Date().getFullYear()} Hesabın Kralı. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}