"use client";
import { useEffect, useState } from "react";
import { supabasePersonel as supabase } from "../supabasePersonel";

export default function PersonelPanel() {
    const [yukleniyor, setYukleniyor] = useState(true);
    const [kullanici, setKullanici] = useState(null);
    const [isletmeler, setIsletmeler] = useState([]);
    const [arama, setArama] = useState("");
    const [seciliIsletme, setSeciliIsletme] = useState(null);
    const [subeler, setSubeler] = useState([]);
    const [basvuruDurumu, setBasvuruDurumu] = useState(null);

    const [mevcutBasvuru, setMevcutBasvuru] = useState(null);
    const [bildirimAcik, setBildirimAcik] = useState(false);

    useEffect(() => {
        const oturumKontrol = async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                window.location.href = "/personel/giris";
            } else {
                const { data: userData } = await supabase.from("users").select("ad_soyad").eq("auth_id", data.session.user.id).single();
                setKullanici({ ...data.session.user, ad_soyad: userData?.ad_soyad || data.session.user.email.split('@')[0] });
                
                const { data: basvuruListesi } = await supabase
                    .from("basvurular")
                    .select("*")
                    .eq("personel_id", data.session.user.id);

                if (basvuruListesi && basvuruListesi.length > 0) {
                    const kabulEdilmis = basvuruListesi.find(b => b.durum === "kabul");
                    
                    if (kabulEdilmis) {
                        window.location.href = "/personel/dashboard";
                        return;
                    }

                    const baskaDurum = basvuruListesi.find(b => b.durum === "bekliyor" || ((b.durum === "red" || b.durum === "kovuldu" || b.durum === "ayrildi") && !localStorage.getItem(`gizlenen_basvuru_${b.id}`)));
                    if (baskaDurum) {
                        setMevcutBasvuru(baskaDurum);
                    }
                }

                isletmeleriGetir();
                setYukleniyor(false);
            }
        };
        oturumKontrol();
    }, []);

    useEffect(() => {
        if (!kullanici) return;

        const channel = supabase
            .channel('personel-basvuru-takip')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'basvurular', filter: `personel_id=eq.${kullanici.id}` },
                (payload) => {
                    const yeniDurum = payload.new.durum;
                    if (yeniDurum === 'kabul') {
                        window.location.href = "/personel/dashboard";
                    } else if (yeniDurum === 'red' || yeniDurum === 'kovuldu' || yeniDurum === 'ayrildi') {
                        setMevcutBasvuru(payload.new);
                    }
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [kullanici]);

    const isletmeleriGetir = async () => {
        const { data } = await supabase
            .from("businesses")
            .select("id, isim, patron_id");

        if (!data) return;

        const isletmelerWithPatron = await Promise.all(
            data.map(async (isletme) => {
                const { data: patronData } = await supabase
                    .from("users")
                    .select("ad_soyad, telefon")
                    .eq("auth_id", isletme.patron_id)
                    .single();

                return {
                    ...isletme,
                    patron_adi: patronData?.ad_soyad || "Bilinmiyor",
                    patron_telefon: patronData?.telefon || ""
                };
            })
        );

        setIsletmeler(isletmelerWithPatron);
    };

    const isletmeyeTikla = async (isletme) => {
        setSeciliIsletme(isletme);
        const { data } = await supabase
            .from("branches")
            .select("*")
            .eq("business_id", isletme.id);
        setSubeler(data || []);
    };

    const basvur = async (subeId) => {
        if (mevcutBasvuru) return;

        const { data, error } = await supabase.from("basvurular").insert({
            personel_id: kullanici.id,
            sube_id: subeId,
            durum: "bekliyor",
        }).select();

        if (error) {
            setBasvuruDurumu("hata");
        } else {
            setBasvuruDurumu("basarili");
            if (data && data.length > 0) {
                setMevcutBasvuru(data[0]);
            }
        }
    };

    const basvuruyuIptalEt = async () => {
        if (!mevcutBasvuru) return;

        const { error } = await supabase.from("basvurular").delete().eq("id", mevcutBasvuru.id);
        
        if (error) {
            alert("İptal edilirken bir hata oluştu: " + error.message);
            return;
        }

        setMevcutBasvuru(null);
        setBasvuruDurumu(null);
        setBildirimAcik(false);
    };

    const redBildiriminiGizle = () => {
        if (!mevcutBasvuru) return;
        localStorage.setItem(`gizlenen_basvuru_${mevcutBasvuru.id}`, "true");
        setMevcutBasvuru(null);
        setBasvuruDurumu(null);
        setBildirimAcik(false);
    };

    const cikisYap = async () => {
        const onay = window.confirm("Çıkış yapmak istediğinize emin misiniz?");
        if (onay) {
            await supabase.auth.signOut();
            window.location.href = "/";
        }
    };

    const filtrelenmisIsletmeler = isletmeler.filter((i) =>
        i.isim.toLowerCase().includes(arama.toLowerCase()) || 
        i.patron_adi.toLowerCase().includes(arama.toLowerCase())
    );

    if (yukleniyor) {
        return (
            <div className="h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Hazırlanıyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-inter selection:bg-indigo-100 selection:text-indigo-900 pb-20">
            
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/20 rounded-full blur-[120px]"></div>
            </div>

            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-indigo-500/10 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center h-16 sm:h-20">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-base sm:text-xl shadow-lg shadow-indigo-200">👤</div>
                    <h1 className="text-lg sm:text-2xl font-outfit font-black text-slate-900 tracking-tight">Tezgah <span className="text-indigo-600 font-medium">Ekip</span></h1>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="relative">
                        <button 
                            onClick={() => setBildirimAcik(!bildirimAcik)} 
                            className={`p-2.5 sm:p-3 rounded-2xl transition-all relative ${bildirimAcik ? "bg-indigo-50 text-indigo-600 shadow-sm" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                            <span className="text-xl leading-none">🔔</span>
                            {mevcutBasvuru && (
                                <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 bg-red-500 w-2.5 h-2.5 rounded-full border-2 border-white"></span>
                            )}
                        </button>

                        {bildirimAcik && (
                            <>
                                <div className="sm:hidden fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm" onClick={() => setBildirimAcik(false)}></div>
                                <div className="fixed sm:absolute left-4 right-4 top-1/2 -translate-y-1/2 sm:top-full sm:left-auto sm:right-0 sm:translate-y-0 sm:mt-3 sm:w-[400px] bg-white border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.1)] rounded-2xl sm:rounded-3xl p-5 sm:p-6 z-[70] animate-in fade-in zoom-in-95 sm:origin-top-right max-h-[85vh] overflow-y-auto">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Bildirim Merkezi</h3>
                                
                                {!mevcutBasvuru ? (
                                    <div className="py-8 text-center bg-slate-50 rounded-2xl">
                                        <p className="text-xs font-bold text-slate-400">Her şey yolunda, bildirim yok.</p>
                                    </div>
                                ) : mevcutBasvuru.durum === "bekliyor" ? (
                                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 shadow-sm">
                                        <div className="flex items-center gap-3 mb-2 text-amber-700">
                                            <span className="text-xl">⏳</span>
                                            <p className="text-sm font-black uppercase tracking-tight">Başvuru Değerlendiriliyor</p>
                                        </div>
                                        <p className="text-xs text-amber-600/80 mb-4 font-medium leading-relaxed">Başvurunuz işletme sahibine ulaştı. Onaylandığında otomatik olarak kasa sayfasına yönlendirileceksiniz.</p>
                                        <button onClick={basvuruyuIptalEt} className="text-[10px] font-black uppercase tracking-widest bg-white text-amber-700 px-4 py-2.5 rounded-xl border border-amber-200 hover:bg-amber-100 transition-all shadow-sm">
                                            Başvuruyu Geri Çek
                                        </button>
                                    </div>
                                ) : (mevcutBasvuru.durum === "red" || mevcutBasvuru.durum === "kovuldu") ? (
                                    <div className="bg-red-50 rounded-2xl p-5 border border-red-100 shadow-sm">
                                        <div className="flex items-center gap-3 mb-2 text-red-700">
                                            <span className="text-xl">⛔</span>
                                            <p className="text-sm font-black uppercase tracking-tight">İşlem Reddedildi</p>
                                        </div>
                                        <p className="text-xs text-red-600/80 mb-4 font-medium leading-relaxed">Maalesef başvurunuz olumsuz sonuçlandı veya mevcut yetkiniz kaldırıldı. Tekrar başvuru yapabilirsiniz.</p>
                                        <button onClick={redBildiriminiGizle} className="text-[10px] font-black uppercase tracking-widest bg-white text-red-600 px-4 py-2.5 rounded-xl border border-red-200 hover:bg-red-100 transition-all shadow-sm">
                                            Kapat ve Gizle
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3 mb-2 text-slate-700">
                                            <span className="text-xl">ℹ️</span>
                                            <p className="text-sm font-black uppercase tracking-tight">Sistem Çıkışı</p>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">İşletme ile olan ilişiğiniz sonlandırıldı. Yeni başvurular için hazırsınız.</p>
                                        <button onClick={redBildiriminiGizle} className="text-[10px] font-black uppercase tracking-widest bg-white text-slate-600 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all shadow-sm">
                                            Tamamdır
                                        </button>
                                    </div>
                                )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="hidden sm:flex items-center gap-3 bg-slate-50 border border-slate-100 pl-4 py-1.5 pr-1.5 rounded-full shadow-sm hover:shadow-md transition-all cursor-default">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-slate-900 tracking-tight leading-none truncate max-w-[150px]">{kullanici?.ad_soyad}</span>
                            <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                                Aktif Personel
                            </span>
                        </div>
                        <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-600/30 uppercase tracking-widest">
                            {kullanici?.ad_soyad ? kullanici.ad_soyad.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase() : "P"}
                        </div>
                    </div>

                    <div className="w-px h-8 bg-slate-200"></div>

                    <button onClick={cikisYap} className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                        <span className="text-xl leading-none">🚪</span>
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8 relative z-10">

                {!seciliIsletme ? (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-10 text-center sm:text-left">
                            <h2 className="text-4xl font-outfit font-black text-slate-900 mb-3 tracking-tight">İşletme Seçin</h2>
                            <p className="text-slate-400 text-sm font-medium">Kayıtlı işletmeleri arayın ve çalışmak istediğiniz yere başvurun.</p>
                        </div>

                        <div className="relative mb-10 group">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl group-focus-within:scale-110 transition-transform">🔍</span>
                            <input
                                type="text"
                                placeholder="İşletme veya patron adı ile ara..."
                                value={arama}
                                onChange={(e) => setArama(e.target.value)}
                                className="w-full bg-white border-2 border-slate-300 rounded-3xl pl-16 pr-6 py-5 outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-600 text-slate-900 font-extrabold shadow-md transition-all text-xl placeholder:text-slate-400"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filtrelenmisIsletmeler.length === 0 ? (
                                <div className="col-span-full py-20 text-center bg-slate-200/50 border-4 border-dashed border-slate-300 rounded-[3rem]">
                                    <p className="text-5xl mb-4 drop-shadow-md">🔍</p>
                                    <p className="text-slate-700 font-black uppercase tracking-[0.2em] drop-shadow-sm">İşletme bulunamadı</p>
                                </div>
                            ) : (
                                filtrelenmisIsletmeler.map((isletme) => (
                                    <div key={isletme.id}
                                        onClick={() => isletmeyeTikla(isletme)}
                                        className="soft-card bg-white p-6 cursor-pointer border-2 border-slate-300 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-600/20 transition-all group relative overflow-hidden flex flex-col justify-center h-44">
                                        
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="w-12 h-12 bg-slate-50 flex items-center justify-center text-2xl rounded-2xl group-hover:bg-indigo-50 group-hover:scale-110 transition-all shadow-sm">🏢</div>
                                            <span className="text-2xl text-slate-200 group-hover:text-indigo-500 transition-all font-outfit font-black">→</span>
                                        </div>

                                        <h3 className="text-xl font-outfit font-black text-slate-900 group-hover:text-indigo-700 transition-colors tracking-tight line-clamp-1">{isletme.isim}</h3>
                                        
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-xs">👤</span>
                                                <span className="text-xs font-bold text-slate-400 truncate tracking-tight">{isletme.patron_adi}</span>
                                            </div>
                                            {isletme.patron_telefon && (
                                                <div 
                                                    onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${isletme.patron_telefon.replace(/\D/g, "")}`, "_blank"); }}
                                                    className="flex items-center gap-1.5 hover:bg-indigo-50 px-2 py-0.5 rounded-lg transition-colors group/phone"
                                                >
                                                    <span className="text-xs">📞</span>
                                                    <span className="text-[10px] font-black text-indigo-600/70 group-hover/phone:text-indigo-600 uppercase tracking-widest">{isletme.patron_telefon}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                ) : (
                    <section className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <button onClick={() => { setSeciliIsletme(null); setBasvuruDurumu(null); }}
                            className="inline-flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-900 transition-all mb-8 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
                            <span className="text-base leading-none">←</span> Geri Dön
                        </button>

                        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-[0_32px_120px_rgba(0,0,0,0.05)] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[6rem] opacity-50"></div>
                            
                            <div className="relative z-10 mb-10">
                                <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-4">Şube Listesi</span>
                                <h2 className="text-4xl font-outfit font-black text-slate-900 mb-2 tracking-tight">{seciliIsletme.isim}</h2>
                                <p className="text-slate-400 text-sm font-medium">Bünyesindeki aktif şubelerden birini seçerek başvuru yapın.</p>
                            </div>

                            <div className="flex flex-col gap-4">
                                {subeler.length === 0 ? (
                                    <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                        <p className="text-slate-400 font-bold">Bu işletmede henüz aktif şube bulunmuyor.</p>
                                    </div>
                                ) : (
                                    subeler.map((sube) => {
                                        const buSubeyeBasvurulmus = mevcutBasvuru?.sube_id === sube.id;

                                        return (
                                            <div key={sube.id} className="bg-slate-50/50 hover:bg-white border border-slate-100/50 hover:border-indigo-200 rounded-[2rem] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:shadow-xl group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-all">📍</div>
                                                    <div>
                                                        <h3 className="font-outfit font-black text-slate-800 text-lg tracking-tight group-hover:text-indigo-700 transition-colors uppercase">{sube.isim}</h3>
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aktif Şube</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => basvur(sube.id)}
                                                    disabled={mevcutBasvuru !== null}
                                                    className={`px-8 py-3.5 rounded-2xl font-outfit font-black uppercase tracking-widest transition-all shadow-sm ${
                                                        mevcutBasvuru 
                                                        ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                                                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 active:scale-95"
                                                    }`}>
                                                    {buSubeyeBasvurulmus ? "Başvuruldu" : "Başvur"}
                                                </button>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}