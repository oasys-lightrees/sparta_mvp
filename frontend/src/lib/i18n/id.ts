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
  'landing.badge': 'Platform pengembangan diri',
  'landing.heroTitlePrefix': 'Latih kemampuan. Ukur kemajuan.',
  'landing.heroTitleHighlight': 'Jadi lebih kuat.',
  'landing.heroSubtitle':
    'SPARTA mengubah asesmen yang jujur menjadi laporan pertumbuhan AI dan rencana nyata — untuk individu, profesional, tim sales, dan para pelatih.',
  'landing.ctaCreate': 'Temukan level Anda',
  'landing.ctaDemo': 'Lihat cara kerjanya',
  'landing.problemTitle': 'Banyak orang hanya menebak posisi mereka.',
  'landing.problemBody':
    'Tanpa umpan balik yang jujur dan rencana yang jelas, pertumbuhan terhenti. Kursus umum tidak pernah menunjukkan kekuatan asli Anda — atau celah yang menghambat.',
  'landing.solutionTitle': 'SPARTA mengukurnya — lalu memberi Anda rencana.',
  'landing.solutionBody':
    'Kerjakan asesmen yang fokus, dapatkan gambaran objektif tentang posisi Anda, dan terima laporan pertumbuhan AI yang mengubah hasil menjadi langkah nyata.',
  'landing.featuresTitle': 'Semua yang Anda butuhkan untuk berlatih dan berkembang',
  'landing.howTitle': 'Latih. Ukur. Tingkatkan.',
  'landing.aiReportTitle': 'Laporan Pertumbuhan AI Anda',
  'landing.aiReportBody':
    'Lebih dari sekadar skor — cetak biru yang dipersonalisasi: kekuatan, celah, rekomendasi yang jelas, dan peta jalan 30 hari untuk menjadi lebih kuat.',
  'landing.pricingTitle': 'Gratis untuk memulai, premium saat dibutuhkan',
  'landing.finalCtaTitle': 'Cari tahu seberapa kuat Anda hari ini',
  'landing.finalCtaSubtitle':
    'Kerjakan asesmen pertama Anda, dapatkan laporan pertumbuhan AI, dan mulailah berlatih dengan tujuan.',
  'landing.getStarted': 'Temukan level Anda',

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
