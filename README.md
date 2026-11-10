Sihirli Sayılar — Çözüm Atlası sürümü

Bu sürüm bulmacanın **tüm çözümlerini** içerir: 6 parça (Z, Kare, P, T, I, L; döndürme ve aynalama serbest) 5×5 tahtaya tam **1.576** farklı şekilde yerleşir. Bunlar döndürme/aynalama simetrileri hariç **197** farklı desendir ve **25 hücrenin hepsi** (1–24 ve numarasız merkez) boş bırakılabilir.

| Boş hücre | Çözüm sayısı | Zorluk |
|---|---|---|
| 1, 5, 20, 24 (köşeler) | 118 | Kolay |
| 2, 4, 6, 10, 15, 19, 21, 23 | 67 | Kolay |
| 3, 11, 14, 22 | 54 | Orta |
| 8, 12, 13, 17 | 50 | Orta |
| Merkez | 32 | Zor |
| 7, 9, 16, 18 | 30 | Zor |

Yeni özellikler
- 📚 **Çözüm Atlası**: 5×5 ısı haritasında her hücrenin kaç çözümü olduğu görünür. Hücre seçince o hücreyi boş bırakan bütün çözümler tek tek veya galeri hâlinde gezilir; "Tahtaya uygula" ile tahtaya konur (↶ Geri al ile geri alınır). "Sadece tahtamdaki parçalara uyanlar" filtresi, mevcut tahtanla tamamlanabilecek çözümleri gösterir.
- 💡 **İpucu**: Her basışta bir parçayı doğru yerine koyar (en az seçeneği olan parçayı seçer). Tahtadaki diziliş hiçbir çözüme götürmüyorsa sorunlu parçayı geri alır. Bir zar meydan okuması açıksa ipucu o hedefe göre çalışır.
- 🎯 **Hedefe bağlı kontrol**: Zar menüsünden hedef seçildiyse "Kontrol et" artık o hücrenin boş kalmasını bekler; hedefin zorluğu ve çözüm sayısı gösterilir. Süre dolunca "Çözümleri gör" düğmesi çıkar.
- 🌐 **Çok oyunculu**: Hedef sayının zorluğu gösterilir. Atlas ve ipucu, hedef seçildiği andan oyuncu bitirene ya da süre dolana kadar kilitlidir; tur başında herkesin tahtası sıfırlanır. Tur bitince hedefin tüm çözümleri açılır ve oda sahibi aynı odada yeni tur hazırlayabilir.
- Düzeltme: Çıkarma işlemi artık 0 sonucunu (tahtada olmayan hücre) üretmiyor.

Yeni dosyalar
- `solutions.js` — Tüm çözümler (otomatik üretilir, ~45 KB).
- `solutions-ui.js` — Çözüm Atlası ve İpucu.
- `tools/solve.js` — Çözücü. Parçalar değişirse `node tools/solve.js` ile `solutions.js` yeniden üretilir.
- `supabase-solutions-patch.sql` — Sunucu yaması (aşağıya bakın).

Sunucu yaması (bir kez çalıştırın)
Supabase SQL Editor'de `supabase-solutions-patch.sql` dosyasını çalıştırın (database.sql ve supabase-completion-patch.sql'den sonra; tekrar çalıştırmak güvenlidir). Yama:
- Parça şekillerini sunucuda doğrular: tam 6 parça, her biri kendi şeklinin 8 yöneliminden biri olmalı (önceki "bilinen sınır" kapandı). 1.576 çözümün tamamı bu doğrulamadan geçer, şekli bozulmuş tahtalar reddedilir.
- Süre kontrolünü geri getirir; süresi dolan tur otomatik "bitti" olur.
- İlk tamamlayanı kazanan olarak kaydeder, oda herkes bitirene kadar açık kalır.
- Biten odada yeni hedef seçilince oda yeniden "bekliyor" durumuna geçer.
- Turu başlatırken hedefi istemciden değil sunucudaki kayıttan alır.

Yeni istemci, yama çalıştırılmadan da çalışır; yalnızca "Yeni tur için sayı seç" düğmesi yama olmadan hata verir.

---

Çok Oyunculu MVP (önceki notlar)

https://mehmetdoqan.github.io/SihirliSayilarMulti/
Bu paket, mevcut Sihirli Sayılar HTML oyununa 2–4 kişilik, oda koduyla katılınan internet üzerinden yarışma prototipi ekler.

Paket içeriği
index.html — Tek oyunculu oyun + çok oyunculu lobi + Çözüm Atlası
multiplayer.js — Oda oluşturma/katılma, oda durumu, oyuncu listesi, tahta kaydetme ve sonuç gönderme
database.sql — Supabase tabloları ve RPC fonksiyonları
README.md — Kurulum talimatları
Çok oyunculu özellikler
2–4 oyunculu oda; oda koduyla katılma
Oda sahibinin tur başlatması
Her oyuncunun kendi tahtasında oynaması
Oyuncu tahtasının hamlelerde Supabase'e kaydedilmesi
Sunucu saatine bağlı ortak başlangıç zamanı ve 2/3/5 dakikalık sayaç
Sunucu tarafında 25 hücre, taşma, çakışma ve boş hücre cevabı kontrolü
İlk geçerli cevabın kazanan olarak kaydedilmesi
Oda oyuncularının ve kazananın yaklaşık 1,8 saniyede bir yenilenmesi
Kurulum
1. Supabase projesi oluşturun
Supabase hesabınızda yeni bir proje oluşturun. Projenin Project URL ve anon / publishable anahtarını alın.

2. Veritabanını kurun
Supabase panelinde SQL Editor bölümünü açın. Bu paketteki database.sql dosyasının tamamını yapıştırıp çalıştırın.

Bu SQL, odalar ve oyuncular tablolarını, doğrudan tablo erişimini kapatan RLS ayarlarını ve uygulamanın kullandığı RPC fonksiyonlarını oluşturur.

3. Bağlantı bilgilerini girin
index.html dosyasını web sunucusu üzerinden açın (aşağıdaki yerel test bölümüne bakın). Çok oyunculu düğmesine basın ve şunları girin:

Supabase Project URL
Anon / publishable key
Bağlantıyı kaydet düğmesine basın. Bilgiler yalnızca o tarayıcının localStorage alanında saklanır. service_role anahtarını kesinlikle kullanmayın.

4. Oyuncularla deneyin
İlk cihazda Oda oluştur seçeneğine basın.
Oluşan 6 karakterli kodu diğer oyunculara gönderin.
Diğer cihazlarda aynı URL'yi açıp kodla katılın.
En az iki oyuncu odadayken oda sahibi Turu başlat seçeneğine basar.
Her oyuncu kendi tahtasını tamamlar, boş hücre cevabını seçer ve Kontrol et düğmesine basar. Doğru cevap veritabanına gönderildiğinde ilk geçerli sonuç kazanan olur.
Yerel test
Tarayıcı güvenlik ayarları nedeniyle file:// üzerinden açmak yerine yerel HTTP sunucusu kullanın. Python kuruluysa proje klasöründe:

python -m http.server 8000
Sonra http://localhost:8000 adresini açın. İnternet üzerinden test etmek için klasörü HTTPS destekleyen statik bir barındırma hizmetine yükleyin. index.html, multiplayer.js ve (kurulum için) database.sql dosyalarını birlikte saklayın.

Bilinen sınırlar
Bu, ilk çalıştırılabilir MVP'dir; oda listesi, hesap sistemi, sohbet, turnuva geçmişi ve yeniden bağlanınca tahtayı otomatik geri yükleme henüz yoktur.
Oyuncu kimliği sekme oturumunda saklanır. Sekme tamamen kapanırsa aynı oyuncu oturumu devam etmeyebilir.
Tur sorusu şu an çok oyunculu modda “Boş hücrenin numarasını bul” olarak sabitlenmiştir. Tek oyunculu zar menüsündeki tüm yöntemler korunur ancak çok oyunculu turda henüz seçim ekranına bağlanmamıştır.
Sunucu, yerleşim koordinatlarının sınırlarını, hücre çakışmalarını, toplam 24 dolu hücreyi ve gönderilen boş hücre cevabını doğrular. Parça şekilleri artık supabase-solutions-patch.sql ile sunucuda doğrulanır. Kullanıcı kimlik doğrulaması hâlâ sonraki aşamadadır.
Aynı anda gelen sonuçlarda veritabanındaki oda satırı kilitlenerek ilk geçerli gönderim kazanan olarak kaydedilir.
Güvenlik
anon / publishable anahtarı tarayıcıda kullanılmak üzere tasarlanmıştır; yetkiler RLS ve RPC fonksiyonlarıyla sınırlanmalıdır. service_role veya başka bir gizli anahtarı istemci koduna koymayın. SQL'i yalnızca kendi Supabase projenizde çalıştırın.

Teknolojiler
HTML, CSS, JavaScript, Supabase Postgres ve Supabase RPC.
