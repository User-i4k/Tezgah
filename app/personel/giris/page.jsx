"use client";
import { useState, useEffect } from "react";
import { supabasePersonel as supabase } from "../../supabasePersonel";
import Link from "next/link";

export default function PersonelGiris() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [sifre, setSifre] = useState("");
    const [ad, setAd] = useState("");
    const [telefon, setTelefon] = useState("");
    const [ulkeKodu, setUlkeKodu] = useState("+90");
    const [ulkeMenuAcik, setUlkeMenuAcik] = useState(false);
    const [mesaj, setMesaj] = useState("");

    const ulkeler = [
        { iso: "tr", kod: "+90", ad: "Türkiye" },
        { iso: "az", kod: "+994", ad: "Azerbaycan" },
        { iso: "us", kod: "+1", ad: "ABD" },
        { iso: "gb", kod: "+44", ad: "İngiltere" },
        { iso: "de", kod: "+49", ad: "Almanya" },
        { iso: "nl", kod: "+31", ad: "Hollanda" },
        { iso: "be", kod: "+32", ad: "Belçika" },
        { iso: "fr", kod: "+33", ad: "Fransa" },
        { iso: "ru", kod: "+7", ad: "Rusya" },
        { iso: "uz", kod: "+998", ad: "Özbekistan" },
        { iso: "ae", kod: "+971", ad: "BAE" },
        { iso: "sa", kod: "+966", ad: "S. Arabistan" },
    ];
    const [hata, setHata] = useState(false);
    const [yukleniyor, setYukleniyor] = useState(false);

    useEffect(() => {
        const oturumKontrol = async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                window.location.href = "/personel";
            }
        };
        oturumKontrol();

        // Menü dışına tıklandığında kapat
        const disariTikla = (e) => {
            if (ulkeMenuAcik && !e.target.closest(".ulke-secer")) {
                setUlkeMenuAcik(false);
            }
        };
        document.addEventListener("mousedown", disariTikla);
        return () => document.removeEventListener("mousedown", disariTikla);
    }, [ulkeMenuAcik]);

    const telefonFormatla = (deger) => {
        // Sadece rakamları al
        const rakamlar = deger.replace(/\D/g, "");
        
        // Maksimum 11 rakam (0 ile başlıyorsa)
        let formatli = rakamlar;
        if (rakamlar.length > 0) {
            if (rakamlar.startsWith("0")) {
                if (rakamlar.length > 1) formatli = rakamlar.slice(0, 1) + " (" + rakamlar.slice(1, 4);
                if (rakamlar.length > 4) formatli = formatli + ") " + rakamlar.slice(4, 7);
                if (rakamlar.length > 7) formatli = formatli + " " + rakamlar.slice(7, 9);
                if (rakamlar.length > 9) formatli = formatli + " " + rakamlar.slice(9, 11);
            } else {
                // 0 yoksa otomatik ekleme veya direkt formatlama (TR için 0 kullanımı yaygın)
                if (rakamlar.length > 3) formatli = "(" + rakamlar.slice(0, 3) + ") " + rakamlar.slice(3, 6);
                if (rakamlar.length > 6) formatli = formatli + " " + rakamlar.slice(6, 8);
                if (rakamlar.length > 8) formatli = formatli + " " + rakamlar.slice(8, 10);
                else if (rakamlar.length <= 3) formatli = rakamlar;
            }
        }
        return formatli.slice(0, 17); // Maksimum uzunluk
    };

    const girisYap = async () => {
        setYukleniyor(true);
        setMesaj("");
        const { error } = await supabase.auth.signInWithPassword({ email, password: sifre });
        if (error) {
            setHata(true);
            setMesaj("Email veya şifre hatalı.");
            setYukleniyor(false);
            return;
        }

        const { data: kullanici } = await supabase
            .from("users")
            .select("rol")
            .eq("email", email)
            .single();

        setYukleniyor(false);

        if (!kullanici || kullanici.rol !== "personel") {
            await supabase.auth.signOut();
            setHata(true);
            setMesaj("Bu hesap personel hesabı değil. İşletme sahibi girişini kullanın.");
            return;
        }

        window.location.href = "/personel";
    };

    const hesapOlustur = async () => {
        if (!ad || !email || !sifre || !telefon) {
            setHata(true);
            setMesaj("Lütfen tüm alanları (isim, e-posta, şifre ve telefon) doldurun.");
            return;
        }
        setYukleniyor(true);
        setMesaj("");
        const { data, error } = await supabase.auth.signUp({ email, password: sifre });
        if (error) {
            setHata(true);
            setMesaj("Hata: " + error.message);
            setYukleniyor(false);
            return;
        }

        const authId = data.user.id;

        await supabase.from("users").insert({
            email: email,
            rol: "personel",
            ad_soyad: ad,
            telefon: ulkeKodu + " " + (telefon.startsWith("0") ? telefon.slice(1) : telefon),
            auth_id: authId,
        });

        setYukleniyor(false);
        setHata(false);
        setMesaj("Kayıt başarılı! Giriş yapabilirsiniz.");
        setTimeout(() => { setIsLogin(true); setMesaj(""); }, 2000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 font-inter selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden relative">
            
            {/* Arka plan dekoratif elementler */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none hidden sm:block">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/20 rounded-full blur-[120px]"></div>
            </div>

            {/* Geri Dön Butonu */}
            <Link href="/" className="absolute top-8 left-10 inline-flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-900 transition-all z-50">
                <span className="text-base leading-none">←</span> Geri Dön
            </Link>

            <div className="w-full max-w-5xl h-[100dvh] sm:h-auto min-h-[650px] bg-white rounded-3xl sm:rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.08)] flex overflow-hidden relative z-10 border border-white/50">
                
                {/* Sol Taraf - Giriş Formu (Aktifken) */}
                <div className={`w-full lg:w-1/2 h-full flex flex-col justify-center p-6 sm:p-12 overflow-y-auto transition-all duration-700 absolute left-0 top-0 bg-white z-20 lg:z-0 ${!isLogin ? "opacity-0 pointer-events-none lg:-translate-x-12 scale-95 lg:scale-100" : "opacity-100 lg:translate-x-0 scale-100"}`}>
                    <div className="w-full max-w-sm">
                        <h2 className="text-4xl font-outfit font-black text-slate-900 mb-2 tracking-tight">Hoş Geldiniz</h2>
                        <p className="text-slate-400 text-sm mb-8 font-medium">Personel paneline girmek için giriş yapın.</p>

                        <div className="space-y-5 mb-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1">E-Posta Adresi</label>
                                <input type="email" placeholder="ornek@email.com"
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 text-slate-800 transition-all placeholder:text-slate-300 font-medium" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Şifre</label>
                                <input type="password" placeholder="••••••••"
                                    value={sifre} onChange={(e) => setSifre(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && girisYap()}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 text-slate-800 transition-all placeholder:text-slate-300 font-medium" />
                            </div>
                        </div>

                        {mesaj && (
                            <div className={`text-xs font-bold mb-6 px-5 py-4 rounded-2xl animate-in fade-in slide-in-from-top-2 border ${hata ? "bg-red-50 text-red-600 border-red-100" : "bg-indigo-50 text-indigo-700 border-indigo-100"}`}>
                                {hata ? "⚠️" : "✓"} {mesaj}
                            </div>
                        )}

                        <button onClick={girisYap} disabled={yukleniyor}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-[1.5rem] font-outfit font-black uppercase tracking-widest transition-all mb-6 disabled:opacity-40 shadow-xl shadow-indigo-500/10 active:scale-95">
                            {yukleniyor ? "Bekleyin..." : "Giriş Yap"}
                        </button>

                        <p className="text-center text-sm font-medium text-slate-400">
                            Hesabınız yok mu? <span onClick={() => { setIsLogin(false); setMesaj(""); setHata(false); }}
                            className="text-slate-900 font-black cursor-pointer hover:underline underline-offset-4 decoration-2">Kayıt Olun</span>
                        </p>
                    </div>
                </div>

                {/* Sağ Taraf - Kayıt Formu (Aktifken) */}
                <div className={`w-full lg:w-1/2 h-full flex flex-col justify-center p-6 sm:p-12 overflow-y-auto transition-all duration-700 absolute left-0 lg:left-auto lg:right-0 top-0 bg-white z-20 lg:z-0 ${isLogin ? "opacity-0 pointer-events-none lg:translate-x-12 scale-95 lg:scale-100" : "opacity-100 lg:translate-x-0 scale-100"}`}>
                    <div className="w-full max-w-sm">
                        <h2 className="text-4xl font-outfit font-black text-slate-900 mb-2 tracking-tight">Kayıt Olun</h2>
                        <p className="text-slate-400 text-sm mb-8 font-medium">Şubenizdeki tüm operasyonu yönetin.</p>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Ad Soyad</label>
                                <input type="text" placeholder="Ad Soyad"
                                    value={ad} onChange={(e) => setAd(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 text-slate-800 transition-all placeholder:text-slate-300 font-medium" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Telefon Numarası</label>
                                <div className="flex gap-2 relative">
                                    <div className="ulke-secer relative">
                                        <div 
                                            onClick={() => setUlkeMenuAcik(!ulkeMenuAcik)}
                                            className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 text-slate-800 transition-all flex items-center gap-2 h-full cursor-pointer hover:bg-slate-100"
                                        >
                                            <img 
                                                src={`https://flagcdn.com/w40/${ulkeler.find(u => u.kod === ulkeKodu)?.iso || "tr"}.png`} 
                                                alt="flag" 
                                                className="w-5 h-4 object-cover rounded shadow-sm"
                                            />
                                            <span className="text-xs font-black">{ulkeKodu}</span>
                                            <span className={`text-[8px] transition-transform ${ulkeMenuAcik ? "rotate-180" : ""}`}>▼</span>
                                        </div>

                                        {ulkeMenuAcik && (
                                            <div className="absolute top-full left-0 mt-3 w-56 bg-white rounded-[1.5rem] shadow-2xl py-3 z-[100] max-h-60 overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 font-medium">
                                                {ulkeler.map((u) => (
                                                    <div 
                                                        key={u.iso}
                                                        onClick={() => { setUlkeKodu(u.kod); setUlkeMenuAcik(false); }}
                                                        className={`flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${ulkeKodu === u.kod ? "bg-indigo-50 text-indigo-700" : "text-slate-600"}`}
                                                    >
                                                        <img 
                                                            src={`https://flagcdn.com/w40/${u.iso}.png`} 
                                                            alt={u.ad} 
                                                            className="w-5 h-4 object-cover rounded shadow-sm"
                                                        />
                                                        <span className="text-sm font-bold flex-1">{u.ad}</span>
                                                        <span className="text-[10px] font-black text-slate-400">{u.kod}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <input type="text" placeholder="5XX XXX XX XX"
                                        value={telefon} onChange={(e) => setTelefon(telefonFormatla(e.target.value))}
                                        className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 text-slate-800 transition-all font-black tracking-tight placeholder:font-medium placeholder:text-slate-300" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">E-Posta</label>
                                <input type="email" placeholder="ornek@email.com"
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 text-slate-800 transition-all placeholder:text-slate-300 font-medium" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Şifre</label>
                                <input type="password" placeholder="••••••••"
                                    value={sifre} onChange={(e) => setSifre(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 text-slate-800 transition-all placeholder:text-slate-300 font-medium" />
                            </div>
                        </div>

                        {mesaj && (
                            <div className={`text-xs font-bold mb-6 px-5 py-4 rounded-2xl border ${hata ? "bg-red-50 text-red-600 border-red-100" : "bg-indigo-50 text-indigo-700 border-indigo-100"}`}>
                                {mesaj}
                            </div>
                        )}

                        <button onClick={hesapOlustur} disabled={yukleniyor}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-[1.5rem] font-outfit font-black uppercase tracking-widest transition-all mb-6 disabled:opacity-40 shadow-xl shadow-indigo-500/10 active:scale-95">
                            {yukleniyor ? "İşleniyor..." : "Hesap Oluştur"}
                        </button>

                        <p className="text-center text-sm font-medium text-slate-400">
                            Zaten hesabınız var mı? <span onClick={() => { setIsLogin(true); setMesaj(""); setHata(false); }}
                            className="text-slate-900 font-black cursor-pointer hover:underline underline-offset-4 decoration-2">Giriş Yapın</span>
                        </p>
                    </div>
                </div>

                {/* Kayar Panel */}
                <div
                    className="absolute top-0 h-full w-1/2 bg-slate-900 hidden lg:flex flex-col items-center justify-center p-16 overflow-hidden z-30 shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.77,0,0.175,1)]"
                    style={{
                        left: isLogin ? "50%" : "0%",
                    }}
                >
                    {/* Panel içi süslemeler */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-30">
                        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-500 rounded-full blur-[100px] opacity-20"></div>
                        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-600 rounded-full blur-[100px] opacity-20"></div>
                    </div>

                    <div className="relative z-10 text-center flex flex-col items-center">
                        <div className="w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] flex items-center justify-center text-5xl mb-8 shadow-2xl">👤</div>
                        <h2 className="text-4xl font-outfit font-black text-white mb-6 tracking-tight leading-tight">
                            {isLogin ? "Ekibe Tekrar\nHoş Geldiniz" : "Bize Katılın\nFark Yaratın"}
                        </h2>
                        <div className="w-12 h-1 bg-indigo-500 rounded-full mb-8"></div>
                        <p className="text-slate-400 text-base leading-relaxed max-w-[280px]">
                            {isLogin ? "İşlerinizi kolaylaştırın, siparişleri hızlandırın ve şubeyi neşelendirin." : "Dakikalar içinde kaydolun, modern restoran ekibinin bir parçası olun."}
                        </p>
                        
                        <div className="mt-16 flex items-center gap-3">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${isLogin ? "w-10 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]" : "w-1.5 bg-white/10"}`}></div>
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${!isLogin ? "w-10 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]" : "w-1.5 bg-white/10"}`}></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}