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
  'landing.badge': 'Akademi Asesmen Modern',
  'landing.heroTitlePrefix': 'Kenali diri. Latih potensi Anda.',
  'landing.heroTitleHighlight': 'Jadi lebih kuat.',
  'landing.heroSubtitle':
    'Setiap pelajar butuh umpan balik; setiap transformasi dimulai dari pengukuran. LATO mengubah asesmen yang jujur menjadi Cetak Biru Pertumbuhan — dan rencana untuk menjalankannya.',
  'landing.ctaCreate': 'Mulai latihan Anda',
  'landing.ctaDemo': 'Lihat cara kerjanya',
  // Hero blueprint preview
  'landing.blueprintTitle': 'Cetak Biru Pertumbuhan',
  'landing.metricStrength': 'Kekuatan',
  'landing.metricDiscipline': 'Disiplin',
  'landing.metricPotential': 'Potensi',
  'landing.problemTitle': 'Banyak orang hanya menebak posisi mereka.',
  'landing.problemBody':
    'Tanpa umpan balik yang jujur dan rencana yang jelas, pertumbuhan terhenti. Kursus umum tidak pernah menunjukkan kekuatan asli Anda — atau celah yang menghambat.',
  'landing.solutionTitle': 'LATO mengukurnya — lalu memberi Anda rencana.',
  'landing.solutionBody':
    'Terima tantangan latihan, dapatkan gambaran objektif tentang posisi Anda, dan terima Cetak Biru Pertumbuhan yang mengubah hasil menjadi langkah nyata.',
  'landing.featuresTitle': 'Semua yang Anda butuhkan untuk berlatih dan berkembang',
  'landing.howTitle': 'Latih. Ukur. Tingkatkan.',
  'landing.pricingTitle': 'Gratis untuk memulai, isi saldo untuk tantangan berbayar',
  'landing.finalCtaTitle': 'Cari tahu seberapa kuat Anda hari ini',
  'landing.finalCtaSubtitle':
    'Terima tantangan pertama Anda, klaim Cetak Biru Pertumbuhan, dan mulailah berlatih dengan tujuan.',
  'landing.getStarted': 'Mulai latihan Anda',

  // Assessment cards (tantangan yang Anda terima)
  'assessment.free': 'Gratis',
  'assessment.start': 'Lihat asesmen',
  'assessment.challengeTag': 'Tantangan',
  'assessment.availableTitle': 'Tantangan Latihan',

  // User dashboard (pusat komando)
  'dashboard.commandCenter': 'Pusat Komando',
  'dashboard.welcome': 'Selamat datang kembali',
  'dashboard.overview':
    'Perjalanan pertumbuhan Anda berlanjut — pilih tantangan berikutnya.',
  'dashboard.balance': 'Saldo Dompet',
  'dashboard.topUp': 'Isi Saldo',
  'dashboard.toppingUp': 'Mengisi…',
  'dashboard.assessmentsTaken': 'Tantangan Selesai',
  'dashboard.reportsAvailable': 'Laporan',
  'dashboard.myAssessments': 'Perjalanan Pertumbuhan Anda',
  'dashboard.exploreAssessments': 'Tantangan Latihan',
  'dashboard.colAssessment': 'Tantangan',
  'dashboard.colScore': 'Indeks Kekuatan',
  'dashboard.colDate': 'Tanggal',
  'dashboard.colReport': 'Cetak Biru',
  'dashboard.viewReport': 'Lihat Cetak Biru',
  'dashboard.unlocked': '✓ Terbuka',

  // Report page (cetak biru pertumbuhan Anda)
  'report.preparing': 'Menyiapkan cetak biru Anda…',
  'report.blueprintEyebrow': 'Cetak Biru Pertumbuhan Anda',
  'report.rank': 'Peringkat',
  'report.summary': 'Ringkasan',
  'report.totalScore': 'Indeks Kekuatan',
  'report.yourResult': 'Hasil Anda',
  'report.reportType': 'CETAK BIRU',
  'report.studyVideoTitle': 'Video pembuka',
  'report.studyVideoDescription':
    'Video pembuka dari ahli Anda untuk asesmen ini.',
  'report.resourcesTitle': 'Sumber Belajar',
  'report.resourcesPathTitle': 'Jalur Belajar Personal Anda',
  'report.resourcesDescription':
    'Materi pilihan yang sesuai dengan hasil Anda untuk membantu menindaklanjutinya.',
  'report.goDashboard': 'Ke pusat komando',
  'report.backHome': 'Kembali ke beranda',

  // Levels / ranks (system-computed)
  'level.Beginner': 'Pemula',
  'level.Intermediate': 'Menengah',
  'level.Advanced': 'Mahir',
  'level.Completed': 'Selesai',

  // Take assessment
  'take.submit': 'Kirim',
  'take.submitting': 'Mengirim…',

  // Expert / admin headings
  'mentor.dashboard': 'Dasbor Ahli',
  'admin.dashboard': 'Dasbor Admin',
};
