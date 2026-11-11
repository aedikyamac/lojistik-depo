# BOSCH WMS Command Center — Digital Twin

Grup 03 lojistik ödevi için hazırlanmış React + Three.js tabanlı depo yönetimi ve dijital ikiz demonstrasyonu.

## Gereksinimler

- Node.js 20 veya üzeri
- npm 10+
- NFC / ntfy köprüsü ve iPhone ekran eşleştirmesi için sunucuyu HTTPS üzerinden yayınlamak (localhost geliştirmede tarayıcı istisnası geçerlidir)

## Kurulum

```bash
npm install
cp .env.example .env
```

`.env` dosyasında `NTFY_TOPIC` ve `NFC_SHARED_SECRET` değerlerini kendinize özel, tahmin edilmesi zor değerlerle değiştirin. `NTFY_TOPIC` ntfy.sh üzerinde herkese açık bir kanal adı olabilir; özel veri göndermeyin.

## Geliştirme

İki terminal açın:

```bash
npm run server
```

```bash
npm run dev
```

Vite adresi: http://localhost:5173
Köprü API: http://localhost:8787

## Üretim

```bash
npm run build
npm start
```

Sunucu `PORT` (varsayılan 8787) üzerinden `dist/` dizinini ve API/WebSocket köprüsünü birlikte sunar.

## NFC etiketi kurulumu

1. `.env` içindeki `NFC_SHARED_SECRET` değerini belirleyin.
2. Web arayüzündeki **iPhone NFC Webhook** paneline aynı anahtarı girin; panel, .env anahtarının sunucuda ayarlı olup olmadığını bildirir.
3. Panelin oluşturduğu HTTPS `/nfc?step=auto&key=...` bağlantısını NDEF URL kaydı olarak NFC etikete yazın.
4. iPhone etiketi okuttuğunda URL açılır; Node köprüsü `NFC_SCAN` olayını ntfy topic'ine yayınlar.
5. Kontrol odası aynı topic'in SSE akışını dinler ve ilgili operasyonu tetikler.

> iPhone Safari standart Web NFC API sağlamaz. Etiketin URL açması yaklaşımı kullanılmaktadır. Gerçek sunucuya yayın yapabilmek için public HTTPS alan adı gerekir. Demo varsayılan topic ile herkese açık ntfy altyapısını kullanır; üretimde güçlü topic, HTTPS, hız sınırlaması ve kimlik doğrulama ekleyin.

## iPhone ekran paneli

Kontrol odasındaki QR kodu iPhone ile tarayın. Açılan mobil bağlantı sayfası ekran paylaşımı API'si kullanılabiliyorsa WebRTC oturumunu başlatır. iOS Safari'de `getDisplayMedia` sürüm ve cihaz desteğine bağlıdır; desteklenmiyorsa panel bunu açıkça belirtir ve önizleme modunda kalır. Farklı ağlar üzerinden gerçek zamanlı aktarım için STUN yanında TURN sunucusu gerekebilir. Geliştirme ortamında telefonun erişebilmesi için `localhost` yerine aynı ağdan erişilebilen HTTPS geliştirme alan adı kullanın.

## Kapsam / Demo verisi

- Altı operasyon animasyonları ve olay akışı
- Drive-In raflı 3B depo, tır kapakları, turret truck, ikmal asansörü, streçleme platformu
- Envanter arama ve stok durumu filtreleri
- Ders materyalleri ve yazdırılabilir ödev raporu
- 7/24 karanlık depo modu ve tersine lojistik barkod simülasyonu
- ntfy SSE dinleme / Node webhook yayınlama
- WebRTC sinyal sunucusu ile iPhone eşleştirme altyapısı

KPI ve envanter kayıtları örnek/simülasyon verileridir; gerçek WMS/ERP veya saha sensörü entegrasyonu değildir.
