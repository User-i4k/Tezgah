"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabasePatron as supabase } from "../../../supabasePatron";

export default function PatronSubeDashboard() {
    const params = useParams();
    const subeAd = params.subeAd;

    const [yukleniyor, setYukleniyor] = useState(true);
    const [isletme, setIsletme] = useState(null);
    const [sube, setSube] = useState(null);
    const [aktifSekme, setAktifSekme] = useState("ozet");
    const [menuAcik, setMenuAcik] = useState(false);
    const [kullanici, setKullanici] = useState(null);
    const [gecmisSiparisler, setGecmisSiparisler] = useState([]);
    const [seciliSiparis, setSeciliSiparis] = useState(null);
    const [siparisDetaylari, setSiparisDetaylari] = useState([]);
    const [subePersonelleri, setSubePersonelleri] = useState([]);
    const [detayYukleniyor, setDetayYukleniyor] = useState(false);

    const [istatistikler, setIstatistikler] = useState({
        bugun: 0, bugunSiparis: 0,
        hafta: 0, haftaSiparis: 0,
        ay: 0, aySiparis: 0,
    });
    const [enCokSatanlar, setEnCokSatanlar] = useState([]);
    const [sonSatislar, setSonSatislar] = useState([]);
    const [personelSayisi, setPersonelSayisi] = useState(0);
    const [enCokSatanlarAralik, setEnCokSatanlarAralik] = useState("ay");

    const [urunler, setUrunler] = useState([]);
    const [yeniUrun, setYeniUrun] = useState({ isim: "", fiyat: "", kategori: "Genel" });
    const [urunEkleniyor, setUrunEkleniyor] = useState(false);
    const [duzenlenenUrunId, setDuzenlenenUrunId] = useState(null);
    const [katMenuAcik, setKatMenuAcik] = useState(false);

    const [kategorilerListesi, setKategorilerListesi] = useState(["Genel"]);
    const [kategoriModalAcik, setKategoriModalAcik] = useState(false);
    const [yeniKatGirdisi, setYeniKatGirdisi] = useState("");
    const [duzenlenenKatAd, setDuzenlenenKatAd] = useState(null);
    const [duzenlenenKatGirdisi, setDuzenlenenKatGirdisi] = useState("");
    const [katIslemBekliyor, setKatIslemBekliyor] = useState(false);

    const analizleriYukle = async (subeId, isletmeId) => {
        const simdi = new Date();
        const bugunBaslangic = new Date(simdi); bugunBaslangic.setHours(0, 0, 0, 0);
        const haftaBaslangic = new Date(simdi); haftaBaslangic.setDate(simdi.getDate() - 7);
        const ayBaslangic = new Date(simdi); ayBaslangic.setDate(1); ayBaslangic.setHours(0, 0, 0, 0);

        const { data: satislar } = await supabase
            .from("sales")
            .select("toplam_tutar, created_at")
            .eq("branch_id", subeId)
            .gte("created_at", ayBaslangic.toISOString());

        let bugun = 0, bugunSiparis = 0, hafta = 0, haftaSiparis = 0, ay = 0, aySiparis = 0;
        (satislar || []).forEach(s => {
            const t = parseFloat(s.toplam_tutar || 0);
            const tarih = new Date(s.created_at);
            ay += t; aySiparis++;
            if (tarih >= haftaBaslangic) { hafta += t; haftaSiparis++; }
            if (tarih >= bugunBaslangic) { bugun += t; bugunSiparis++; }
        });
        setIstatistikler({ bugun, bugunSiparis, hafta, haftaSiparis, ay, aySiparis });

        let baslangicTarihi = ayBaslangic;
        if (enCokSatanlarAralik === "bugun") baslangicTarihi = bugunBaslangic;
        if (enCokSatanlarAralik === "hafta") baslangicTarihi = haftaBaslangic;

        const { data: kalemler } = await supabase
            .from("sale_items")
            .select("urun_isim, miktar, ara_toplam, sales!inner(branch_id, created_at)")
            .eq("sales.branch_id", subeId)
            .gte("sales.created_at", baslangicTarihi.toISOString());

        const urunMap = {};
        (kalemler || []).forEach(k => {
            if (!urunMap[k.urun_isim]) urunMap[k.urun_isim] = { isim: k.urun_isim, adet: 0, ciro: 0 };
            urunMap[k.urun_isim].adet += k.miktar;
            urunMap[k.urun_isim].ciro += parseFloat(k.ara_toplam || 0);
        });
        const sirali = Object.values(urunMap).sort((a, b) => b.adet - a.adet).slice(0, 8);
        setEnCokSatanlar(sirali);

        const { data: sonFisler } = await supabase
            .from("sales")
            .select("id, toplam_tutar, created_at, personel_id")
            .eq("branch_id", subeId)
            .order("created_at", { ascending: false })
            .limit(10);
        setSonSatislar(sonFisler || []);

        const { count } = await supabase
            .from("basvurular")
            .select("id", { count: "exact", head: true })
            .eq("sube_id", subeId)
            .eq("durum", "kabul");
        setPersonelSayisi(count || 0);

        const { data: urunlerData } = await supabase
            .from("products")
            .select("*")
            .eq("branch_id", subeId)
            .order("created_at", { ascending: false });

        const cekilenUrunler = urunlerData || [];
        setUrunler(cekilenUrunler);
        if (cekilenUrunler.length > 0) {
            const dbKats = cekilenUrunler.map(u => u.kategori).filter(Boolean);
            setKategorilerListesi(prev => [...new Set([...prev, ...dbKats])].sort());
        }

        const { data: personelListesi } = await supabase.from("users").select("auth_id, ad_soyad");
        const personelMap = {};
        (personelListesi || []).forEach(p => { personelMap[p.auth_id] = p.ad_soyad; });

        const { data: gecmisData, error: gecmisHata } = await supabase
            .from("sales")
            .select("*")
            .eq("branch_id", subeId)
            .order("created_at", { ascending: false })
            .limit(100);

        if (gecmisHata) {
            setGecmisSiparisler([]);
        } else {
            const isimlendirilmisVeri = gecmisData.map(s => ({
                ...s,
                personel_ad_soyad: personelMap[s.personel_id] || "Bilinmiyor"
            }));
            setGecmisSiparisler(isimlendirilmisVeri);
        }

        const { data: basvuruVerileri } = await supabase
            .from("basvurular")
            .select("personel_id, created_at")
            .eq("sube_id", subeId)
            .eq("durum", "kabul");

        if (basvuruVerileri) {
            const authIds = basvuruVerileri.map(b => b.personel_id);
            const { data: personelDetaylari } = await supabase
                .from("users")
                .select("auth_id, ad_soyad, telefon")
                .in("auth_id", authIds);

            const birlesikPersonel = (personelDetaylari || []).map(p => {
                const b = basvuruVerileri.find(bv => bv.personel_id === p.auth_id);
                return { ...p, katilim_tarihi: b?.created_at };
            });
            setSubePersonelleri(birlesikPersonel);
        }
    };

    const siparisDetayYukle = async (siparis) => {
        setSeciliSiparis(siparis);
        setDetayYukleniyor(true);
        const { data, error } = await supabase
            .from("sale_items")
            .select("*")
            .eq("sale_id", siparis.id);

        if (error) {
            alert("İşlem başarısız: " + error.message);
        } else {
            setSiparisDetaylari(data || []);
        }
        setDetayYukleniyor(false);
    };

    useEffect(() => {
        const paneliHazirla = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { window.location.href = "/patron/giris"; return; }
            setKullanici(session.user);

            const { data: isletmeData } = await supabase
                .from("businesses").select("*").eq("patron_id", session.user.id).single();
            if (!isletmeData) { window.location.href = "/patron"; return; }
            setIsletme(isletmeData);

            const { data: subeData } = await supabase
                .from("branches").select("*")
                .eq("business_id", isletmeData.id).eq("isim", subeAd).single();
            if (!subeData) { window.location.href = "/patron"; return; }
            setSube(subeData);

            await analizleriYukle(subeData.id, isletmeData.id);
            setYukleniyor(false);

            const satisKanal = supabase
                .channel(`sube-satislar-${subeData.id}-${Math.random()}`)
                .on("postgres_changes", { event: "INSERT", schema: "public", table: "sales", filter: `branch_id=eq.${subeData.id}` },
                    () => analizleriYukle(subeData.id, isletmeData.id))
                .subscribe();

            window._aktifKanal = satisKanal;
        };
        paneliHazirla();

        return () => {
            if (window._aktifKanal) {
                supabase.removeChannel(window._aktifKanal);
                delete window._aktifKanal;
            }
        };
    }, [subeAd]);

    useEffect(() => {
        if (sube && isletme) {
            analizleriYukle(sube.id, isletme.id);
        }
    }, [enCokSatanlarAralik]);

    useEffect(() => {
        if (!kullanici) return;
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user && session.user.id !== kullanici.id) {
                alert("🚨 GÜVENLİK UYARISI: Tarayıcının başka bir sekmesinde farklı bir patron hesabına giriş yapıldığı tespit edildi! Veri karışıklığını önlemek için sayfa güncelleniyor.");
                window.location.reload();
            }
        });
        return () => {
            if (authListener?.subscription) authListener.subscription.unsubscribe();
        };
    }, [kullanici]);

    const urunEkleVeyaGuncelle = async (e) => {
        e.preventDefault();
        if (!yeniUrun.isim.trim() || !yeniUrun.fiyat) return;
        setUrunEkleniyor(true);
        if (duzenlenenUrunId) {
            const { error } = await supabase.from("products").update({
                isim: yeniUrun.isim.trim(), fiyat: parseFloat(yeniUrun.fiyat), kategori: yeniUrun.kategori
            }).eq("id", duzenlenenUrunId);
            if (error) alert("Hata: " + error.message);
            else {
                setUrunler(urunler.map(u => u.id === duzenlenenUrunId ? { ...u, isim: yeniUrun.isim.trim(), fiyat: parseFloat(yeniUrun.fiyat), kategori: yeniUrun.kategori } : u));
                setDuzenlenenUrunId(null); setYeniUrun({ isim: "", fiyat: "", kategori: "Genel" });
            }
        } else {
            const { data, error } = await supabase.from("products").insert({
                business_id: isletme.id,
                branch_id: sube.id,
                isim: yeniUrun.isim.trim(),
                fiyat: parseFloat(yeniUrun.fiyat),
                kategori: yeniUrun.kategori
            }).select();
            if (error) alert("Hata: " + error.message);
            else if (data?.[0]) { setUrunler([data[0], ...urunler]); setYeniUrun({ isim: "", fiyat: "", kategori: "Genel" }); }
        }
        setUrunEkleniyor(false);
    };

    const kategoriEkle = () => {
        const ad = yeniKatGirdisi.trim();
        if (!ad) return;
        if (kategorilerListesi.includes(ad)) { alert("Bu kategori zaten mevcut!"); return; }
        setKategorilerListesi([...kategorilerListesi, ad].sort());
        setYeniKatGirdisi("");
    };

    const kategoriGuncelle = async (eskiAd) => {
        const yeniAd = duzenlenenKatGirdisi.trim();
        if (!yeniAd || yeniAd === eskiAd) { setDuzenlenenKatAd(null); return; }
        setKatIslemBekliyor(true);
        const { error } = await supabase.from("products").update({ kategori: yeniAd }).eq("branch_id", sube.id).eq("kategori", eskiAd);
        if (error) alert("Kategori güncellenemedi: " + error.message);
        else {
            setUrunler(urunler.map(u => u.kategori === eskiAd ? { ...u, kategori: yeniAd } : u));
            setKategorilerListesi(kategorilerListesi.map(k => k === eskiAd ? yeniAd : k).sort());
            if (yeniUrun.kategori === eskiAd) setYeniUrun({ ...yeniUrun, kategori: yeniAd });
            setDuzenlenenKatAd(null);
        }
        setKatIslemBekliyor(false);
    };

    const kategoriSil = async (silinecekAd) => {
        if (silinecekAd === "Genel") { alert("'Genel' kategorisi silinemez."); return; }
        const onay = window.confirm(`"${silinecekAd}" kategorisini silmek istediğinize emin misiniz? Bu kategoriye ait tüm ürünler "Genel" kategorisine aktarılacaktır.`);
        if (!onay) return;
        setKatIslemBekliyor(true);
        const { error } = await supabase.from("products").update({ kategori: "Genel" }).eq("branch_id", sube.id).eq("kategori", silinecekAd);
        if (error) alert("Kategori silinemedi: " + error.message);
        else {
            setUrunler(urunler.map(u => u.kategori === silinecekAd ? { ...u, kategori: "Genel" } : u));
            setKategorilerListesi(kategorilerListesi.filter(k => k !== silinecekAd));
            if (yeniUrun.kategori === silinecekAd) setYeniUrun({ ...yeniUrun, kategori: "Genel" });
        }
        setKatIslemBekliyor(false);
    };

    const urunSil = async (id) => {
        if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) alert("Hata: " + error.message);
        else {
            setUrunler(urunler.filter(u => u.id !== id));
            if (duzenlenenUrunId === id) { setDuzenlenenUrunId(null); setYeniUrun({ isim: "", fiyat: "", kategori: "Genel" }); }
        }
    };

    const para = (sayi) => sayi.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const tarihFormat = (iso) => new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

    // ── LOADING ──────────────────────────────────────────────────────────────
    if (yukleniyor) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 text-[10px] font-outfit font-black uppercase tracking-[0.3em]">Pano Hazırlanıyor</p>
            </div>
        </div>
    );

    const sekmeListesi = [
        { id: "ozet", isim: "Dashboard", ikon: "📊" },
        { id: "menu", isim: "Ürünler", ikon: "🏷️" },
        { id: "personel", isim: "Personeller", ikon: "👥" },
        { id: "gecmis", isim: "Siparişler", ikon: "📜" }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-inter selection:bg-indigo-100 selection:text-indigo-900">

            {/* ── HEADER ── */}
            <header className="sticky top-0 z-40 bg-slate-950 border-b border-white/5 shadow-xl shadow-black/20">
                <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-14 sm:h-16">

                    {/* Sol: Logo + Şube Adı */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button
                            onClick={() => window.location.href = "/patron"}
                            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all text-sm"
                            aria-label="Geri"
                        >←</button>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-500/20 rounded-xl flex items-center justify-center text-base border border-indigo-500/30">🏪</div>
                            <div>
                                <h1 className="text-white font-outfit font-black tracking-tighter leading-none text-base sm:text-lg">
                                    Tezgah<span className="text-indigo-500">.</span>
                                </h1>
                                <p className="text-indigo-300/70 text-[9px] sm:text-[10px] font-medium tracking-widest uppercase leading-none mt-0.5 hidden sm:block">{sube?.isim}</p>
                            </div>
                        </div>
                    </div>

                    {/* Orta: Sekmeler — sadece md+ */}
                    <nav className="hidden md:flex items-center gap-1 bg-white/5 rounded-xl p-1">
                        {sekmeListesi.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setAktifSekme(s.id)}
                                className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs font-outfit font-black uppercase tracking-widest transition-all ${aktifSekme === s.id
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-white/50 hover:text-white hover:bg-white/10"
                                    }`}
                            >
                                <span className="text-sm">{s.ikon}</span>
                                <span className="hidden lg:inline">{s.isim}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Sağ: Yenile + Hamburger */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => analizleriYukle(sube.id, isletme.id)}
                            className="hidden sm:flex items-center gap-2 text-[10px] font-outfit font-black text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-all uppercase tracking-widest border border-white/5"
                        >
                            <span>↻</span>
                            <span>Yenile</span>
                        </button>

                        {/* Hamburger — sadece mobile */}
                        <button
                            onClick={() => setMenuAcik(true)}
                            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                        >
                            <span className="w-4 h-0.5 bg-white rounded-full"></span>
                            <span className="w-4 h-0.5 bg-white rounded-full"></span>
                            <span className="w-4 h-0.5 bg-white rounded-full"></span>
                        </button>
                    </div>
                </div>

                {/* Mobile: Aktif sekme adı bandı */}
                <div className="md:hidden border-t border-white/5 px-4 py-2 flex items-center justify-between">
                    <p className="text-white/40 text-[10px] font-outfit font-black uppercase tracking-[0.25em]">
                        {sekmeListesi.find(s => s.id === aktifSekme)?.ikon} {sekmeListesi.find(s => s.id === aktifSekme)?.isim}
                    </p>
                    <p className="text-indigo-400 text-[10px] font-medium tracking-widest uppercase">{sube?.isim}</p>
                </div>
            </header>

            {/* ── MOBİLE DRAWER ── */}
            {menuAcik && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuAcik(false)} />
                    <div className="relative w-72 max-w-[85vw] bg-slate-950 h-full flex flex-col p-6 shadow-2xl border-r border-white/5">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-white text-2xl font-outfit font-black tracking-tighter leading-none">
                                    Tezgah<span className="text-indigo-500">.</span>
                                </h1>
                                <p className="text-indigo-300/70 text-[10px] font-medium mt-1 tracking-widest uppercase">{sube?.isim}</p>
                            </div>
                            <button onClick={() => setMenuAcik(false)} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm flex items-center justify-center transition-all">✕</button>
                        </div>

                        <nav className="flex flex-col gap-1.5 flex-1">
                            {sekmeListesi.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => { setAktifSekme(s.id); setMenuAcik(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left group ${aktifSekme === s.id
                                            ? "bg-indigo-500/20 border border-indigo-500/30"
                                            : "hover:bg-white/5 border border-transparent"
                                        }`}
                                >
                                    <span className="text-lg">{s.ikon}</span>
                                    <span className={`font-outfit font-black text-sm uppercase tracking-widest ${aktifSekme === s.id ? "text-indigo-300" : "text-white/60 group-hover:text-white"}`}>
                                        {s.isim}
                                    </span>
                                </button>
                            ))}
                        </nav>

                        <div className="pt-4 border-t border-white/5">
                            <button
                                onClick={() => { analizleriYukle(sube.id, isletme.id); setMenuAcik(false); }}
                                className="w-full flex items-center justify-center gap-2 text-[10px] font-outfit font-black text-white/40 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-3 rounded-xl transition-all uppercase tracking-widest"
                            >
                                <span>↻</span> Verileri Yenile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ANA İÇERİK ── */}
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-screen-xl mx-auto w-full">

                {/* ══ DASHBOARD SEKMESİ ══ */}
                {aktifSekme === "ozet" && (
                    <div className="flex flex-col gap-6 sm:gap-8">

                        {/* İstatistik Kartları */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {[
                                { etiket: "Personel", deger: personelSayisi, ikon: "👥", renk: "from-slate-800 to-slate-900", tip: "sayi" },
                                { etiket: "Bugün", deger: istatistikler.bugun, ikon: "💰", alt: `${istatistikler.bugunSiparis} Sipariş`, renk: "from-indigo-950 to-slate-900", tip: "para" },
                                { etiket: "Bu Hafta", deger: istatistikler.hafta, ikon: "🗓️", alt: `${istatistikler.haftaSiparis} Sipariş`, renk: "from-slate-800 to-slate-900", tip: "para" },
                                { etiket: "Bu Ay", deger: istatistikler.ay, ikon: "📊", alt: `${istatistikler.aySiparis} Sipariş`, renk: "from-slate-800 to-slate-900", tip: "para" },
                            ].map((kart) => (
                                <div key={kart.etiket} className={`bg-gradient-to-br ${kart.renk} rounded-2xl p-4 sm:p-5 border border-white/5 shadow-lg flex flex-col justify-between min-h-[100px] sm:min-h-[120px]`}>
                                    <div className="flex items-start justify-between">
                                        <p className="text-[9px] sm:text-[10px] font-outfit font-black text-white/40 uppercase tracking-[0.2em]">{kart.etiket}</p>
                                        <span className="text-base sm:text-lg opacity-60">{kart.ikon}</span>
                                    </div>
                                    <div>
                                        {kart.tip === "para" ? (
                                            <>
                                                <p className="text-xl sm:text-2xl font-outfit font-black text-white tracking-tight leading-none">
                                                    {para(kart.deger)}<span className="text-sm sm:text-base text-white/30 font-medium ml-1">₺</span>
                                                </p>
                                                {kart.alt && <p className="text-[9px] sm:text-[10px] text-white/30 font-medium mt-1.5 tracking-widest uppercase">{kart.alt}</p>}
                                            </>
                                        ) : (
                                            <p className="text-3xl sm:text-4xl font-outfit font-black text-white tracking-tight">{kart.deger}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Popüler Ürünler + Son İşlemler */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                            {/* Popüler Ürünler */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="font-outfit font-black text-slate-900 tracking-tight text-sm sm:text-base">Popüler Ürünler</h3>
                                    <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5">
                                        {[["bugun", "Gün"], ["hafta", "Hft"], ["ay", "Ay"]].map(([key, label]) => (
                                            <button
                                                key={key}
                                                onClick={() => setEnCokSatanlarAralik(key)}
                                                className={`text-[9px] sm:text-[10px] font-outfit font-black px-2.5 sm:px-3 py-1.5 rounded-lg transition-all uppercase tracking-widest ${enCokSatanlarAralik === key
                                                        ? "bg-slate-900 text-white shadow-sm"
                                                        : "text-slate-400 hover:text-slate-700"
                                                    }`}
                                            >{label}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-5 sm:p-6">
                                    {enCokSatanlar.length === 0 ? (
                                        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                            <p className="text-2xl mb-2">📊</p>
                                            <p className="text-[10px] font-outfit font-black text-slate-400 tracking-[0.2em] uppercase">Henüz Veri Yok</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {enCokSatanlar.map((u, i) => {
                                                const configs = [
                                                    { bg: "bg-amber-50", border: "border-amber-200", medal: "bg-amber-400 text-white", bar: "bg-amber-400", track: "bg-amber-100", text: "text-amber-900" },
                                                    { bg: "bg-slate-50", border: "border-slate-200", medal: "bg-slate-400 text-white", bar: "bg-slate-400", track: "bg-slate-100", text: "text-slate-800" },
                                                    { bg: "bg-orange-50", border: "border-orange-200", medal: "bg-orange-400 text-white", bar: "bg-orange-400", track: "bg-orange-100", text: "text-orange-900" },
                                                ];
                                                const c = configs[i] || { bg: "bg-gray-50", border: "border-gray-100", medal: "bg-gray-200 text-gray-600", bar: "bg-gray-300", track: "bg-gray-100", text: "text-gray-700" };
                                                return (
                                                    <div key={u.isim} className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-3.5 rounded-xl border ${c.bg} ${c.border}`}>
                                                        <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-outfit font-black shrink-0 ${c.medal}`}>{i + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-center mb-1.5">
                                                                <p className={`font-outfit font-black text-xs sm:text-sm truncate uppercase tracking-tight ${c.text}`}>{u.isim}</p>
                                                                <p className="text-[9px] sm:text-[10px] font-outfit font-black text-slate-500 ml-2 shrink-0">{u.adet} adet</p>
                                                            </div>
                                                            <div className={`w-full rounded-full h-1.5 ${c.track}`}>
                                                                <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${(u.adet / (enCokSatanlar[0]?.adet || 1)) * 100}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Son İşlemler */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="font-outfit font-black text-slate-900 tracking-tight text-sm sm:text-base">Son İşlemler</h3>
                                    <button onClick={() => setAktifSekme("gecmis")} className="text-[10px] font-outfit font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest transition-colors">
                                        Tümü →
                                    </button>
                                </div>

                                <div className="divide-y divide-gray-50">
                                    {sonSatislar.length === 0 ? (
                                        <div className="text-center py-12 m-5 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                            <p className="text-[10px] font-outfit font-black text-slate-400 tracking-[0.2em] uppercase">Kayıt Bulunamadı</p>
                                        </div>
                                    ) : sonSatislar.map((s) => (
                                        <div key={s.id} className="flex items-center justify-between px-5 sm:px-6 py-3.5 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-base border border-indigo-100 shrink-0">📄</div>
                                                <div>
                                                    <p className="font-outfit font-black text-slate-900 text-sm tracking-tight">{para(parseFloat(s.toplam_tutar))} ₺</p>
                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{tarihFormat(s.created_at)}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => siparisDetayYukle(s)}
                                                className="text-[9px] sm:text-[10px] font-outfit font-black text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors uppercase tracking-widest"
                                            >İncele</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ ÜRÜNLER SEKMESİ ══ */}
                {aktifSekme === "menu" && (
                    <div className="flex flex-col xl:grid xl:grid-cols-12 gap-6">

                        {/* Form */}
                        <div className="xl:col-span-4">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 xl:sticky xl:top-24">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-outfit font-black text-slate-900 tracking-tight text-sm sm:text-base">
                                        {duzenlenenUrunId ? "Ürünü Düzenle" : "Yeni Ürün"}
                                    </h3>
                                    <button
                                        onClick={() => setKategoriModalAcik(true)}
                                        className="text-[9px] sm:text-[10px] font-outfit font-black text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all uppercase tracking-widest"
                                    >Kategoriler</button>
                                </div>

                                <form onSubmit={urunEkleVeyaGuncelle} className="space-y-4">
                                    <div>
                                        <label className="text-[9px] font-outfit font-black text-slate-500 uppercase tracking-[0.2em] block mb-1.5">Ürün İsmi</label>
                                        <input
                                            type="text" required placeholder="Örn: Su Böreği"
                                            value={yeniUrun.isim}
                                            onChange={(e) => setYeniUrun({ ...yeniUrun, isim: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm font-outfit font-black text-slate-900 outline-none transition-all placeholder:text-slate-300"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-outfit font-black text-slate-500 uppercase tracking-[0.2em] block mb-1.5">Fiyat (₺)</label>
                                            <input
                                                type="number" required min="0" step="0.01" placeholder="0.00"
                                                value={yeniUrun.fiyat}
                                                onChange={(e) => setYeniUrun({ ...yeniUrun, fiyat: e.target.value })}
                                                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm font-outfit font-black text-slate-900 outline-none transition-all placeholder:text-slate-300"
                                            />
                                        </div>

                                        <div className="relative">
                                            <label className="text-[9px] font-outfit font-black text-slate-500 uppercase tracking-[0.2em] block mb-1.5">Kategori</label>
                                            <button
                                                type="button"
                                                onClick={() => setKatMenuAcik(!katMenuAcik)}
                                                className="w-full flex items-center justify-between bg-slate-50 border-2 border-slate-200 hover:border-indigo-500 rounded-xl px-4 py-3 text-sm font-outfit font-black text-slate-700 transition-all"
                                            >
                                                <span className="truncate">{yeniUrun.kategori}</span>
                                                <span className={`text-indigo-500 text-[10px] transition-transform duration-200 ${katMenuAcik ? "rotate-180" : ""}`}>▼</span>
                                            </button>

                                            {katMenuAcik && (
                                                <div className="absolute top-full left-0 w-full mt-1.5 bg-white border-2 border-slate-200 rounded-xl shadow-xl p-1.5 z-[60]">
                                                    <div className="max-h-44 overflow-y-auto space-y-0.5">
                                                        {kategorilerListesi.map(k => (
                                                            <button
                                                                key={k} type="button"
                                                                onClick={() => { setYeniUrun({ ...yeniUrun, kategori: k }); setKatMenuAcik(false); }}
                                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-outfit font-black uppercase tracking-widest transition-all ${yeniUrun.kategori === k
                                                                        ? "bg-indigo-500 text-white"
                                                                        : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                                                                    }`}
                                                            >{k}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-1">
                                        {duzenlenenUrunId ? (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setDuzenlenenUrunId(null); setYeniUrun({ isim: "", fiyat: "", kategori: "Genel" }); }}
                                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-outfit font-black py-3.5 rounded-xl text-[10px] uppercase tracking-widest transition-all"
                                                >İptal</button>
                                                <button
                                                    type="submit" disabled={urunEkleniyor}
                                                    className="flex-[2] bg-amber-500 hover:bg-amber-600 text-white font-outfit font-black py-3.5 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all"
                                                >Güncelle</button>
                                            </div>
                                        ) : (
                                            <button
                                                type="submit" disabled={urunEkleniyor}
                                                className="w-full bg-slate-900 hover:bg-slate-950 text-white font-outfit font-black py-4 rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 transition-all border-b-4 border-black active:border-b-0 active:translate-y-px"
                                            >Menüye Kaydet</button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Ürün Listesi */}
                        <div className="xl:col-span-8">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                                    <h3 className="font-outfit font-black text-slate-900 tracking-tight text-sm sm:text-base">Ürün Listesi</h3>
                                    <span className="bg-slate-100 text-slate-600 text-[9px] sm:text-[10px] font-outfit font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">{urunler.length} Ürün</span>
                                </div>

                                {urunler.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <p className="text-4xl mb-3">📁</p>
                                        <p className="text-[10px] font-outfit font-black text-slate-400 uppercase tracking-[0.2em]">Henüz Ürün Eklenmedi</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {[...new Set(urunler.map(u => u.kategori || "Genel"))].sort().map(kat => (
                                            <div key={kat}>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <h4 className="text-[10px] font-outfit font-black text-slate-500 uppercase tracking-[0.2em]">{kat}</h4>
                                                    <div className="h-px flex-1 bg-slate-100"></div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {urunler.filter(u => (u.kategori || "Genel") === kat).map((urun) => (
                                                        <div key={urun.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${duzenlenenUrunId === urun.id
                                                                ? "bg-indigo-50 border-indigo-200"
                                                                : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
                                                            }`}>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-outfit font-black text-slate-900 text-sm tracking-tight truncate">{urun.isim}</p>
                                                                <p className="text-indigo-600 font-outfit font-black text-xs mt-0.5">{para(urun.fiyat)} ₺</p>
                                                            </div>
                                                            <div className="flex gap-1.5 ml-3">
                                                                <button
                                                                    onClick={() => { setDuzenlenenUrunId(urun.id); setYeniUrun({ isim: urun.isim, fiyat: urun.fiyat, kategori: urun.kategori || "Genel" }); }}
                                                                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm transition-colors"
                                                                >✏️</button>
                                                                <button
                                                                    onClick={() => urunSil(urun.id)}
                                                                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center text-sm transition-colors"
                                                                >🗑️</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ PERSONELLER SEKMESİ ══ */}
                {aktifSekme === "personel" && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-outfit font-black text-slate-900 tracking-tight text-sm sm:text-base">Şube Personelleri</h3>
                                <p className="text-[10px] font-outfit font-black text-slate-400 uppercase tracking-widest mt-1">Aktif Çalışanlar</p>
                            </div>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-outfit font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">{subePersonelleri.length} Personel</span>
                        </div>

                        <div className="p-5 sm:p-6">
                            {subePersonelleri.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                    <p className="text-4xl mb-3 opacity-30">👥</p>
                                    <p className="text-[10px] font-outfit font-black text-slate-400 uppercase tracking-[0.2em]">Bu Şubede Personel Yok</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {subePersonelleri.map((p) => (
                                        <div key={p.auth_id} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all group">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-xl border border-indigo-200 group-hover:bg-indigo-500 group-hover:border-indigo-500 transition-all">
                                                    <span className="group-hover:text-white transition-all">👤</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-outfit font-black text-slate-900 text-sm tracking-tight truncate">{p.ad_soyad}</h4>
                                                    <p className="text-[9px] font-outfit font-black text-slate-400 tracking-widest uppercase mt-0.5">
                                                        {new Date(p.katilim_tarihi).toLocaleDateString("tr-TR")} katıldı
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <a href={`tel:${p.telefon}`} className="flex items-center gap-2 bg-white hover:bg-slate-100 px-3 py-2.5 rounded-xl border border-slate-200 transition-colors no-underline">
                                                    <span className="text-sm">📞</span>
                                                    <span className="text-xs font-outfit font-black text-slate-700 truncate tracking-tight">{p.telefon || "Numara Yok"}</span>
                                                </a>
                                                {p.telefon && (
                                                    <a
                                                        href={`https://wa.me/${p.telefon.replace(/\D/g, "")}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] px-3 py-2.5 rounded-xl border border-[#25D366]/20 transition-colors no-underline"
                                                    >
                                                        <span className="text-[10px] font-outfit font-black uppercase tracking-widest">WhatsApp ile Yaz</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══ SİPARİŞ GEÇMİŞİ SEKMESİ ══ */}
                {aktifSekme === "gecmis" && (
                    <div className="space-y-4 sm:space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
                            <div>
                                <h3 className="font-outfit font-black text-slate-900 tracking-tight text-sm sm:text-base">Sipariş Kayıtları</h3>
                                <p className="text-[10px] font-outfit font-black text-slate-400 uppercase tracking-widest mt-1">Son İşlemler</p>
                            </div>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-outfit font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">{gecmisSiparisler.length} Kayıt</span>
                        </div>

                        {gecmisSiparisler.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                                <p className="text-[10px] font-outfit font-black text-slate-400 uppercase tracking-[0.2em]">Sipariş Kaydı Bulunamadı</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {gecmisSiparisler.map((s) => (
                                    <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-indigo-100 transition-all group">
                                        <div className="flex items-start justify-between mb-4">
                                            <span className="text-[9px] font-outfit font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-widest">#{s.id.slice(0, 8)}</span>
                                            <span className="font-outfit font-black text-slate-900 text-lg tracking-tight">{para(parseFloat(s.toplam_tutar))} ₺</span>
                                        </div>

                                        <div className="space-y-3 mb-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-400 flex items-center justify-center text-sm border border-indigo-100 shrink-0">👤</div>
                                                <div>
                                                    <p className="text-[9px] font-outfit font-black text-slate-400 uppercase tracking-widest">Kasiyer</p>
                                                    <p className="text-xs font-outfit font-black text-slate-800">{s.personel_ad_soyad}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-400 flex items-center justify-center text-sm border border-indigo-100 shrink-0">⏰</div>
                                                <div>
                                                    <p className="text-[9px] font-outfit font-black text-slate-400 uppercase tracking-widest">Tarih</p>
                                                    <p className="text-xs font-outfit font-black text-slate-800">{tarihFormat(s.created_at)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => siparisDetayYukle(s)}
                                            className="w-full bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 py-2.5 rounded-xl text-[10px] font-outfit font-black transition-all uppercase tracking-widest border border-slate-200 hover:border-indigo-200"
                                        >Detayları İncele</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ── SİPARİŞ DETAY MODALİ ── */}
            {seciliSiparis && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="font-outfit font-black text-slate-900 tracking-tight text-base">Sipariş Detayı</h3>
                                <p className="text-[10px] font-outfit font-black text-slate-400 uppercase tracking-widest mt-0.5">#{seciliSiparis.id}</p>
                            </div>
                            <button onClick={() => setSeciliSiparis(null)} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 transition-colors text-sm">✕</button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="flex justify-between items-end mb-6 pb-6 border-b border-gray-100">
                                <div>
                                    <p className="text-[9px] font-outfit font-black text-slate-400 uppercase tracking-widest mb-1">Tarih</p>
                                    <p className="font-outfit font-black text-slate-900 text-sm">{new Date(seciliSiparis.created_at).toLocaleString("tr-TR")}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-outfit font-black text-slate-400 uppercase tracking-widest mb-1">Kasiyer</p>
                                    <p className="font-outfit font-black text-slate-900 text-sm">{seciliSiparis.personel_ad_soyad || "Sistem"}</p>
                                </div>
                            </div>

                            <p className="text-[9px] font-outfit font-black text-slate-400 uppercase tracking-widest mb-3">Sipariş Kalemleri</p>
                            {detayYukleniyor ? (
                                <div className="py-10 flex justify-center">
                                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100 mb-6">
                                    {siparisDetaylari.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center">
                                            <div>
                                                <p className="font-outfit font-black text-slate-900 text-sm">{item.urun_isim}</p>
                                                <p className="text-xs text-slate-400 font-medium">{para(item.birim_fiyat)} ₺ × {item.miktar}</p>
                                            </div>
                                            <p className="font-outfit font-black text-slate-900 text-sm">{para(item.ara_toplam)} ₺</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="bg-slate-900 rounded-xl p-5 flex justify-between items-center">
                                <span className="text-[10px] font-outfit font-black text-white/50 uppercase tracking-widest">Genel Toplam</span>
                                <span className="font-outfit font-black text-white text-xl tracking-tight">{para(parseFloat(seciliSiparis.toplam_tutar))} ₺</span>
                            </div>
                        </div>

                        <div className="px-6 pb-6 pt-2">
                            <button
                                onClick={() => setSeciliSiparis(null)}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-outfit font-black py-3.5 rounded-xl transition-colors text-xs uppercase tracking-widest"
                            >Kapat</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── KATEGORİ MODALI ── */}
            {kategoriModalAcik && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]">
                        <div className="px-6 py-5 bg-slate-50 border-b border-gray-100 flex items-center justify-between shrink-0 rounded-t-3xl sm:rounded-t-2xl">
                            <h3 className="font-outfit font-black text-slate-900 tracking-tight text-sm sm:text-base">Kategorileri Yönet</h3>
                            <button onClick={() => { setKategoriModalAcik(false); setDuzenlenenKatAd(null); }} className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-xl transition-colors text-sm">✕</button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto relative">
                            {katIslemBekliyor && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-500 font-outfit font-black text-[10px] tracking-widest mt-3 uppercase">İşleniyor...</p>
                                </div>
                            )}

                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text" placeholder="Yeni kategori adı..."
                                    value={yeniKatGirdisi}
                                    onChange={(e) => setYeniKatGirdisi(e.target.value)}
                                    className="flex-1 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm font-outfit font-black text-slate-900 outline-none transition-all placeholder:text-slate-300"
                                />
                                <button onClick={kategoriEkle} className="bg-slate-900 hover:bg-slate-950 text-white px-4 py-2.5 rounded-xl text-[10px] font-outfit font-black uppercase tracking-widest transition-colors">Ekle</button>
                            </div>

                            <div className="space-y-2">
                                {kategorilerListesi.map(k => (
                                    <div key={k} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-slate-200 transition-colors group">
                                        {duzenlenenKatAd === k ? (
                                            <input
                                                type="text" value={duzenlenenKatGirdisi}
                                                onChange={(e) => setDuzenlenenKatGirdisi(e.target.value)}
                                                className="flex-1 bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-sm font-outfit font-black text-slate-900 outline-none mr-2"
                                            />
                                        ) : (
                                            <p className="font-outfit font-black text-slate-700 text-sm flex-1 truncate">{k}</p>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            {duzenlenenKatAd === k ? (
                                                <button onClick={() => kategoriGuncelle(k)} className="w-7 h-7 rounded-lg text-green-600 flex items-center justify-center text-xs border border-green-200 hover:bg-green-50 transition-colors bg-white">✓</button>
                                            ) : (
                                                <button onClick={() => { setDuzenlenenKatAd(k); setDuzenlenenKatGirdisi(k); }} className="w-7 h-7 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs border border-slate-200 hover:bg-white transition-all">✏️</button>
                                            )}
                                            <button
                                                onClick={() => kategoriSil(k)}
                                                disabled={k === "Genel"}
                                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs border transition-all ${k === "Genel" ? "text-slate-200 border-slate-100 cursor-not-allowed" : "text-red-400 border-slate-200 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:border-red-200"}`}
                                            >🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="px-6 py-5 bg-slate-50 border-t border-gray-100 shrink-0">
                            <p className="text-[9px] font-outfit font-black text-slate-400 uppercase tracking-widest text-center mb-3">Silinen kategorilerin ürünleri "Genel"e aktarılır.</p>
                            <button
                                onClick={() => { setKategoriModalAcik(false); setDuzenlenenKatAd(null); }}
                                className="w-full bg-slate-900 hover:bg-slate-950 text-white py-3.5 rounded-xl transition-colors text-xs font-outfit font-black uppercase tracking-widest"
                            >Tamamla</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}