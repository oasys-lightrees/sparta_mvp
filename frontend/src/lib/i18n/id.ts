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
    'Setiap pelajar butuh umpan balik; setiap transformasi dimulai dari pengukuran. LATO mengubah asesmen yang jujur menjadi Cetak Biru Pertumbuhan, dan rencana untuk menjalankannya.',
  'landing.ctaCreate': 'Mulai latihan Anda',
  'landing.ctaDemo': 'Lihat cara kerjanya',
  // Hero blueprint preview
  'landing.blueprintTitle': 'Cetak Biru Pertumbuhan',
  'landing.metricStrength': 'Kekuatan',
  'landing.metricDiscipline': 'Disiplin',
  'landing.metricPotential': 'Potensi',
  'landing.problemTitle': 'Banyak orang hanya menebak posisi mereka.',
  'landing.problemBody':
    'Tanpa umpan balik yang jujur dan rencana yang jelas, pertumbuhan terhenti. Kursus umum tidak pernah menunjukkan kekuatan asli Anda, atau celah yang menghambat.',
  'landing.solutionTitle': 'LATO mengukurnya, lalu memberi Anda rencana.',
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
    'Perjalanan pertumbuhan Anda berlanjut. Pilih tantangan berikutnya.',
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
  // User dashboard — results empty state + team vouchers
  'dashboard.emptyResultsTitle': 'Selesaikan asesmen untuk mendapatkan wawasan',
  'dashboard.emptyResultsDesc':
    'Ikuti asesmen di bawah dan hasil serta laporan personal Anda akan muncul di sini.',
  'dashboard.teamVouchers': 'Voucher tim',
  'dashboard.teamVouchersDesc':
    'Beli paket kode voucher untuk tim Anda, bagikan, dan tinjau hasil setiap orang di sini.',
  'dashboard.buyVoucherFor': 'Beli kode voucher untuk',
  'dashboard.selectAssessment': 'Pilih asesmen…',
  'dashboard.buyVoucherCodes': 'Beli kode voucher',
  'dashboard.vCompany': 'Perusahaan',
  'dashboard.vAssessment': 'Asesmen',
  'dashboard.vRedeemed': 'Ditukarkan',
  'dashboard.vPurchased': 'Dibeli',
  'dashboard.vManage': 'Kelola',
  'dashboard.viewResults': 'Lihat hasil',
  'dashboard.noAssessments': 'Belum ada asesmen tersedia',

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

  // Expert dashboard home
  'mentor.subtitle': 'Buat dan kelola asesmen, pertanyaan, dan hasil Anda.',
  'mentor.createAssessment': 'Buat asesmen',
  'mentor.newAssessment': 'Asesmen baru',
  'mentor.create': 'Buat',
  'mentor.statTotal': 'Total Asesmen',
  'mentor.statPublished': 'Asesmen Terbit',
  'mentor.statTaken': 'Total Peserta Tes',
  'mentor.statAvgScore': 'Skor Rata-rata',
  'mentor.emptyTitle': 'Buat asesmen pertama Anda',
  'mentor.emptyDesc':
    'Bangun asesmen, tambahkan pertanyaan, dan mulai kumpulkan tanggapan serta pendapatan.',
  // Expert assessment table
  'mentor.colTitle': 'Judul',
  'mentor.colStatus': 'Status',
  'mentor.colAttempts': 'Percobaan',
  'mentor.colActions': 'Tindakan',
  'mentor.manage': 'Kelola',
  'mentor.publish': 'Terbitkan',
  'mentor.unpublish': 'Batalkan terbit',
  'mentor.delete': 'Hapus',
  // Expert analytics
  'analytics.title': 'Analitik',
  'analytics.boughtTitle': 'Asesmen dibeli',
  'analytics.boughtDesc': 'Pembelian per hari',
  'analytics.emptyBought': 'Belum ada pembelian',
  'analytics.revenueTitle': 'Pendapatan dari waktu ke waktu',
  'analytics.revenueDesc': 'Saldo (Rp) yang diperoleh per hari',
  'analytics.emptyRevenue': 'Belum ada pendapatan berbayar',
  // Expert revenue
  'revenue.title': 'Pendapatan',
  'revenue.total': 'Total Pendapatan',
  'revenue.bought': 'Asesmen Dibeli',
  'revenue.emptyTitle': 'Pembelian akan muncul di sini',
  'revenue.emptyDesc':
    'Saat seseorang membeli akses ke asesmen Anda, pembelian akan muncul di daftar ini.',
  'revenue.colAssessment': 'Asesmen',
  'revenue.colTier': 'Paket produk',
  'revenue.colAmount': 'Jumlah',
  'revenue.colDate': 'Tanggal',
  'revenue.colBuyer': 'Dibeli oleh',

  // Manage assessment page
  'manage.back': 'Kembali ke dasbor',
  'manage.details': 'Detail',
  'manage.questions': 'Pertanyaan',
  'manage.pricing': 'Produk & harga',
  'manage.landing': 'Halaman arahan',
  'manage.share': 'Bagikan',
  'manage.results': 'Hasil',
  'manage.detailsTitle': 'Detail asesmen',
  'manage.edit': 'Ubah',
  'manage.saveChanges': 'Simpan perubahan',
  'manage.description': 'Deskripsi',
  'manage.lowThreshold': 'Ambang bawah',
  'manage.highThreshold': 'Ambang atas',
  'manage.freeReportText': 'Teks laporan gratis',
  'manage.openingVideo': 'Video pembuka',
};
