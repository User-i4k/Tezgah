"use client";
import { useState, useEffect } from "react";
import { supabasePatron as supabase } from "../../supabasePatron";
import Link from "next/link";

export default function PatronGiris() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [sifre, setSifre] = useState("");
    const [ad, setAd] = useState("");
    const [isletme, setIsletme] = useState("");
    const [telefon, setTelefon] = useState("");
    const [ulkeKodu, setUlkeKodu] = useState("+90");
    const [ulkeMenuAcik, setUlkeMenuAcik] = useState(false);
    const [mesaj, setMesaj] = useState("");
    const [hata, setHata] = useState(false);
    const [yukleniyor, setYukleniyor] = useState(false);

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

    const telefonFormatla = (deger) => {
        const rakamlar = deger.replace(/\D/g, "");
        let formatli = rakamlar;
        if (rakamlar.length > 0) {
            if (rakamlar.startsWith("0")) {
                if (rakamlar.length > 1) formatli = rakamlar.slice(0, 1) + " (" + rakamlar.slice(1, 4);
                if (rakamlar.length > 4) formatli = formatli + ") " + rakamlar.slice(4, 7);
                if (rakamlar.length > 7) formatli = formatli + " " + rakamlar.slice(7, 9);
                if (rakamlar.length > 9) formatli = formatli + " " + rakamlar.slice(9, 11);
            } else {
                if (rakamlar.length > 3) formatli = "(" + rakamlar.slice(0, 3) + ") " + rakamlar.slice(3, 6);
                if (rakamlar.length > 6) formatli = formatli + " " + rakamlar.slice(6, 8);
                if (rakamlar.length > 8) formatli = formatli + " " + rakamlar.slice(8, 10);
                else if (rakamlar.length <= 3) formatli = rakamlar;
            }
        }
        return formatli.slice(0, 17);
    };

    useEffect(() => {
        const oturumKontrol = async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                window.location.href = "/patron";
            }
        };
        oturumKontrol();

        const disariTikla = (e) => {
            if (ulkeMenuAcik && !e.target.closest(".ulke-secer")) {
                setUlkeMenuAcik(false);
            }
        };
        document.addEventListener("mousedown", disariTikla);
        return () => document.removeEventListener("mousedown", disariTikla);
    }, [ulkeMenuAcik]);

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

        if (!kullanici || kullanici.rol !== "patron") {
            await supabase.auth.signOut();
            setHata(true);
            setMesaj("Bu hesap patron hesabı değil.");
            return;
        }

        window.location.href = "/patron";
    };

    const hesapOlustur = async () => {
        if (!ad || !isletme || !email || !sifre || !telefon) {
            setHata(true);
            setMesaj("Lütfen tüm alanları doldurun.");
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
            rol: "patron",
            ad_soyad: ad,
            telefon: ulkeKodu + " " + (telefon.startsWith("0") ? telefon.slice(1) : telefon),
            auth_id: authId,
        });

        await supabase.from("businesses").insert({
            isim: isletme,
            patron_id: authId,
        });

        setYukleniyor(false);
        setHata(false);
        setMesaj("Kayıt başarılı! Giriş yapabilirsiniz.");
        setTimeout(() => { setIsLogin(true); setMesaj(""); }, 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-inter p-4 sm:p-6 relative overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
            
            {/* Arka Plan Dekorasyon */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[120px] pointer-events-none hidden sm:block"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-100/30 rounded-full blur-[120px] pointer-events-none hidden sm:block"></div>

            {/* Geri Dön Butonu */}
            <Link href="/" className="absolute top-8 left-10 inline-flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-900 transition-all z-50">
                <span className="text-base leading-none">←</span> Geri Dön
            </Link>

            <div className="w-full max-w-5xl h-[100dvh] sm:h-auto min-h-[650px] bg-white rounded-3xl sm:rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.05)] border border-slate-100 flex relative overflow-hidden">
                
                {/* Sol Taraf - Giriş Formu */}
                <div className={`w-full lg:w-1/2 h-full flex flex-col justify-center p-6 sm:p-12 overflow-y-auto transition-all duration-700 absolute left-0 top-0 bg-white z-20 lg:z-0 ${!isLogin ? "opacity-0 pointer-events-none lg:-translate-x-[10%] scale-95 lg:scale-100" : "opacity-100 lg:translate-x-0 scale-100"}`}>
                    <div className="w-full max-w-sm">
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-sm">🏪</div>
                        <h2 className="text-4xl font-outfit font-black text-slate-900 mb-2 tracking-tight">Giriş Yapın</h2>
                        <p className="text-slate-400 text-sm mb-10 font-medium">İşletmenizin yönetimi paneline erişin.</p>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">E-Posta</label>
                                <input type="email" placeholder="ornek@email.com"
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 text-slate-800 transition-all placeholder:text-slate-300 font-medium" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Şifre</label>
                                <input type="password" placeholder="••••••••"
                                    value={sifre} onChange={(e) => setSifre(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 text-slate-800 transition-all placeholder:text-slate-300 font-medium" />
                            </div>
                        </div>

                        {mesaj && (
                            <div className={`text-xs font-bold mb-6 px-5 py-4 rounded-2xl border ${hata ? "bg-red-50 text-red-600 border-red-100" : "bg-indigo-50 text-indigo-700 border-indigo-100"}`}>
                                {mesaj}
                            </div>
                        )}

                        <button onClick={girisYap} disabled={yukleniyor}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-[1.5rem] font-outfit font-black uppercase tracking-widest transition-all mb-6 disabled:opacity-40 shadow-xl shadow-slate-900/10 active:scale-95">
                            {yukleniyor ? "Giriş Yapılıyor..." : "Giriş Yap"}
                        </button>

                        <p className="text-center text-sm font-medium text-slate-400">
                            Hesabınız yok mu? <span onClick={() => { setIsLogin(false); setMesaj(""); setHata(false); }}
                            className="text-slate-900 font-black cursor-pointer hover:underline underline-offset-4 decoration-2">Kayıt Olun</span>
                        </p>
                    </div>
                </div>

                {/* Sağ Taraf - Kayıt Formu */}
                <div className={`w-full lg:w-1/2 h-full flex flex-col justify-center p-6 sm:p-12 overflow-y-auto transition-all duration-700 absolute left-0 lg:left-auto lg:right-0 top-0 bg-white z-20 lg:z-0 ${isLogin ? "opacity-0 pointer-events-none lg:translate-x-[10%] scale-95 lg:scale-100" : "opacity-100 lg:translate-x-0 scale-100"}`}>
                    <div className="w-full max-w-sm">
                        <h2 className="text-4xl font-outfit font-black text-slate-900 mb-2 tracking-tight">Kayıt Olun</h2>
                        <p className="text-slate-400 text-sm mb-6 font-medium">İşletmenizi dijital dünyaya taşıyın.</p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Ad Soyad</label>
                                <input type="text" placeholder="Ad Soyad"
                                    value={ad} onChange={(e) => setAd(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 text-slate-800 transition-all placeholder:text-slate-300 font-medium" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">İşletme Adı</label>
                                <input type="text" placeholder="Örn: Tezgah Cafe"
                                    value={isletme} onChange={(e) => setIsletme(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 text-slate-800 transition-all placeholder:text-slate-300 font-medium" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Telefon Numarası</label>
                                <div className="flex gap-2 relative">
                                    <div className="ulke-secer relative">
                                        <div 
                                            onClick={() => setUlkeMenuAcik(!ulkeMenuAcik)}
                                            className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 text-slate-800 transition-all flex items-center gap-2 h-full cursor-pointer hover:bg-slate-100 shadow-sm"
                                        >
                                            <img 
                                                src={`https://flagcdn.com/w40/${ulkeler.find(u => u.kod === ulkeKodu)?.iso || "tr"}.png`} 
                                                alt="flag" 
                                                className="w-5 h-4 object-cover rounded shadow-sm flex-shrink-0"
                                            />
                                            <span className="text-xs font-black min-w-[2.5rem]">{ulkeKodu}</span>
                                            <span className={`text-[8px] transition-transform ${ulkeMenuAcik ? "rotate-180" : ""}`}>▼</span>
                                        </div>

                                        {ulkeMenuAcik && (
                                            <div className="absolute top-full left-0 mt-3 w-56 bg-white rounded-[1.5rem] shadow-2xl py-3 z-[100] max-h-48 overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 font-medium no-scrollbar">
                                                {ulkeler.map((u) => (
                                                    <div 
                                                        key={u.iso}
                                                        onClick={() => { setUlkeKodu(u.kod); setUlkeMenuAcik(false); }}
                                                        className={`flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${ulkeKodu === u.kod ? "bg-emerald-50 text-emerald-700" : "text-slate-600"}`}
                                                    >
                                                        <img 
                                                            src={`https://flagcdn.com/w40/${u.iso}.png`} 
                                                            alt={u.ad} 
                                                            className="w-5 h-4 object-cover rounded shadow-sm flex-shrink-0"
                                                        />
                                                        <span className="text-sm font-bold flex-1 truncate">{u.ad}</span>
                                                        <span className="text-[10px] font-black text-slate-400">{u.kod}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <input type="text" placeholder="5XX XXX XX XX"
                                        value={telefon} onChange={(e) => setTelefon(telefonFormatla(e.target.value))}
                                        className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 text-slate-800 transition-all font-black tracking-tight placeholder:font-medium placeholder:text-slate-300 w-full min-w-0" />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">E-Posta</label>
                                    <input type="email" placeholder="ornek@email.com"
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 text-slate-800 transition-all placeholder:text-slate-300 font-medium" />
                                </div>

                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Şifre</label>
                                    <input type="password" placeholder="••••••••"
                                        value={sifre} onChange={(e) => setSifre(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 text-slate-800 transition-all placeholder:text-slate-300 font-medium" />
                                </div>
                            </div>
                        </div>

                        {mesaj && (
                            <div className={`text-xs font-bold mb-4 px-5 py-3 rounded-2xl border ${hata ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                                {mesaj}
                            </div>
                        )}

                        <button onClick={hesapOlustur} disabled={yukleniyor}
                            className="w-full bg-slate-900 hover:bg-emerald-900 text-white py-4 rounded-[1.5rem] font-outfit font-black uppercase tracking-widest transition-all mb-4 disabled:opacity-40 shadow-xl shadow-slate-900/10 active:scale-95">
                            {yukleniyor ? "İşleniyor..." : "Hesap Oluştur"}
                        </button>

                        <p className="text-center text-sm font-medium text-slate-400">
                            Zaten hesabınız var mı? <span onClick={() => { setIsLogin(true); setMesaj(""); setHata(false); }}
                            className="text-slate-900 font-black cursor-pointer hover:underline underline-offset-4 decoration-2">Giriş Yapın</span>
                        </p>
                    </div>
                </div>

                {/* Dinamik Hareketli Kapak */}
                <div 
                    className={`absolute inset-y-8 w-[calc(50%-2rem)] bg-slate-900 rounded-[2.5rem] p-12 hidden lg:flex flex-col justify-between transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl z-30 overflow-hidden
                    ${isLogin ? "right-8" : "right-[calc(50%+1rem)]"}`}
                >
                    {/* Kapak İçi Dekorasyon */}
                    <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-emerald-500/20 rounded-full blur-[80px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[80px]"></div>

                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white text-xl mb-6">🏪</div>
                        <h3 className="text-3xl font-outfit font-black text-white mb-4 tracking-tight leading-tight">
                            {isLogin ? "İşinizi Büyütmeye Başlayın." : "Yeni Bir Döneme Adım Atın."}
                        </h3>
                        <p className="text-emerald-100/90 text-sm font-medium leading-relaxed">
                            {isLogin 
                                ? "Satışlarınızı takip edin, ekibinizi yönetin. Tezgah ile kontrol tamamen sizde." 
                                : "Hemen kayıt olarak işletmenizi dijital dünyaya taşıyın ve operasyonlarınızı kolaylaştırın."}
                        </p>
                    </div>

                    {/* Dinamik Gösterge Okları */}
                    <div className="relative z-10 flex gap-2">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${isLogin ? "w-8 bg-white" : "w-2 bg-white/30"}`}></div>
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${!isLogin ? "w-8 bg-white" : "w-2 bg-white/30"}`}></div>
                    </div>
                </div>

            </div>
        </div>
    );
}
