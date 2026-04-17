"use client";
import { useEffect, useState } from "react";
import { supabasePersonel as supabase } from "../../supabasePersonel";

export default function PersonelDashboard() {
    const [kullanici, setKullanici] = useState(null);
    const [isletmeBilgisi, setIsletmeBilgisi] = useState(null);
    const [urunler, setUrunler] = useState([]);
    const [sepet, setSepet] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [saat, setSaat] = useState("");
    const [satisGonderiliyor, setSatisGonderiliyor] = useState(false);
    const [ayarlarAcik, setAyarlarAcik] = useState(false);
    const [alinanNakit, setAlinanNakit] = useState("");
    const [seciliKategori, setSeciliKategori] = useState("HEPSİ");
    const [sepetAcik, setSepetAcik] = useState(false); // Mobil sepet drawer

    useEffect(() => {
        const oturumKontrol = async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                window.location.href = "/personel/giris";
                return;
            }

            const user = data.session.user;

            const { data: basvuruListesi, error: basvuruHata } = await supabase
                .from("basvurular")
                .select("*, branches(isim, business_id)")
                .eq("personel_id", user.id)
                .eq("durum", "kabul");

            console.log("DASHBOARD BASVURU DATA: ", basvuruListesi, basvuruHata);

            if (!basvuruListesi || basvuruListesi.length === 0) {
                window.location.href = "/personel";
                return;
            }

            const basvuruData = basvuruListesi[0];

            const { data: userData } = await supabase.from("users").select("ad_soyad").eq("auth_id", user.id).single();
            const { data: isData } = await supabase.from("businesses").select("isim").eq("id", basvuruData.branches.business_id).single();

            setKullanici({
                ...user,
                ad_soyad: userData?.ad_soyad || "Personel",
                sube_id: basvuruData.sube_id,
                business_id: basvuruData.branches.business_id
            });

            setIsletmeBilgisi({
                isletme_isim: isData?.isim || "İşletme",
                sube_isim: basvuruData.branches.isim,
            });

            const urunleriGetir = async (sid) => {
                const { data: uData } = await supabase
                    .from("products")
                    .select("*")
                    .eq("branch_id", sid)
                    .order("created_at", { ascending: false });
                setUrunler(uData || []);
            };

            await urunleriGetir(basvuruData.sube_id);
            setYukleniyor(false);

            const urunKanal = supabase
                .channel(`sube-urunler-${basvuruData.sube_id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'products', filter: `branch_id=eq.${basvuruData.sube_id}` },
                    (payload) => {
                        console.log("Ürün değişimi:", payload);
                        urunleriGetir(basvuruData.sube_id);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(urunKanal);
            };
        };

        const temizleyiciPrm = oturumKontrol();

        const interval = setInterval(() => {
            const date = new Date();
            setSaat(date.toLocaleTimeString('tr-TR'));
        }, 1000);

        return () => {
             clearInterval(interval);
             temizleyiciPrm.then(temizle => {
                 if (typeof temizle === 'function') temizle();
             });
        };
    }, []);

    // Oturum zehirlenmesi koruması
    useEffect(() => {
        if (!kullanici) return;
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user && session.user.id !== kullanici.id) {
                alert("🚨 GÜVENLİK UYARISI: Tarayıcının başka bir sekmesinde farklı bir personel hesabına giriş yapıldığı tespit edildi! Veri karışıklığını önlemek için sayfa güncelleniyor.");
                window.location.reload();
            }
        });
        return () => {
            if (authListener?.subscription) authListener.subscription.unsubscribe();
        };
    }, [kullanici]);

    // Kovulma dedektörü
    useEffect(() => {
        if (!kullanici) return;
        
        const kovulmaKanal = supabase
            .channel('gercek-zamanli-kovulma')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'basvurular', filter: `personel_id=eq.${kullanici.id}` },
                (payload) => {
                    if (payload.new.durum === 'red' || payload.new.durum === 'kovuldu') {
                        alert("⚠️ BİLDİRİM: İşletme sahibi tarafından işinize son verildi. Sistemden çıkış yapılıyor...");
                        window.location.href = "/personel"; 
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(kovulmaKanal);
        };
    }, [kullanici]);

    // Presence (çevrimiçi durum)
    useEffect(() => {
        if (!kullanici) return;

        let channel;
        const presenceBaslat = async () => {
            channel = supabase.channel('online-personeller', {
                config: { presence: { key: kullanici.id } }
            });

            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ is_online: true });
                }
            });
        };

        presenceBaslat();

        return () => {
            if (channel) {
                channel.untrack().then(() => supabase.removeChannel(channel));
            }
        };
    }, [kullanici]);

    const sepeteEkle = (urun) => {
        const varMi = sepet.find(item => item.id === urun.id);
        if (varMi) {
            setSepet(sepet.map(item => item.id === urun.id ? { ...item, miktar: item.miktar + 1 } : item));
        } else {
            setSepet([...sepet, { ...urun, miktar: 1 }]);
        }
    };

    const sepettenCikar = (urunId) => {
        const varMi = sepet.find(item => item.id === urunId);
        if (varMi && varMi.miktar > 1) {
            setSepet(sepet.map(item => item.id === urunId ? { ...item, miktar: item.miktar - 1 } : item));
        } else {
            setSepet(sepet.filter(item => item.id !== urunId));
        }
    };

    const siparisiTamamla = async () => {
        if (sepet.length === 0) return;
        setSatisGonderiliyor(true);

        const toplam = sepet.reduce((acc, item) => acc + (item.fiyat * item.miktar), 0);

        const { data: satisData, error: satisHata } = await supabase
            .from("sales")
            .insert({
                branch_id: kullanici.sube_id,
                business_id: kullanici.business_id,
                personel_id: kullanici.id,
                toplam_tutar: toplam,
            })
            .select()
            .single();

        if (satisHata || !satisData) {
            alert("Satış kaydedilirken bir hata oluştu: " + (satisHata?.message || "Bilinmeyen hata"));
            setSatisGonderiliyor(false);
            return;
        }

        const kalemler = sepet.map(item => ({
            sale_id: satisData.id,
            product_id: item.id,
            urun_isim: item.isim,
            birim_fiyat: item.fiyat,
            miktar: item.miktar,
            ara_toplam: item.fiyat * item.miktar,
        }));

        const { error: kalemHata } = await supabase.from("sale_items").insert(kalemler);

        if (kalemHata) {
            alert("Sipariş kalemleri kaydedilirken hata oluştu: " + kalemHata.message);
        } else {
            setSepet([]);
            setAlinanNakit("");
            setSepetAcik(false);
        }

        setSatisGonderiliyor(false);
    };

    const cikisYap = async () => {
        const onay = window.confirm("Çıkış yapmak istediğinize emin misiniz?");
        if (onay) {
            await supabase.auth.signOut();
            window.location.href = "/";
        }
    };

    const isletmedenAyril = async () => {
        const onay = window.confirm("İşletmeden ayrılmak (istifa etmek) istediğinize emin misiniz? Bu işlemi geri alamazsınız ve baştan başvuru yapmanız gerekir.");
        if (onay) {
            setYukleniyor(true);
            await supabase.from("basvurular").update({ durum: "ayrildi" }).eq("personel_id", kullanici.id).eq("durum", "kabul");
            window.location.href = "/personel";
        }
    };

    if (yukleniyor) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-2">Kasa Hazırlanıyor...</p>
                </div>
            </div>
        );
    }

    const toplamTutar = sepet.reduce((acc, item) => acc + (item.fiyat * item.miktar), 0);
    const toplamAdet = sepet.reduce((acc, item) => acc + item.miktar, 0);
    const kategoriler = ["HEPSİ", ...new Set(urunler.map(u => u.kategori || "Genel"))];
    const filtrelenmisUrunler = seciliKategori === "HEPSİ" 
        ? urunler 
        : urunler.filter(u => (u.kategori || "Genel") === seciliKategori);

    return (
        <div className="min-h-screen bg-[#CBD5E1] flex flex-col lg:flex-row overflow-hidden max-h-screen font-[Inter,sans-serif] text-slate-900">

            {/* ============================================================
                MOBİL & TABLET: Dikey Layout (< lg)
            ============================================================ */}

            {/* MOBİL: Üst Bar */}
            <div className="lg:hidden sticky top-0 z-30 bg-slate-900 border-b border-slate-950 px-4 py-3 flex items-center justify-between shadow-lg shrink-0">
                <div className="flex flex-col">
                    <h2 className="text-white text-sm font-outfit font-black tracking-tight uppercase leading-none">
                        {isletmeBilgisi?.isletme_isim}
                    </h2>
                    <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                        {isletmeBilgisi?.sube_isim}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-outfit font-black tabular-nums bg-white/10 px-3 py-1.5 rounded-xl">{saat || "..."}</span>
                    <button onClick={() => setAyarlarAcik(true)} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-base transition-all">⚙️</button>
                </div>
            </div>

            {/* MOBİL: Kategori Barı */}
            <div className="lg:hidden h-14 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar shrink-0">
                {kategoriler.map((kat) => (
                    <button
                        key={kat}
                        onClick={() => setSeciliKategori(kat)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-outfit font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0
                            ${seciliKategori === kat 
                                ? "bg-slate-900 text-white shadow-md" 
                                : "bg-white text-slate-500 border border-slate-200"}`}
                    >
                        {kat}
                    </button>
                ))}
            </div>

            {/* MOBİL: Ürün Grid */}
            <div className="lg:hidden flex-1 overflow-y-auto p-3 bg-slate-100">
                {filtrelenmisUrunler.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-16">
                        <div className="text-5xl mb-3">🥡</div>
                        <h3 className="text-sm font-black text-slate-600 uppercase tracking-[0.2em]">Ürün Bulunamadı</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filtrelenmisUrunler.map((urun) => {
                            const sepetteki = sepet.find(s => s.id === urun.id);
                            const miktar = sepetteki ? sepetteki.miktar : 0;

                            return (
                                <div key={urun.id}
                                    className={`bg-white rounded-2xl p-3 flex flex-col gap-2 border-2 transition-all duration-200 active:scale-95
                                        ${miktar > 0 
                                            ? "border-indigo-500 shadow-lg shadow-indigo-100" 
                                            : "border-transparent shadow-sm"}`}
                                >
                                    {/* Kategori badge */}
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{urun.kategori || "Genel"}</span>
                                    
                                    {/* Ürün bilgisi */}
                                    <div className="flex-1">
                                        <p className="font-outfit font-black text-slate-800 text-sm leading-tight uppercase tracking-tight line-clamp-2">{urun.isim}</p>
                                        <p className="text-indigo-700 font-black text-base mt-1">{urun.fiyat} ₺</p>
                                    </div>

                                    {/* Miktar kontrolü */}
                                    <div className={`flex items-center justify-between rounded-xl overflow-hidden border-2 ${miktar > 0 ? "border-indigo-500" : "border-slate-100 bg-slate-50"}`}>
                                        <button
                                            onClick={() => sepettenCikar(urun.id)}
                                            disabled={miktar === 0}
                                            className={`w-10 h-10 flex items-center justify-center font-black text-xl transition-all ${miktar > 0 ? "bg-indigo-600 text-white" : "bg-white text-slate-200"}`}
                                        >−</button>
                                        <span className={`font-outfit font-black text-lg w-8 text-center tabular-nums ${miktar > 0 ? "text-indigo-700" : "text-slate-300"}`}>{miktar}</span>
                                        <button
                                            onClick={() => sepeteEkle(urun)}
                                            className={`w-10 h-10 flex items-center justify-center font-black text-xl transition-all ${miktar > 0 ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
                                        >+</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MOBİL: Alt Sipariş Butonu (Sabit) */}
            <div className="lg:hidden shrink-0 p-3 bg-white border-t-2 border-slate-200">
                <button
                    onClick={() => setSepetAcik(true)}
                    disabled={sepet.length === 0}
                    className="group flex items-center justify-between w-full bg-slate-950 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white p-2 rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-indigo-900/10"
                >
                    <div className="bg-white/10 px-5 py-3 rounded-xl flex flex-col items-start">
                        <span className="text-[10px] font-black opacity-50 leading-none mb-1 tracking-widest uppercase text-indigo-200">TOPLAM</span>
                        <span className="text-lg font-outfit font-black leading-none tracking-tight">{toplamTutar} ₺</span>
                    </div>
                    <div className="flex-1 text-center font-outfit font-black text-sm tracking-wider uppercase">
                        {sepet.length === 0 ? "Sepet Boş" : `Sepeti Gör (${toplamAdet})`}
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-xl text-xl">
                        🛒
                    </div>
                </button>
            </div>

            {/* MOBİL: Sepet Drawer (Modal) */}
            {sepetAcik && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSepetAcik(false)} />
                    <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom duration-300">
                        {/* Drawer Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-slate-200 rounded-full"></div>
                        </div>
                        
                        {/* Başlık */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 text-base uppercase tracking-tight">Sipariş Detayı</h3>
                            <button onClick={() => setSepetAcik(false)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">✕</button>
                        </div>

                        {/* Sepet İçeriği */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
                            {sepet.length === 0 ? (
                                <div className="py-8 text-center">
                                    <div className="text-4xl mb-2">🛒</div>
                                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Sepet Boş</p>
                                </div>
                            ) : (
                                sepet.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-outfit font-black text-slate-900 text-sm tracking-tight truncate">{item.isim}</p>
                                            <p className="text-[11px] text-slate-400 font-bold mt-0.5">x{item.miktar} × {item.fiyat} ₺</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden">
                                                <button onClick={() => sepettenCikar(item.id)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-600 font-black text-lg">−</button>
                                                <span className="w-8 text-center font-black text-sm">{item.miktar}</span>
                                                <button onClick={() => sepeteEkle(item)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-600 font-black text-lg">+</button>
                                            </div>
                                            <span className="font-outfit font-black text-sm text-slate-900 min-w-[52px] text-right">{item.fiyat * item.miktar} ₺</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Alt Panel */}
                        {sepet.length > 0 && (
                            <div className="px-6 pb-6 pt-4 bg-white border-t border-slate-100">
                                {/* Nakit girişi */}
                                <div className="flex items-center bg-white border-2 border-slate-200 rounded-xl px-4 py-3 mb-3 focus-within:border-indigo-500 transition-all">
                                    <span className="text-slate-400 text-xs font-black uppercase tracking-widest mr-2">Nakit:</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={alinanNakit}
                                        onChange={(e) => setAlinanNakit(e.target.value)}
                                        className="w-full bg-transparent border-none text-right text-base text-slate-900 font-outfit font-black outline-none placeholder:text-slate-200"
                                    />
                                    <span className="ml-2 text-slate-400 font-black text-xs">₺</span>
                                </div>
                                {alinanNakit && parseFloat(alinanNakit) > toplamTutar && (
                                    <div className="flex justify-between text-[10px] text-green-500 font-bold tracking-tight mb-2 px-1">
                                        <span className="opacity-60 uppercase">Para Üstü</span>
                                        <span className="text-sm font-black">{(parseFloat(alinanNakit) - toplamTutar).toFixed(2)} ₺</span>
                                    </div>
                                )}
                                <button
                                    onClick={siparisiTamamla}
                                    disabled={satisGonderiliyor}
                                    className="group flex items-center justify-between w-full bg-slate-950 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white p-2 rounded-2xl transition-all active:scale-[0.98] shadow-xl"
                                >
                                    <div className="bg-white/10 px-5 py-3 rounded-xl flex flex-col items-start">
                                        <span className="text-[10px] font-black opacity-50 leading-none mb-1 tracking-widest uppercase text-indigo-200">TOPLAM</span>
                                        <span className="text-lg font-outfit font-black leading-none">{toplamTutar} ₺</span>
                                    </div>
                                    <div className="flex-1 text-center font-outfit font-black text-sm tracking-wider uppercase">
                                        {satisGonderiliyor ? "..." : "Siparişi Onayla"}
                                    </div>
                                    <div className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-xl text-xl">➔</div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* ============================================================
                DESKTOP: Yatay Layout (>= lg) — Orijinal tasarım korundu
            ============================================================ */}

            {/* DESKTOP: Sol Menü */}
            <div className="hidden lg:flex w-24 bg-slate-900 flex-col items-center py-8 justify-between shrink-0 shadow-2xl z-20 relative overflow-hidden border-r-4 border-slate-950">
                <div className="absolute top-0 -right-10 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
                
                <div className="flex flex-col items-center gap-6 w-full relative">
                    <div className="flex flex-col items-center gap-2 group cursor-pointer">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white text-xl shadow-inner border border-white/5 group-hover:bg-white/20 transition-all">
                            👤
                        </div>
                        <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest text-center truncate w-full px-2 opacity-60">
                            {kullanici?.ad_soyad?.split(' ')[0]}
                        </span>
                    </div>

                    <div className="w-10 h-px bg-white/5"></div>

                    {[
                        { ikon: "⚙️", isim: "AYAR", click: () => setAyarlarAcik(true) }
                    ].map((item, i) => (
                        <button key={i} onClick={item.click} className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-white transition-all group">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl group-hover:bg-white/10 transition-all">
                                {item.ikon}
                            </div>
                            <span className="text-[8px] font-black tracking-tighter text-center uppercase">{item.isim}</span>
                        </button>
                    ))}
                </div>

                <button onClick={cikisYap} className="flex flex-col items-center gap-2 text-red-300/40 hover:text-red-400 transition-all hover:bg-red-500/10 p-4 rounded-2xl group mt-auto mb-4 mx-4 border border-transparent hover:border-red-500/20">
                    <div className="text-2xl">🚪</div>
                </button>
            </div>

            {/* DESKTOP: Orta Alan */}
            <div className="hidden lg:flex flex-1 flex-col min-w-0 bg-slate-200">
                <div className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 shrink-0 sticky top-0 z-20">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-outfit font-black text-slate-800 tracking-tight uppercase leading-none">
                            {isletmeBilgisi?.isletme_isim}
                        </h2>
                        <p className="text-[10px] font-black text-indigo-700 tracking-[0.2em] mt-2 uppercase flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                            {isletmeBilgisi?.sube_isim}
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100 shadow-inner">
                            <span className="text-xl font-outfit font-black text-slate-900 tabular-nums">{saat || "..."}</span>
                        </div>
                    </div>
                </div>

                <div className="h-20 bg-slate-50 border-b border-slate-200 flex items-center px-8 gap-3 overflow-x-auto no-scrollbar shrink-0">
                    {kategoriler.map((kat) => (
                        <button
                            key={kat}
                            onClick={() => setSeciliKategori(kat)}
                            className={`px-8 py-3 rounded-2xl text-[11px] font-outfit font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap
                                ${seciliKategori === kat 
                                    ? "bg-slate-900 text-white shadow-xl scale-105" 
                                    : "bg-white text-slate-500 border border-slate-200 hover:border-slate-800 hover:bg-slate-50"}`}
                        >
                            {kat}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 relative z-0 bg-slate-100">
                    {filtrelenmisUrunler.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center px-4">
                            <div className="text-6xl mb-4 drop-shadow-md">🥡</div>
                            <h3 className="text-sm font-black text-slate-600 uppercase tracking-[0.2em] drop-shadow-sm">Ürün Bulunamadı</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filtrelenmisUrunler.map((urun) => {
                                const sepetteki = sepet.find(s => s.id === urun.id);
                                const miktar = sepetteki ? sepetteki.miktar : 0;

                                return (
                                    <div key={urun.id} className={`soft-card p-6 flex flex-col transition-all duration-300 h-64 relative overflow-hidden group
                                        ${miktar > 0 
                                            ? "border-indigo-600 ring-4 ring-indigo-500/10 bg-indigo-50/30" 
                                            : "border-slate-300 hover:scale-[1.03] hover:shadow-2xl hover:border-indigo-400"}`}>
                                        
                                        <div className="absolute top-4 left-6">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                {urun.kategori || "Genel"}
                                            </span>
                                        </div>

                                        <div className="flex-1 flex flex-col justify-center items-center py-4">
                                            <h3 className="font-outfit font-black text-slate-800 text-base leading-tight mb-2 line-clamp-2 text-center uppercase tracking-tight">{urun.isim}</h3>
                                            <p className="text-indigo-700 font-outfit font-black text-xl tracking-tighter bg-indigo-50 px-3 py-1 rounded-xl">{urun.fiyat} ₺</p>
                                        </div>
                                        
                                        <div className="mt-auto">
                                            <div className={`flex items-center justify-between rounded-2xl overflow-hidden transition-all shadow-sm border-2 ${miktar > 0 ? "border-indigo-600 bg-white" : "border-slate-100 bg-slate-50"}`}>
                                                <button 
                                                    onClick={() => sepettenCikar(urun.id)} 
                                                    disabled={miktar === 0}
                                                    className={`w-14 h-14 flex items-center justify-center font-black text-2xl transition-all ${miktar > 0 ? "bg-indigo-600 text-white" : "bg-white text-slate-200"}`}
                                                >−</button>
                                                <span className={`font-outfit font-black text-xl w-14 text-center tabular-nums ${miktar > 0 ? "text-indigo-700" : "text-slate-300"}`}>{miktar}</span>
                                                <button 
                                                    onClick={() => sepeteEkle(urun)} 
                                                    className={`w-14 h-14 flex items-center justify-center font-black text-2xl transition-all ${miktar > 0 ? "bg-indigo-600 text-white" : "bg-white text-slate-800 hover:bg-slate-100"}`}
                                                >+</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* DESKTOP: Sağ Panel (Sipariş Sepeti) */}
            <div className="hidden lg:flex w-96 bg-slate-200/30 flex-col shrink-0 border-l-4 border-slate-300 shadow-[-20px_0_40px_rgba(0,0,0,0.04)] z-30 relative">
                <div className="h-20 border-b-2 border-slate-300 flex items-center px-10 shrink-0 bg-white/60">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sipariş Detayı</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 no-scrollbar">
                    {sepet.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <span className="text-5xl mb-4 drop-shadow-md">🛒</span>
                            <span className="text-[11px] font-black tracking-[0.2em] text-slate-700 uppercase drop-shadow-sm">SEPET BOŞ</span>
                        </div>
                    ) : (
                        sepet.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 group">
                                <div className="flex flex-col">
                                    <span className="font-outfit font-black text-slate-900 text-base tracking-tight">{item.isim}</span>
                                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">x{item.miktar} × {item.fiyat} ₺</span>
                                </div>
                                <div className="font-outfit font-black text-base text-slate-900 bg-slate-50 px-3 py-2 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                                    {item.fiyat * item.miktar} ₺
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-white shrink-0 border-t-2 border-slate-300 shadow-[0_-15px_40px_rgba(0,0,0,0.04)]">
                    <div className="flex flex-col gap-3">
                        {sepet.length > 0 && (
                            <div className="flex flex-col gap-1 px-1">
                                <div className="relative group flex items-center bg-white border-2 border-slate-300 rounded-xl px-4 py-3 shadow-sm focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                                    <span className="mr-2 text-slate-400 text-xs font-black uppercase tracking-widest">Nakit:</span>
                                    <input 
                                        type="number" 
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={alinanNakit}
                                        onChange={(e) => setAlinanNakit(e.target.value)}
                                        className="w-full bg-transparent border-none text-right text-base text-slate-900 font-outfit font-black outline-none placeholder:text-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="ml-2 text-slate-400 font-black text-xs">₺</span>
                                </div>

                                {alinanNakit && parseFloat(alinanNakit) > toplamTutar && (
                                    <div className="flex justify-between items-center text-[10px] text-green-400 font-bold tracking-tighter">
                                        <span className="opacity-50 uppercase">Para Üstü</span>
                                        <span className="text-sm">{(parseFloat(alinanNakit) - toplamTutar).toFixed(2)} ₺</span>
                                    </div>
                                )}

                                {alinanNakit && parseFloat(alinanNakit) > 0 && parseFloat(alinanNakit) < toplamTutar && (
                                    <div className="flex justify-between items-center text-[10px] text-red-400 font-bold tracking-tighter">
                                        <span className="opacity-50 uppercase">Eksik</span>
                                        <span className="text-sm">{(toplamTutar - parseFloat(alinanNakit)).toFixed(2)} ₺</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <button 
                            onClick={siparisiTamamla}
                            disabled={sepet.length === 0 || satisGonderiliyor}
                            className="group flex items-center justify-between w-full bg-slate-950 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white p-2 rounded-3xl transition-all active:scale-[0.98] shadow-2xl shadow-indigo-900/10"
                        >
                            <div className="bg-white/10 px-6 py-4 rounded-2xl flex flex-col items-start min-w-[120px]">
                                <span className="text-[10px] font-black opacity-50 leading-none mb-1.5 tracking-widest uppercase text-indigo-200">TOPLAM</span>
                                <span className="text-xl font-outfit font-black leading-none tracking-tight">{toplamTutar} ₺</span>
                            </div>
                            
                            <div className="flex-1 text-center font-outfit font-black text-sm tracking-[0.2em] pl-2 uppercase">
                                {satisGonderiliyor ? "..." : "Siparişi Onayla"}
                            </div>

                            <div className="w-14 h-14 flex items-center justify-center bg-indigo-600 text-white rounded-2xl text-2xl group-hover:translate-x-1 transition-transform shadow-lg shadow-indigo-600/20">
                                ➔
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* AYARLAR MODALI */}
            {ayarlarAcik && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                        <button onClick={() => setAyarlarAcik(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-xl font-bold">✕</button>
                        <h3 className="text-2xl font-bold text-gray-800 mb-6">⚙️ Ayarlar</h3>
                        
                        <div className="flex flex-col gap-4">
                            <button 
                                onClick={isletmedenAyril}
                                className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                                <span>⛔</span> İşletmeden Ayrıl
                            </button>
                            <button
                                onClick={cikisYap}
                                className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                                <span>🚪</span> Çıkış Yap
                            </button>
                            
                            <p className="text-xs text-gray-400 text-center mt-1">
                                Ayrıldığınızda patronunuzun ekranından silinirsiniz<br/>ve kasanız kapatılır.
                            </p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
