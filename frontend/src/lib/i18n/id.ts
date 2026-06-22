import type { TranslationKey } from './index';

// Bahasa Indonesia translations. Must define every key in `en`.
export const id: Record<TranslationKey, string> = {
  // Language switcher
  'lang.label': 'Bahasa',
  'lang.english': 'English',
  'lang.indonesian': 'Bahasa Indonesia',

  // Navbar / auth
  'nav.login': 'Masuk',
  'nav.register': 'Daftar',
  'nav.logout': 'Keluar',

  // Landing page
  'landing.badge': 'Platform asesmen bertenaga AI',
  'landing.heroTitlePrefix': 'Ubah pengetahuan Anda menjadi',
  'landing.heroTitleHighlight': 'asesmen bertenaga AI',
  'landing.heroSubtitle':
    'Buat tes, hasilkan pertanyaan dengan AI, sajikan laporan yang dipersonalisasi, dan monetisasi keahlian Anda — semuanya dalam satu platform untuk mentor, pendidik, dan pelatih.',
  'landing.ctaCreate': 'Buat Asesmen',
  'landing.ctaDemo': 'Coba Asesmen Demo',
  'landing.featuresTitle': 'Semua yang Anda butuhkan untuk menilai dan memonetisasi',
  'landing.howTitle': 'Dirancang untuk kedua sisi asesmen',
  'landing.pricingTitle': 'Gratis untuk memulai, premium saat dibutuhkan',
  'landing.finalCtaTitle': 'Mulai buat asesmen AI hari ini',
  'landing.finalCtaSubtitle':
    'Bergabunglah dengan para mentor, pendidik, dan pelatih yang mengubah keahlian mereka menjadi asesmen interaktif bertenaga AI.',
  'landing.getStarted': 'Mulai gratis',

  // Assessment cards
  'assessment.free': 'Gratis',
  'assessment.start': 'Mulai Asesmen',
  'assessment.availableTitle': 'Asesmen Tersedia',

  // User dashboard
  'dashboard.welcome': 'Selamat datang kembali',
  'dashboard.overview': 'Berikut ringkasan asesmen dan laporan Anda.',
  'dashboard.tokenBalance': 'Saldo Token',
  'dashboard.topUp': 'Isi Token',
  'dashboard.toppingUp': 'Mengisi…',
  'dashboard.assessmentsTaken': 'Asesmen dikerjakan',
  'dashboard.reportsAvailable': 'Laporan tersedia',
  'dashboard.myAssessments': 'Asesmen Saya',
  'dashboard.exploreAssessments': 'Jelajahi Asesmen',
  'dashboard.colAssessment': 'Asesmen',
  'dashboard.colScore': 'Skor',
  'dashboard.colDate': 'Tanggal',
  'dashboard.colPremium': 'Premium',
  'dashboard.colReport': 'Laporan',
  'dashboard.viewReport': 'Lihat Laporan',
  'dashboard.unlocked': '✓ Terbuka',

  // Report page
  'report.preparing': 'Menyiapkan laporan Anda…',
  'report.summary': 'Ringkasan',
  'report.totalScore': 'Skor total',
  'report.yourResult': 'Hasil Anda',
  'report.reportType': 'LAPORAN',
  'report.premiumReport': 'Laporan Premium',
  'report.premiumUnlockedNote':
    '✓ Terbuka — berikut analisis personal Anda.',
  'report.premiumDescription':
    'Pelajari lebih dalam dengan uraian kekuatan, kekurangan, dan rencana 30 hari yang dipersonalisasi oleh AI.',
  'report.unlocking': 'Membuka…',
  'report.unlockCta': 'Buka Premium',
  'report.goDashboard': 'Ke dasbor',
  'report.backHome': 'Kembali ke beranda',

  // Levels (system-computed)
  'level.Beginner': 'Pemula',
  'level.Intermediate': 'Menengah',
  'level.Advanced': 'Mahir',
  'level.Completed': 'Selesai',

  // Take assessment
  'take.submit': 'Kirim',
  'take.submitting': 'Mengirim…',

  // Mentor / admin headings
  'mentor.dashboard': 'Dasbor Mentor',
  'admin.dashboard': 'Dasbor Admin',
};
