# Kurumsal Fire ve Stok Analiz Paneli Geliştirmesi

Kullanıcının (Patronun) stoktaki uyuşmazlıkları (kaçak, fire, fazla) daha gerçekçi ve denetlenebilir bir şekilde görebilmesi için "Stok ve Analiz" ekranı basit kartlardan çıkarılıp tam teşekküllü bir **Audit (Denetim) Dashboard'una** dönüştürülecektir.

## User Review Required

> [!WARNING]  
> Veritabanında kritik bir yapısal değişiklik yapacağız. Eskiden sadece personelin saydığı miktar kaydediliyordu. Artık personelin saydığı an *Sistemin o esnadaki beklentisi* de (snapshot) kayıt altına alınacak. Böylece "1 ay önceki sayımda fire var mıydı?" sorusu %100 netlikle görülebilecek.

## Proposed Changes

### Veritabanı (Schema)
`stok_sayimlari` tablosuna sayım sırasındaki beklenen değeri tutmak için yeni bir sütun eklenecektir.

#### [NEW] SQL Query (Run via Supabase SQL Editor)
```sql
ALTER TABLE stok_sayimlari ADD COLUMN sistem_beklentisi NUMERIC(10, 2) DEFAULT 0;
```

---

### Personel Paneli Güncellemesi

#### [MODIFY] app/personel/dashboard/page.jsx
- Gün sonu kaydetme (stokSayimiKaydet) metodunda, personelin saydığı değere ek olarak o anki `sistem_beklentisi` (stokKartlari'ndaki mevcut_miktar) de eklenecek.
- Böylece veritabanı, o saat ve dakikada sistemin beklentisi ile personelin sayımını kalıcı olarak mühürleyecek.

---

### Patron Paneli (Stok Dashboard Revizyonu)

#### [MODIFY] app/patron/dashboard/[subeAd]/page.jsx
Patron dashboard'unda "Stok" alt sekmesi tamamen yenilenecektir.
1. **Analitik Üst Başlık ve Filtreleme:**
   - Bugün / Dün / Son 7 Gün gibi zaman filtreleme düğmeleri eklenecek.
2. **Üst Özet Kartları (KPI):**
   - **Toplam Fire:** (Sistem > Sayım olanların toplam eksik adedi)
   - **Toplam Fazla:** (Sayılan > Sistem olanların toplam fazla adedi)
   - **Son Denetim:** "Bugün 18:45" gibi son sayımın yapıldığı an gösterilecek.
3. **Anlık Durum ve Kapsamlı Geçmiş Tablosu (Data Table):**
   - **Anlık Durum:** Mevcut stok kartlarının kartlar halinde basit izlenimi.
   - **Sayım Geçmişi (Denetim Logları):** Hangi saatte, Hangi Personel, Hangi ürünü saydı; sistem ne bekliyordu, personel ne buldu? Her bir log satır satır dökülecek.

## Örnek (Hedeflenen) Arayüz
Patron bu panele girdiğinde sadece "Şu anda Su: 5" görmeyecek. Şunu görecek:
* **Dün 23:00** - Ahmet (Personel) Su sayımı yaptı: *Sistem 10 beklerken Ahmet 5 saydı.* 🚨 (-5 Fire yazıldı)
* **Bugün 16:00** - Mehmet Kola sayımı yaptı: *Sistem 20 beklerken Mehmet 20 saydı.* ✅ (Kayıp Yok)

## Open Questions
- Patron panelindeki sayım geçmişi tablosunda "Personel İsimleri" görünsün mü? (Şu anda sisteme personel auth_id'si ekleniyor ama `users` tablomuzda birleşik personelleri çözebiliriz.)
- Tablonun çok uzamaması için ilk etapta "Son 50 Sayım Logu" şeklinde sınırlayalım mı?

## Verification Plan
1. Supabase üzerinden sütun eklenecek.
2. Personel panelinden sahte bir stok girilecek. Supabase'e gidildiğinde `sistem_beklentisi` ve `sayilan_miktar` yan yana dolmuş mu incelenecek.
3. Patron paneline girilecek ve "Stok ve Analiz" sekmesinde bu sahte sayımın "Geçmiş Loglar" olarak tabloda göründüğü, fire/fazla miktarının log satırında başarıyla hesaplandığı doğrulanacak.












sabah sayımı sadece 1 kere yapılıcak başladığımız için. örneğin sabah dükkana sadece bir kereliğine sayım yapıcaz (lipton: 50, Cola: 30) sonra personel sipariş aldıktan sonra kaç tane satıldığını da görücez, kaç tane satıldığına göre stok ekranında az kaldığının uyarısı verilicek, tedarikçi ve ya toptancı bize içecekleri getirdiğinde hangi içecekten kaç adet geldiğini patron stok sekmesinden ürüne ekle butonuna basarak dolapta ki toplam adeti girmiş olucak.

yani kısaca personel arayüzünden stok sistemini tamamen kaldır personel stok girmicek sadece siparişleri giricek, patron stok panelinden ürün koyucak ve bu üründen şuanda kaç tane olduğunu giricek, müşteri ürünü sipariş ettiğinde personel bunu POS sisteminden giricek girdiğinde ise patron stok panelinden hangi üründen kaç tane kaldığını görebilicek ve sistem buna göre uyarı verebilicek ayrıca toptancı gelince 50 adet Lipton getirdiğini düşünelim patron bu durumda güncel adeti tekrar saymıycak zaten stok bölümünde kaç tane lipton satıldığı yazıyor sadece toptancının getirdiği ürünün sayısını eklicek ve stok sayısını güncellicek