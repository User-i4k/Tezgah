"use client";
import { useEffect, useState } from "react";
import { supabasePatron as supabase } from "../supabasePatron";

export default function PatronPanel() {
    const [yukleniyor, setYukleniyor] = useState(true);
    const [subeler, setSubeler] = useState([]);
    const [kullanici, setKullanici] = useState(null);
    const [isletme, setIsletme] = useState(null);
    const [basvurular, setBasvurular] = useState([]);
    const [aktifSekme, setAktifSekme] = useState("subeler");
    const [menuAcik, setMenuAcik] = useState(false);
    const [basvuruMenuAcik, setBasvuruMenuAcik] = useState(false);
    const [subeModalAcik, setSubeModalAcik] = useState(false);
    const [yeniSubeIsmi, setYeniSubeIsmi] = useState("");
    const [subeEkleniyor, setSubeEkleniyor] = useState(false);
    const [bugunKazancMap, setBugunKazancMap] = useState({});
    const [onlinePersoneller, setOnlinePersoneller] = useState({});

    const isletmeyiGetir = async (patronId) => {
        let { data } = await supabase.from("businesses").select("*").eq("patron_id", patronId).single();
        if (!data) {
            const { data: yeniData, error } = await supabase.from("businesses").insert({ patron_id: patronId, isim: "Benim İşletmem" }).select().single();
            if (!error) data = yeniData;
        }
        setIsletme(data);
        return data;
    };

    const subeleriGetir = async (patronId) => {
        const { data: isletmeData } = await supabase.from("businesses").select("id").eq("patron_id", patronId).single();
        if (!isletmeData) return;
        const { data } = await supabase.from("branches").select("*").eq("business_id", isletmeData.id);
        setSubeler(data || []);
        return { isletmeId: isletmeData.id, subeler: data || [] };
    };

    const bugunKazanclariniGetir = async (subeListesi) => {
        if (!subeListesi || subeListesi.length === 0) return;
        const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
        const kazancMap = {};
        await Promise.all(subeListesi.map(async (sube) => {
            const { data } = await supabase.from("sales").select("toplam_tutar").eq("branch_id", sube.id).gte("created_at", bugun.toISOString());
            kazancMap[sube.id] = (data || []).reduce((acc, s) => acc + parseFloat(s.toplam_tutar || 0), 0);
        }));
        setBugunKazancMap(kazancMap);
    };

    const basvurulariGetir = async (patronId) => {
        const { data: isletmeData } = await supabase.from("businesses").select("id").eq("patron_id", patronId).single();
        if (!isletmeData) return;
        const { data: subeListesi } = await supabase.from("branches").select("id").eq("business_id", isletmeData.id);
        if (!subeListesi || subeListesi.length === 0) return;
        const subeIdleri = subeListesi.map((s) => s.id);
        const { data, error } = await supabase.from("basvurular").select("*, branches(isim)").in("sube_id", subeIdleri).order("created_at", { ascending: false });
        if (error) console.error("BASVURU HATASI:", error);
        if (data && data.length > 0) {
            const { data: usersData } = await supabase.from("users").select("auth_id, ad_soyad, telefon").in("auth_id", data.map(b => b.personel_id));
            if (usersData) {
                setBasvurular(data.map(b => { const u = usersData.find(u => u.auth_id === b.personel_id); return { ...b, personel_adi: u?.ad_soyad || "Bilinmiyor", personel_telefon: u?.telefon || null }; }));
                return;
            }
        }
        setBasvurular(data || []);
    };

    useEffect(() => {
        const oturumKontrol = async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) { window.location.href = "/patron/giris"; return; }
            setKullanici(data.session.user);
            await isletmeyiGetir(data.session.user.id);
            const sonuc = await subeleriGetir(data.session.user.id);
            if (sonuc?.subeler) await bugunKazanclariniGetir(sonuc.subeler);
            await basvurulariGetir(data.session.user.id);
            setYukleniyor(false);
        };
        oturumKontrol();
    }, []);

    useEffect(() => {
        if (!kullanici) return;
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user && session.user.id !== kullanici.id) { alert("🚨 Güvenlik uyarısı: Farklı hesap tespit edildi."); window.location.reload(); }
        });
        const presenceChannel = supabase.channel("online-personeller");
        presenceChannel.on("presence", { event: "sync" }, () => {
            const state = presenceChannel.presenceState();
            const onlines = {};
            for (const id in state) onlines[id] = true;
            setOnlinePersoneller(onlines);
        }).subscribe();
        return () => { authListener?.subscription?.unsubscribe(); supabase.removeChannel(presenceChannel); };
    }, [kullanici]);

    useEffect(() => {
        if (!kullanici || subeler.length === 0) return;
        const basvuruKanal = supabase.channel("gercek-zamanli-basvurular").on("postgres_changes", { event: "*", schema: "public", table: "basvurular" }, () => basvurulariGetir(kullanici.id)).subscribe();
        const satisKanal = supabase.channel("gercek-zamanli-satislar").on("postgres_changes", { event: "INSERT", schema: "public", table: "sales" }, () => bugunKazanclariniGetir(subeler)).subscribe();
        return () => { supabase.removeChannel(basvuruKanal); supabase.removeChannel(satisKanal); };
    }, [kullanici, subeler]);

    const subeEkle = async () => {
        const temizIsim = yeniSubeIsmi.trim();
        if (!temizIsim) return;
        if (!/^[a-zA-Z0-9]+$/.test(temizIsim)) { alert("Şube adında sadece İngilizce harfler ve rakamlar kullanılabilir. (Örn: Kadikoy)"); return; }
        setSubeEkleniyor(true);
        await supabase.from("branches").insert({ isim: yeniSubeIsmi, business_id: isletme.id });
        setYeniSubeIsmi(""); setSubeModalAcik(false); setSubeEkleniyor(false);
        await subeleriGetir(kullanici.id);
    };

    const basvuruOnayla = async (id) => { await supabase.from("basvurular").update({ durum: "kabul" }).eq("id", id); await basvurulariGetir(kullanici.id); };
    const basvuruReddet = async (id) => { await supabase.from("basvurular").update({ durum: "red" }).eq("id", id); await basvurulariGetir(kullanici.id); };
    const basvuruKov = async (id) => { await supabase.from("basvurular").update({ durum: "kovuldu" }).eq("id", id); await basvurulariGetir(kullanici.id); };
    const cikisYap = async () => { if (window.confirm("Çıkış yapmak istediğinize emin misiniz?")) { await supabase.auth.signOut(); window.location.href = "/"; } };

    const para = (sayi) => sayi.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const bekleyenSayisi = basvurular.filter(b => b.durum === "bekliyor").length;

    const sekmeListesi = [
        { id: "subeler", label: "Şubeler", ikon: "🏪" },
        { id: "personeller", label: "Personeller", ikon: "🧑‍💼" },
        { id: "basvurular", label: "Başvurular", ikon: "👥" },
    ];

    // ── LOADING ──
    if (yukleniyor) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 text-[10px] font-outfit font-black uppercase tracking-[0.3em]">Yükleniyor</p>
            </div>
        </div>
    );

    // ── SIDEBAR İÇERİĞİ ──
    const SidebarIcerik = ({ mobile = false }) => (
        <div className="flex flex-col h-full">

            {/* Logo */}
            <div className="px-5 py-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-500/20 rounded-xl flex items-center justify-center text-lg border border-indigo-500/30 shrink-0">🏪</div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-white font-outfit font-black tracking-tighter leading-none text-lg">
                            Tezgah<span className="text-indigo-500">.</span>
                        </h1>
                        <p className="text-indigo-300/50 text-[9px] font-medium tracking-widest uppercase leading-none mt-1 truncate">{isletme?.isim}</p>
                    </div>
                    {mobile && (
                        <button onClick={() => setMenuAcik(false)} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center text-sm transition-all shrink-0">✕</button>
                    )}
                </div>
            </div>

            {/* Kullanıcı */}
            <div className="px-4 py-3 border-b border-white/5">
                <div className="bg-white/5 rounded-xl px-3 py-2.5">
                    <p className="text-[9px] font-outfit font-black text-white/25 uppercase tracking-[0.2em] mb-0.5">Oturum</p>
                    <p className="text-white/50 text-[11px] font-medium truncate">{kullanici?.email}</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                <p className="text-[9px] font-outfit font-black text-white/20 uppercase tracking-[0.2em] px-3 pt-1 pb-2">Menü</p>
                {sekmeListesi.map(s => (
                    <button
                        key={s.id}
                        onClick={() => { setAktifSekme(s.id); setMenuAcik(false); }}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all text-left group border ${aktifSekme === s.id
                                ? "bg-indigo-500/20 border-indigo-500/30"
                                : "border-transparent hover:bg-white/5 hover:border-white/5"
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${aktifSekme === s.id ? "bg-indigo-500/30" : "bg-white/5 group-hover:bg-white/10"
                                }`}>{s.ikon}</span>
                            <span className={`font-outfit font-black text-xs uppercase tracking-widest transition-colors ${aktifSekme === s.id ? "text-indigo-300" : "text-white/40 group-hover:text-white"
                                }`}>{s.label}</span>
                        </div>
                        {s.id === "basvurular" && bekleyenSayisi > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-outfit font-black px-2 py-0.5 rounded-lg min-w-[20px] text-center animate-pulse">
                                {bekleyenSayisi}
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            {/* Alt */}
            <div className="p-3 border-t border-white/5 space-y-2">

                {/* Bildirimler */}
                <div className="relative">
                    <button
                        onClick={() => setBasvuruMenuAcik(!basvuruMenuAcik)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left border ${bekleyenSayisi > 0
                                ? "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20"
                                : "bg-white/5 border-white/5 hover:bg-white/10"
                            }`}
                    >
                        <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-base shrink-0">🔔</span>
                        <span className={`font-outfit font-black text-xs uppercase tracking-widest flex-1 min-w-0 truncate ${bekleyenSayisi > 0 ? "text-amber-300" : "text-white/30"}`}>
                            {bekleyenSayisi > 0 ? `${bekleyenSayisi} Bekleyen` : "Bildirimler"}
                        </span>
                        {bekleyenSayisi > 0 && <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shrink-0"></span>}
                    </button>

                    {basvuruMenuAcik && (
                        <>
                            <div className="fixed inset-0 z-[60]" onClick={() => setBasvuruMenuAcik(false)} />
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden">
                                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                                    <p className="text-[9px] font-outfit font-black text-white/40 uppercase tracking-widest">Bekleyen Başvurular</p>
                                    <button onClick={() => setBasvuruMenuAcik(false)} className="text-white/30 hover:text-white text-xs transition-colors">✕</button>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {bekleyenSayisi === 0 ? (
                                        <div className="p-6 text-center">
                                            <p className="text-[10px] font-outfit font-black text-white/20 uppercase tracking-widest">Bekleyen yok</p>
                                        </div>
                                    ) : basvurular.filter(b => b.durum === "bekliyor").map((b) => (
                                        <div key={b.id} className="p-4 border-b border-white/5">
                                            <p className="text-xs text-white/50 mb-3 leading-relaxed">
                                                <span className="font-outfit font-black text-white">{b.personel_adi || b.personel_id.slice(0, 8)}</span>
                                                {" "}→{" "}
                                                <span className="font-outfit font-black text-indigo-400">{b.branches?.isim}</span>
                                            </p>
                                            <div className="flex gap-2">
                                                <button onClick={() => basvuruOnayla(b.id)} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-xl text-[9px] font-outfit font-black uppercase tracking-widest transition-colors">Kabul</button>
                                                <button onClick={() => basvuruReddet(b.id)} className="flex-1 bg-white/10 hover:bg-red-500/30 text-white/50 hover:text-red-300 py-2 rounded-xl text-[9px] font-outfit font-black uppercase tracking-widest transition-colors">Reddet</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Çıkış */}
                <button
                    onClick={cikisYap}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/5 hover:border-red-500/20 transition-all group"
                >
                    <span className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-red-500/20 flex items-center justify-center text-base transition-all">🚪</span>
                    <span className="font-outfit font-black text-xs uppercase tracking-widest text-white/30 group-hover:text-red-300 transition-colors">Çıkış Yap</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex font-inter selection:bg-indigo-100 selection:text-indigo-900">

            {/* ── DESKTOP SIDEBAR ── */}
            <aside className="hidden lg:flex flex-col w-60 xl:w-64 bg-slate-950 border-r border-white/5 sticky top-0 h-screen shrink-0 shadow-xl shadow-black/20">
                <SidebarIcerik />
            </aside>

            {/* ── MOBİLE DRAWER ── */}
            {menuAcik && (
                <div className="fixed inset-0 z-50 flex lg:hidden">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuAcik(false)} />
                    <div className="relative w-64 max-w-[80vw] bg-slate-950 h-full border-r border-white/5 shadow-2xl">
                        <SidebarIcerik mobile />
                    </div>
                </div>
            )}

            {/* ── SAĞ: HEADER + İÇERİK ── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Mobile Top Bar */}
                <header className="lg:hidden sticky top-0 z-40 bg-slate-950 border-b border-white/5 shadow-lg shadow-black/10">
                    <div className="flex items-center justify-between px-4 h-14">
                        <button
                            onClick={() => setMenuAcik(true)}
                            className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                        >
                            <span className="w-4 h-0.5 bg-white rounded-full"></span>
                            <span className="w-4 h-0.5 bg-white rounded-full"></span>
                            <span className="w-4 h-0.5 bg-white rounded-full"></span>
                        </button>

                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-indigo-500/20 rounded-lg flex items-center justify-center text-sm border border-indigo-500/30">🏪</div>
                            <h1 className="text-white font-outfit font-black tracking-tighter text-base leading-none">
                                Tezgah<span className="text-indigo-500">.</span>
                            </h1>
                        </div>

                        <div>
                            {bekleyenSayisi > 0 && (
                                <span className="bg-red-500 text-white text-[9px] font-outfit font-black px-2 py-1 rounded-lg animate-pulse">
                                    {bekleyenSayisi}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="border-t border-white/5 px-4 py-2">
                        <p className="text-white/30 text-[9px] font-outfit font-black uppercase tracking-[0.25em]">
                            {sekmeListesi.find(s => s.id === aktifSekme)?.ikon}{" "}
                            {sekmeListesi.find(s => s.id === aktifSekme)?.label}
                        </p>
                    </div>
                </header>

                {/* Desktop Sayfa Başlığı */}
                <div className="hidden lg:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100">
                    <div>
                        <h2 className="font-outfit font-black text-slate-900 tracking-tight text-xl leading-none">
                            {aktifSekme === "subeler" && "Şubelerim"}
                            {aktifSekme === "personeller" && "Personel Listesi"}
                            {aktifSekme === "basvurular" && "Başvurular"}
                        </h2>
                        <p className="text-slate-400 text-[10px] font-outfit font-black uppercase tracking-widest mt-1.5">
                            {aktifSekme === "subeler" && "İşletmenize ait tüm şubeler"}
                            {aktifSekme === "personeller" && "Aktif ve geçmiş çalışanlar"}
                            {aktifSekme === "basvurular" && "Bekleyen ve reddedilen kayıtlar"}
                        </p>
                    </div>
                    {aktifSekme === "subeler" && (
                        <button
                            onClick={() => setSubeModalAcik(true)}
                            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-950 text-white px-5 py-3 rounded-xl text-[10px] font-outfit font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-900/20 border-b-2 border-black active:border-b-0 active:translate-y-px"
                        >
                            <span>+</span> Şube Ekle
                        </button>
                    )}
                </div>

                {/* ── ANA İÇERİK ── */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">

                    {/* ══ ŞUBELER ══ */}
                    {aktifSekme === "subeler" && (
                        <div>
                            <div className="lg:hidden flex justify-end mb-4">
                                <button onClick={() => setSubeModalAcik(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[10px] font-outfit font-black uppercase tracking-widest shadow-lg">
                                    <span>+</span> Şube Ekle
                                </button>
                            </div>

                            {subeler.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
                                    <p className="text-5xl mb-4 opacity-20">🏪</p>
                                    <p className="font-outfit font-black text-slate-400 uppercase tracking-[0.2em] text-sm">Henüz Şube Eklenmedi</p>
                                    <p className="text-slate-400 text-xs mt-2 font-medium">Yukarıdaki butona tıklayarak başlayın</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                                    {subeler.map((sube) => {
                                        const bugunKazanc = bugunKazancMap[sube.id] || 0;
                                        return (
                                            <div key={sube.id} className="bg-white rounded-2xl border border-slate-100 p-6 group hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-50/60 rounded-bl-full -mr-14 -mt-14 group-hover:bg-indigo-100/60 transition-colors pointer-events-none"></div>

                                                <div className="flex items-start justify-between mb-5 relative z-10">
                                                    <h3 className="font-outfit font-black text-slate-900 text-xl tracking-tight leading-none">{sube.isim}</h3>
                                                    <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1.5 rounded-full border border-indigo-100 shrink-0 ml-2">
                                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                                                        <span className="text-[9px] font-outfit font-black text-indigo-600 uppercase tracking-widest">Açık</span>
                                                    </div>
                                                </div>

                                                <div className="mb-6 relative z-10">
                                                    <p className="text-[9px] font-outfit font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Bugünkü Kazanç</p>
                                                    <div className="flex items-end gap-1">
                                                        <p className="text-3xl sm:text-4xl font-outfit font-black text-slate-900 tracking-tighter leading-none">{para(bugunKazanc)}</p>
                                                        <span className="text-slate-400 font-outfit font-black text-lg mb-0.5 ml-1">₺</span>
                                                    </div>
                                                </div>

                                                <div className="pt-5 border-t border-slate-100 relative z-10">
                                                    <button
                                                        onClick={() => window.location.href = `/patron/dashboard/${sube.isim}`}
                                                        className="w-full bg-slate-900 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-outfit font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] border-b-2 border-black hover:border-indigo-900 active:border-b-0"
                                                    >
                                                        Şube Paneline Git →
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══ PERSONELLER ══ */}
                    {aktifSekme === "personeller" && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="font-outfit font-black text-slate-900 tracking-tight text-sm sm:text-base">Personel Listesi</h3>
                                    <p className="text-[10px] font-outfit font-black text-slate-400 uppercase tracking-widest mt-1">Aktif Çalışanlar</p>
                                </div>
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-outfit font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                    {basvurular.filter(b => b.durum === "kabul").length} Kişi
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[680px] text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            {["Durum", "Tarih", "Personel", "İletişim", "Şube", "İşlem"].map(h => (
                                                <th key={h} className="px-5 py-3.5 text-[9px] font-outfit font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {basvurular.filter(b => ["kabul", "kovuldu", "ayrildi"].includes(b.durum)).length === 0 ? (
                                            <tr><td colSpan="6" className="px-5 py-16 text-center">
                                                <p className="text-[10px] font-outfit font-black text-slate-400 uppercase tracking-[0.2em]">Aktif veya geçmiş personel bulunamadı</p>
                                            </td></tr>
                                        ) : basvurular.filter(b => ["kabul", "kovuldu", "ayrildi"].includes(b.durum)).map(b => (
                                            <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-4">
                                                    {b.durum === "kabul" ? (
                                                        onlinePersoneller[b.personel_id] ? (
                                                            <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-[10px] font-outfit font-black w-max border border-green-100">
                                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Kasada Aktif
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full text-[10px] font-outfit font-black w-max">
                                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> Çevrimdışı
                                                            </span>
                                                        )
                                                    ) : b.durum === "kovuldu" ? (
                                                        <span className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-[10px] font-outfit font-black w-max border border-red-100">
                                                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span> Kovuldu
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-[10px] font-outfit font-black w-max border border-amber-100">
                                                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span> Ayrıldı
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4"><p className="text-xs font-outfit font-black text-slate-500">{new Date(b.created_at).toLocaleDateString("tr-TR")}</p></td>
                                                <td className="px-5 py-4"><p className="font-outfit font-black text-slate-900 text-sm">{b.personel_adi || "İsimsiz"}</p></td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {b.personel_telefon ? (
                                                            <>
                                                                <a href={`tel:${b.personel_telefon}`} className="w-8 h-8 bg-slate-100 hover:bg-indigo-50 rounded-lg flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors border border-slate-200">📞</a>
                                                                <a href={`https://wa.me/${b.personel_telefon.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-[#25D366]/10 hover:bg-[#25D366]/20 rounded-lg flex items-center justify-center text-[#25D366] transition-colors border border-[#25D366]/20">💬</a>
                                                                <span className="text-xs font-medium text-slate-400 hidden xl:inline">{b.personel_telefon}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] font-outfit font-black text-slate-300 uppercase tracking-widest">Yok</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4"><span className="text-xs font-outfit font-black text-indigo-600">{b.branches?.isim}</span></td>
                                                <td className="px-5 py-4">
                                                    {b.durum === "kabul" ? (
                                                        <button onClick={() => { if (window.confirm("Bu personeli işten çıkarmak istediğinize emin misiniz?")) basvuruKov(b.id); }}
                                                            className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-100 hover:border-red-500 px-4 py-2 rounded-xl text-[10px] font-outfit font-black uppercase tracking-widest transition-all">
                                                            İşten Çıkar
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] font-outfit font-black text-slate-300 uppercase tracking-widest">Geçmiş</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ══ BAŞVURULAR ══ */}
                    {aktifSekme === "basvurular" && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                                    <p className="text-[9px] font-outfit font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Bekleyen Başvuru</p>
                                    <p className="text-3xl sm:text-4xl font-outfit font-black text-amber-500 tracking-tight">{bekleyenSayisi}</p>
                                </div>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                                    <p className="text-[9px] font-outfit font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Reddedilen Kayıt</p>
                                    <p className="text-3xl sm:text-4xl font-outfit font-black text-slate-400 tracking-tight">{basvurular.filter(b => b.durum === "red").length}</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
                                    <h3 className="font-outfit font-black text-slate-900 tracking-tight text-sm sm:text-base">Başvuru Kayıtları</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[540px] text-left">
                                        <thead>
                                            <tr className="border-b border-gray-100">
                                                {["Durum", "Tarih", "Personel", "Şube", "İşlem"].map(h => (
                                                    <th key={h} className="px-5 py-3.5 text-[9px] font-outfit font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {basvurular.filter(b => ["bekliyor", "red"].includes(b.durum)).length === 0 ? (
                                                <tr><td colSpan="5" className="px-5 py-16 text-center">
                                                    <p className="text-[10px] font-outfit font-black text-slate-400 uppercase tracking-[0.2em]">Bekleyen veya reddedilen başvuru yok</p>
                                                </td></tr>
                                            ) : basvurular.filter(b => ["bekliyor", "red"].includes(b.durum)).map(b => (
                                                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-5 py-4">
                                                        {b.durum === "bekliyor" ? (
                                                            <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-[10px] font-outfit font-black w-max border border-amber-100">
                                                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span> Bekliyor
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full text-[10px] font-outfit font-black w-max">
                                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> Reddedildi
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4"><p className="text-xs font-outfit font-black text-slate-500">{new Date(b.created_at).toLocaleDateString("tr-TR")}</p></td>
                                                    <td className="px-5 py-4"><p className="font-outfit font-black text-slate-900 text-sm">{b.personel_adi || "İsimsiz"}</p></td>
                                                    <td className="px-5 py-4"><span className="text-xs font-outfit font-black text-indigo-600">{b.branches?.isim}</span></td>
                                                    <td className="px-5 py-4">
                                                        {b.durum === "bekliyor" ? (
                                                            <div className="flex gap-2">
                                                                <button onClick={() => basvuruOnayla(b.id)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-outfit font-black uppercase tracking-widest transition-colors shadow-sm shadow-indigo-500/20">Onayla</button>
                                                                <button onClick={() => { if (window.confirm("Reddetmek istediğinize emin misiniz?")) basvuruReddet(b.id); }}
                                                                    className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-100 hover:border-red-500 px-4 py-2 rounded-xl text-[10px] font-outfit font-black uppercase tracking-widest transition-all">Reddet</button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-outfit font-black text-slate-300 uppercase tracking-widest">Kapalı</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* ── ŞUBE EKLEME MODALİ ── */}
            {subeModalAcik && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-outfit font-black text-slate-900 tracking-tight text-base">Yeni Şube Ekle</h3>
                                <p className="text-[10px] font-outfit font-black text-slate-400 uppercase tracking-widest mt-1">Şube adını girin</p>
                            </div>
                            <button onClick={() => { setSubeModalAcik(false); setYeniSubeIsmi(""); }} className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 transition-colors text-sm">✕</button>
                        </div>
                        <div className="p-6">
                            <label className="text-[9px] font-outfit font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">Şube Adı</label>
                            <input
                                type="text"
                                placeholder="Örn: Kadikoy"
                                value={yeniSubeIsmi}
                                onChange={(e) => setYeniSubeIsmi(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && subeEkle()}
                                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-sm font-outfit font-black text-slate-900 outline-none transition-all placeholder:text-slate-300 mb-2"
                                autoFocus
                            />
                            <p className="text-[9px] font-outfit font-black text-slate-400 uppercase tracking-widest">Sadece İngilizce harf ve rakam</p>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button onClick={() => { setSubeModalAcik(false); setYeniSubeIsmi(""); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-outfit font-black py-3.5 rounded-xl text-[10px] uppercase tracking-widest transition-all">İptal</button>
                            <button onClick={subeEkle} disabled={subeEkleniyor} className="flex-[2] bg-slate-900 hover:bg-slate-950 text-white font-outfit font-black py-3.5 rounded-xl text-[10px] uppercase tracking-widest shadow-xl transition-all border-b-2 border-black active:border-b-0 active:translate-y-px disabled:opacity-50">
                                {subeEkleniyor ? "Ekleniyor..." : "Şube Ekle"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}