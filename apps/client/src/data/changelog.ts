/**
 * In-game changelog shown on the "Güncellemeler" screen so players can follow every update
 * from inside the game. Newest entry first. Bump APP_VERSION together with a new entry.
 */
export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  phase: number;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.2.0',
    date: '2026-11-03',
    phase: 2,
    title: 'Yeni Ana Menü ve Görsel Altyapı',
    highlights: [
      'Ana menü yeniden tasarlandı: sol menü, kanatlı logo, altın "OYUNA BAŞLA" butonu, oyun modu kartları, alt kısayollar.',
      'Sinematik menü sahnesi: gün batımı gökyüzü, ana gemi, eskort savaş uçakları, lazer atışları, şelaleler ve gezegen.',
      'Günlük Ödül sandığı: her gün 100 altın + 2 kristal (içeriği her zaman belli, şans/ganimet kutusu yok).',
      'Falcon X1 yeni renkler (beyaz/mavi/kırmızı), 4 motor ve kanat altı motor kapsülleri.',
      'Daha büyük ve detaylı Akademi Muhafızı ana gemisi.',
      'Profesyonel 3D model altyapısı: GLB/GLTF modeller, sıkıştırılmış dokular (Draco, Meshopt, KTX2), LOD ve yedek modeller.',
      'Sinematik görüntü: parlama (bloom), renk düzenleme, ACES ton eşleme, gökyüzünden yansımalar.',
      'Uyarlanabilir çözünürlük: oyun FPS düşerse görüntü kalitesini otomatik ayarlar (iPhone için).',
      'iPhone yatay mod için sadeleştirilmiş dokunmatik HUD, Dynamic Island güvenli alan desteği, yakınlaştırma hareketleri engellendi.',
      'Not: Gerçek detaylı uçak ve ana gemi modelleri henüz eklenmedi — dosyalar sağlandığında otomatik yüklenecek.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-11-03',
    phase: 1,
    title: 'Faz 1 — Oynanabilir Çekirdek',
    highlights: [
      'Oyun ilk kez havalandı! Tarayıcıda oynanabilen 3D hava savaşı.',
      'Falcon X1 başlangıç uçağı: eğilme animasyonu, motor alevleri ve iz efektleri.',
      'Sinematik takip kamerası, kamera sarsıntısı ve hız çizgileri.',
      'Gök Akademisi ortamı: kayan kanyon arazisi, bulutlar, sis ve dinamik gökyüzü.',
      'Kontroller: WASD/oklar, fare ile nişan, ateş, güdümlü füze, Shift ile atılma, E ile Seri Atış özel yeteneği, T ile hedef kilidi.',
      'Mobil dokunmatik kontroller: sanal joystick ve ateş/füze/özel/atılma/kilit butonları.',
      'Düşmanlar: keşif dronları, savaş jetleri (mermiden kaçabilir), ağır bombardıman uçağı.',
      'İlk görev "Akademi Uçuşu": 6 dalga ve 3 aşamalı Akademi Muhafızı boss savaşı.',
      'Boss "enerji duvarı" saldırısı önceden uyarılır ve güvenli yeşil boşluk gösterilir — kaçınılmaz hasar yok.',
      '11 farklı bonus: onarım, kalkan, çift hasar, üçlü ateş, füze, şimşek, hız, enerji, altın x2, yenilmezlik, özel şarj.',
      'Kombo çarpanı, skor, 3 yıldız değerlendirmesi, altın/TP/kristal ödülleri ve seviye atlama.',
      'İlerleme bu cihazda otomatik kaydedilir.',
      'Ayarlar: Düşük/Orta/Yüksek/Ultra grafik, ayrı müzik/efekt/arayüz sesi, zorluk, otomatik ateş, nişan yardımı, hassasiyet, solak düzen.',
      'Tamamen özgün, kod ile üretilen sesler ve modeller (lisans gerektiren dosya yok).',
      'Bu "Güncellemeler" ekranı eklendi: her yeniliği buradan takip edebilirsin.',
    ],
  },
];

export const APP_VERSION = CHANGELOG[0].version;

export interface RoadmapItem {
  phase: number;
  title: string;
  status: 'done' | 'next' | 'planned';
}

export const ROADMAP: RoadmapItem[] = [
  { phase: 1, title: 'Oynanabilir çekirdek: uçuş, ateş, düşmanlar, ilk görev', status: 'done' },
  { phase: 2, title: 'Görsel kalite: model altyapısı ve bloom hazır — detaylı 3D modeller bekleniyor', status: 'next' },
  { phase: 3, title: 'Kampanya: 10 bölüm × 10 görev, bosslar, günlük görevler', status: 'planned' },
  { phase: 4, title: '3D hangar, 8 uçak, 10 silah, geliştirme sistemi', status: 'planned' },
  { phase: 5, title: 'Çok oyunculu: 1v1 düello, ortak görevler, özel odalar', status: 'planned' },
  { phase: 6, title: 'Hesaplar, veritabanı, güvenlik, Docker, CI/CD', status: 'planned' },
  { phase: 7, title: 'Mobil: Android ve iOS sürümleri', status: 'planned' },
];
