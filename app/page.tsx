import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-inter selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden relative">
      
      {/* Sol Panel - Vizyon ve Güç */}
      <div className="w-full lg:w-1/2 min-h-[50vh] lg:min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex flex-col items-center justify-center px-6 py-16 lg:p-20 relative overflow-hidden">
        {/* Dekoratif Işıklar */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[100px]"></div>

        <div className="relative z-10 text-center sm:text-left w-full max-w-md">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center text-3xl mb-10 shadow-2xl border border-white/10 ring-8 ring-white/5">🏪</div>
          <h1 className="text-6xl lg:text-7xl font-outfit font-black text-white mb-6 tracking-tighter leading-none">
            Tezgah<span className="text-indigo-500">.</span>
          </h1>
          <p className="text-slate-300 text-xl mb-12 font-medium leading-relaxed max-w-sm">
            İşletmenizi dijital dünyaya taşıyın. Satış, stok ve ekip yönetimini tek bir modern panelden kontrol edin.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">✓</div>
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Anlık Satış Analizi</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">✓</div>
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Çoklu Şube Entegrasyonu</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">✓</div>
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Modern Personel POS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sağ Panel - Seçim */}
      <div className="w-full lg:w-1/2 min-h-[50vh] lg:min-h-screen bg-slate-50 flex items-center justify-center px-6 py-16 lg:p-20 relative">
        <div className="w-full max-w-sm relative z-10">
          
          <div className="mb-12">
            <h2 className="text-4xl font-outfit font-black text-slate-900 mb-3 tracking-tight leading-tight mt-6 lg:mt-0">Hoş Geldiniz</h2>
            <p className="text-slate-400 text-sm font-medium">Hesap türünüzü seçerek buluta bağlanın.</p>
          </div>

          <div className="space-y-5">
            <Link href="/patron/giris">
              <div className="soft-card bg-white p-6 cursor-pointer hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-indigo-50 group-hover:scale-110 transition-all shadow-sm">🏪</div>
                <div className="flex-1">
                  <h3 className="font-outfit font-black text-slate-800 text-lg group-hover:text-indigo-700 transition-colors uppercase tracking-tight">İşletme Sahibi</h3>
                  <p className="text-slate-400 text-[11px] font-bold mt-1 uppercase tracking-widest leading-none">Şubelerinizi Yönetin</p>
                </div>
                <span className="text-2xl text-slate-200 group-hover:text-indigo-500 transition-all font-outfit font-black">→</span>
              </div>
            </Link>

            <Link href="/personel/giris">
              <div className="soft-card bg-white p-6 cursor-pointer hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-indigo-50 group-hover:scale-110 transition-all shadow-sm">👤</div>
                <div className="flex-1">
                  <h3 className="font-outfit font-black text-slate-800 text-lg group-hover:text-indigo-700 transition-colors uppercase tracking-tight">Personel</h3>
                  <p className="text-slate-400 text-[11px] font-bold mt-1 uppercase tracking-widest leading-none">Satışlara Başlayın</p>
                </div>
                <span className="text-2xl text-slate-200 group-hover:text-indigo-500 transition-all font-outfit font-black">→</span>
              </div>
            </Link>
          </div>

        </div>

        {/* Arka Plan Dekoratif Blurlar */}
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-[120px] pointer-events-none"></div>
      </div>

    </div>
  );
}