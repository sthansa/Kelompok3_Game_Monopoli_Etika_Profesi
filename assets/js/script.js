// ===== GAME CONFIGURATION & CONSTANTS =====
/**
 * Master configuration object for all game parameters
 * Modify these values to adjust game mechanics
 */
const CONFIG = {
    // Player settings
    STARTING_POINTS: 1000,
    MAX_PLAYERS: 8,
    MIN_PLAYERS: 2,
    
    // Movement & scoring
    START_PASS_BONUS: 50,
    WIN_SCORE: 500,
    
    // Jail mechanics
    JAIL_PAYMENT_COST: 100,
    MAX_JAIL_TURNS: 3,
    
    // Fine & penalty amounts
    FINE_AMOUNT: 100,
    WRONG_PURCHASE_PENALTY: 50,
    CORRECT_ANSWER_BONUS: 100,
    CORRECT_DANA_UMUM_BONUS: 10,
    WRONG_ANSWER_PENALTY: 50,
    
    // Game constants
    BOARD_SIZE: 24,
    CITY_COUNT: 16,
    BASE_CITY_PRICE: 100,
    CITY_PRICE_INCREMENT: 20,
};

// ===== GAME STATE VARIABLES =====
/**
 * Active players in current game
 * @type {Array<{name: string, points: number, position: number, color: string, hasAngelCard: boolean}>}
 */
let players = [
    { name: "Pemain 1", points: CONFIG.STARTING_POINTS, position: 0, color: "player-1", hasAngelCard: false, hasJailFreeCard: false },
    { name: "Pemain 2", points: CONFIG.STARTING_POINTS, position: 0, color: "player-2", hasAngelCard: false, hasJailFreeCard: false },
    { name: "Pemain 3", points: CONFIG.STARTING_POINTS, position: 0, color: "player-3", hasAngelCard: false, hasJailFreeCard: false },
    { name: "Pemain 4", points: CONFIG.STARTING_POINTS, position: 0, color: "player-4", hasAngelCard: false, hasJailFreeCard: false },
];

/** Track which players are in jail: {playerIndex: {inJail: bool, turnsInJail: number}} */
let jailState = {};

/** Current player's index in players array */
let currentPlayerIndex = 0;

/** Game loop active flag */
let gameRunning = false;

/** Game has been started (prevents premature win checks) */
let gameStarted = false;

/** Currently displayed question object */
let currentQuestion = null;

/** City ownership mapping: {tileIndex: playerIndex} - using tile index instead of city name to handle duplicate cities */
let cityOwnership = {};

/** City prices mapping: {cityName: price} */
let cityPrices = {};

/** Questions already asked: [questionId] */
let usedQuestions = [];

// ===== BOARD & CITY CONFIGURATION =====
/**
 * City names on the board
 * @type {Array<string>}
 */
const cities = [
    "Philipina", "Thailand", "Jepang", "Korea", "India", "China", 
    "Inggris", "Prancis", "Indonesia", "Australia", "Malaysia", "Singapura",
    "Vietnam", "Myanmar", "Kamboja", "Laos"
];

/**
 * Board tiles configuration
 * Papan 7x7 (24 tiles: 4 corner + 20 side tiles)
 * Index 0: START (bottom-right)
 * Index 6: PENJARA (top-right)
 * Index 12: PARKIR KEMANA SAJA (top-left)
 * Index 18: PENJARA (bottom-left)
 */
let boardTiles = [];

/**
 * Initialize board tiles with city names
 * @private
 */
function initializeBoardTiles() {
    // Total tiles: 24 
    // Structure: START(1) + PENJARA(2) + PARKIR(1) + KESEMPATAN(2) + DANA UMUM(2) + KOTA(16) = 24
    // Cities array has 16 cities, each city appears only once
    let cityIndex = 0;
    boardTiles = [
        { name: "START", type: "start" },                      // 0
        { name: cities[cityIndex++], type: "question" },      // 1: Philipina
        { name: cities[cityIndex++], type: "question" },      // 2: Thailand
        { name: "KESEMPATAN", type: "opportunity" },          // 3
        { name: cities[cityIndex++], type: "question" },      // 4: Jepang
        { name: cities[cityIndex++], type: "question" },      // 5: Korea
        { name: "PENJARA", type: "jail" },                    // 6
        { name: cities[cityIndex++], type: "question" },      // 7: India
        { name: cities[cityIndex++], type: "question" },      // 8: China
        { name: "DANA UMUM", type: "community" },            // 9
        { name: cities[cityIndex++], type: "question" },      // 10: Inggris
        { name: cities[cityIndex++], type: "question" },      // 11: Prancis
        { name: "PARKIR KEMANA SAJA", type: "parking" },     // 12
        { name: cities[cityIndex++], type: "question" },      // 13: Indonesia
        { name: cities[cityIndex++], type: "question" },      // 14: Australia
        { name: "KESEMPATAN", type: "opportunity" },          // 15
        { name: cities[cityIndex++], type: "question" },      // 16: Malaysia
        { name: cities[cityIndex++], type: "question" },      // 17: Singapura
        { name: "PENJARA", type: "jail" },                    // 18
        { name: cities[cityIndex++], type: "question" },      // 19: Vietnam
        { name: cities[cityIndex++], type: "question" },      // 20: Myanmar
        { name: "DANA UMUM", type: "community" },            // 21
        { name: cities[cityIndex++], type: "question" },      // 22: Kamboja
        { name: cities[cityIndex++], type: "question" },      // 23: Laos
    ];
}

// ===== QUESTION SYSTEM =====
/**
 * All available ethics questions (70 total)
 * Question structure: {q: string, c: [string], a: number, id: number}
 * where c = choices (a,b,c,d), a = correct answer index (varied)
 * @type {Array<{q: string, c: [string], a: number, id: number}>}
 */
// Questions loaded from SOAL_TEMPLATE.txt (70 questions)
const allQuestions = [
    { q: "Etika profesi dapat diartikan sebagai…", c: ["Aturan hukum yang mengikat semua warga negara", "Nilai dan norma moral yang mengatur perilaku profesional", "Kebiasaan pribadi dalam bekerja", "Pedoman kerja berdasarkan pengalaman"], a: 1, id: 1 },
    { q: "Tujuan utama penerapan etika profesi adalah…", c: ["Meningkatkan keuntungan perusahaan", "Menjaga citra pribadi", "Mengatur hubungan antarindividu secara bebas", "Menjaga kepercayaan publik terhadap profesi"], a: 3, id: 2 },
    { q: "Rekan kerja melakukan pekerjaan yang tidak sesuai standar. Tindakan Anda?", c: ["Diam saja, bukan urusan saya", "Lapor langsung ke atasan", "Bicarakan langsung dengan rekan kerja", "Tunggu sampai ada keluhan"], a: 2, id: 3 },
    { q: "Diminta menggunakan metode akuntansi yang meragukan untuk memperbaiki hasil keuangan. Apa respon Anda?", c: ["Ikuti instruksi karena dari atasan", "Tolak dan laporkan ke lembaga pengawas", "Konsultasi dengan akuntan lain dulu", "Coba dulu untuk melihat hasilnya"], a: 1, id: 4 },
    { q: "Informasi rahasia perusahaan bocor ke kompetitor. Siapa yang bertanggung jawab?", c: ["Yang membocorkan saja", "Seluruh tim yang tahu informasi tersebut", "Hanya pimpinan yang gagal mengawasi", "Perusahaan tidak ada tanggung jawab"], a: 0, id: 5 },
    { q: "Anda menemukan kesalahan dalam data klien. Sebaiknya...", c: ["Biarkan saja karena bukan kesalahan saya", "Segera beritahu klien dengan dokumentasi lengkap", "Tunggu sampai klien menyadarinya sendiri", "Perbaiki tanpa memberi tahu klien"], a: 1, id: 6 },
    { q: "Klien meminta Anda berbohong untuk kepentingannya. Bagaimana respon Anda?", c: ["Setuju karena klien adalah prioritas", "Tolak dengan tegas dan jelaskan aturan etika", "Lakukan dengan syarat tidak ada bukti", "Minta biaya tambahan untuk risiko"], a: 1, id: 7 },
    { q: "Atasan meminta memakai akun media sosial pribadi untuk promosi perusahaan. Apa yang Anda lakukan?", c: ["Ikuti karena itu instruksi atasan", "Tolak dan gunakan akun resmi perusahaan", "Buat akun terpisah untuk promosi", "Kerjakan tapi jangan cantumkan nama"], a: 1, id: 8 },
    { q: "Ditemukan dana hilang dalam audit. Siapa yang harus diberitahu?", c: ["Hanya pimpinan puncak", "Manajemen, dewan pengawas, dan otoritas yang berwenang", "Cukup manajemen saja", "Diselesaikan internal tanpa melaporkan"], a: 1, id: 9 },
    { q: "Proyek selesai melebihi anggaran. Bagaimana melaporkannya?", c: ["Sesuaikan laporan agar terlihat sesuai anggaran", "Lapor dengan jujur dan jelaskan penyebabnya", "Tunda pelaporan hingga ada klienifikasi", "Minta maaf tapi jangan detail alasannya"], a: 1, id: 10 },
    
    // Soal 11-20: Tanggung Jawab Profesional
    { q: "Deadline proyek sangat ketat namun hasilnya akan berkualitas rendah. Apa yang harus dilakukan?", c: ["Berikan hasil asal sesuai jadwal", "Komunikasikan risiko dan usulkan solusi", "Kerja sampai larut malam tanpa peduli kualitas", "Abaikan deadline untuk hasil sempurna"], a: 1, id: 11 },
    { q: "Temuan audit menunjukkan dugaan korupsi. Langkah pertama yang tepat?", c: ["Beritahu tersangka untuk memberikan kesempatan", "Lapor ke manajemen dan otoritas yang relevan", "Simpan sebagai rahasia tim audit", "Tunggu sampai ada bukti lebih kuat"], a: 1, id: 12 },
    { q: "Klien menggunakan jasa Anda untuk menghindari pajak dengan cara ilegal. Anda harus...", c: ["Membantu karena itu bisnis Anda", "Menolak dan melaporkan ke otoritas perpajakan", "Membantu tapi tidak mencatat dalam laporan", "Abaikan dan teruskan pekerjaan"], a: 1, id: 13 },
    { q: "Reputasi perusahaan terancam karena kesalahan pengguna internal. Siapa yang harus mengkomunikasikan?", c: ["Sembunyikan untuk lindungi reputasi", "Komunikasikan dengan transparan dan penuh tanggung jawab", "Hanya beritahu stakeholder internal", "Tunggu media meliput duluan"], a: 1, id: 14 },
    { q: "Biaya operasional meningkat namun tidak bisa dipangkas lagi. Apa yang harus dilaporkan?", c: ["Lapor biaya lebih rendah dari kenyataan", "Lapor dengan jujur dan ajukan rencana optimasi", "Tunda pelaporan selama beberapa bulan", "Bagikan biaya ke berbagai kategori agar tidak terlihat"], a: 1, id: 15 },
    { q: "Seorang anggota tim tidur saat bekerja. Tindakan yang tepat?", c: ["Diabaikan saja", "Peringatkan secara privat dan cari tahu penyebabnya", "Laporkan langsung ke kepala bagian", "Potong gajinya tanpa notifikasi"], a: 1, id: 16 },
    { q: "Menemukan kelemahan sistem keamanan data. Siapa yang harus Anda laporkan?", c: ["Jangan lapor agar tidak merepotkan", "Lapor ke tim IT dan manajemen dengan segera", "Ceritakan ke teman sebelum lapor resmi", "Coba exploit untuk buktikan risikonya"], a: 1, id: 17 },
    { q: "Vendor meminta komisi khusus untuk Anda agar dipilih. Bagaimana respon Anda?", c: ["Terima karena benefit pribadi", "Tolak dan laporkan ke manajemen", "Terima tapi tidak ungkap ke manajemen", "Minta lebih banyak lagi"], a: 1, id: 18 },
    { q: "Dokumen penting hilang dan Anda yang terakhir mengaksesnya. Apa yang dilakukan?", c: ["Sembunyikan agar tidak terlihat bersalah", "Laporkan dengan jujur dan bantu investigasi", "Cari siapa yang sebenarnya bertanggung jawab", "Buat dokumen baru yang sama"], a: 1, id: 19 },
    { q: "Klien meminta laporan audit disesuaikan agar terlihat lebih baik. Respons Anda?", c: ["Setuju karena klien membayar", "Tolak karena violasi standar auditing", "Lakukan dengan syarat tidak ada bukti", "Diskusikan cara yang etis"], a: 1, id: 20 },
    
    // Soal 21-30: Konflik Kepentingan
    { q: "Perusahaan klien adalah milik keluarga dekat Anda. Bagaimana bertindak?", c: ["Tangani seperti klien biasa", "Disklosur hubungan dan tunjukkan independensi", "Hanya handle pekerjaan administratif", "Minta kompensasi lebih karena ada hubungan"], a: 1, id: 21 },
    { q: "Ditawari saham klien dengan harga spesial. Apakah Anda harus menerima?", c: ["Terima karena menguntungkan", "Tolak untuk menjaga independensi", "Terima tapi jangan lapor", "Tanyakan ke klien apakah boleh"], a: 1, id: 22 },
    { q: "Teman dekat bekerja di perusahaan kompetitor klien Anda. Apa yang dilakukan?", c: ["Terus seperti biasa, bukan masalah", "Disklosur hubungan ke manajemen", "Kurangi kontak dengan teman tersebut", "Minta teman pindah ke perusahaan Anda"], a: 1, id: 23 },
    { q: "Audit menemukan kesalahan yang jika dipublikasi akan merugikan rekan bisnis Anda. Tindakan?", c: ["Sembunyikan untuk lindungi rekan", "Laporkan dengan objektivitas penuh", "Laporkan tapi dengan bahasa yang halus", "Tanyakan rekan apa yang seharusnya dilakukan"], a: 1, id: 24 },
    { q: "Diminta mengaudit perusahaan tempatmu bekerja dulu. Bisakah menerima penugasan ini?", c: ["Bisa saja, sudah resign kok", "Tidak bisa karena masih ada hubungan", "Bisa tapi dengan pengawasan ketat", "Bisa dengan persyaratan tidak ada pembelaan"], a: 1, id: 25 },
    { q: "Klien akan memberi kontrak besar jika Anda tidak melaporkan celah pajak. Pilihan Anda?", c: ["Setuju karena uang penting", "Tolak dan laporkan sesuai standar etika", "Lakukan dengan imbalan harga lebih tinggi", "Beri waktu klien untuk perbaiki sendiri"], a: 1, id: 26 },
    { q: "Memiliki investasi di perusahaan yang akan Anda audit. Tindakan yang tepat?", c: ["Lakukan audit seperti biasa", "Jual investasi atau tolak penugasan", "Jual investasi setelah audit selesai", "Tidak perlu laporkan ke manajemen"], a: 1, id: 27 },
    { q: "Keluarga menggunakan jasa profesional Anda dengan harga khusus. Etika ini?", c: ["Tidak masalah, murni transaksi bisnis", "Perlu transparansi dan dokumentasi jelas", "Boleh tapi jangan beri diskon terlalu besar", "Berikan gratis karena keluarga sendiri"], a: 1, id: 28 },
    { q: "Audit menemukan klien melanggar hukum. Siapa yang diberitahu terlebih dahulu?", c: ["Klien saja", "Manajemen klien dan otoritas yang berwenang", "Hanya otoritas, tidak perlu tahu klien", "Tim audit saja"], a: 1, id: 29 },
    { q: "Ditawari pekerjaan di klien dengan gaji jauh lebih tinggi. Bagaimana prosedurnya?", c: ["Langsung terima dan resign", "Beritahu manajemen dan tunggu waktu transisi yang wajar", "Terima tapi teruskan pekerjaan audit dulu", "Minta kompensasi dari perusahaan saat ini"], a: 1, id: 30 },
    
    // Soal 31-40: Kerahasiaan dan Komunikasi
    { q: "Diminta membocorkan informasi klien ke pesaing. Apa respons Anda?", c: ["Bisa jika dibayar", "Tolak dan laporkan upaya ini", "Lakukan tapi sangat rahasia", "Minta persetujuan klien terlebih dahulu"], a: 1, id: 31 },
    { q: "Klien meminta tidak mengungkap data tertentu kepada dewan pengawas. Bagaimana?", c: ["Ikuti permintaan klien", "Ungkap karena dewan pengawas perlu tahu semua", "Diskusikan dengan klien pentingnya transparansi", "Minta klien izin tertulis untuk tidak ungkap"], a: 1, id: 32 },
    { q: "Media meminta informasi klien Anda. Apa yang direspons?", c: ["Berikan informasi untuk publisitas", "Tolak dan arahkan ke klien atau hukum perusahaan", "Berikan tapi dengan nama samaran", "Tanyakan klien boleh atau tidak"], a: 1, id: 33 },
    { q: "Menemukan bahwa klien lain adalah kompetitor klien Anda saat ini. Tindakan?", c: ["Abaikan karena bukan urusan saya", "Disklosur konflik potensi ke kedua klien", "Fokus pada profesionalisme di setiap klien", "Beritahu klien pertama tentang klien kedua"], a: 1, id: 34 },
    { q: "Negosiasi gaji dengan klien untuk pekerjaan tambahan. Apakah etis?", c: ["Tidak etis, berbeda dua pihak", "Etis jika didokumentasikan dengan jelas", "Etis tapi disembunyikan dari manajemen", "Tidak boleh sama sekali"], a: 1, id: 35 },
    { q: "Klien meminta hasil audit disembunyikan dari lembaga regulasi. Tindakan Anda?", c: ["Setuju karena klien bayar", "Tolak dan laporkan audit sesuai aturan", "Lakukan dengan syarat dibayar lebih", "Tunggu ada masalah baru sebelum lapor"], a: 1, id: 36 },
    { q: "Catatan audit menunjukkan data sensitif klien. Bagaimana menyimpannya?", c: ["Simpan di rumah saja", "Simpan dengan keamanan tinggi sesuai standar", "Tidak perlu simpan, hanya ingat saja", "Bagikan ke tim untuk backup"], a: 1, id: 37 },
    { q: "Dipercaya klien untuk rahasiakan identitas pihak lain dalam laporan. Boleh?", c: ["Boleh jika klien minta", "Tidak boleh, harus jujur dalam laporan", "Boleh tapi dengan catatan khusus", "Boleh tapi dokumentasikan secara tersembunyi"], a: 1, id: 38 },
    { q: "Kolega membagikan informasi rahasia klien di forum tertutup. Apa yang dilakukan?", c: ["Biarkan saja", "Tegur kolega dan laporkan ke manajemen", "Lakukan hal yang sama untuk seimbang", "Tanyakan dulu alasan kolega membagikan"], a: 1, id: 39 },
    { q: "Diminta menulis laporan yang meninggalkan detail penting untuk kepentingan klien. Tindakan?", c: ["Tulis sesuai permintaan", "Tulis lengkap dan jujur sesuai standar", "Tulis tapi dengan catatan kaki yang ambigu", "Tolak menulis laporan"], a: 1, id: 40 },
    
    // Soal 41-50: Kompetensi Profesional
    { q: "Diberikan proyek di bidang yang belum pernah Anda tangani. Bagaimana?", c: ["Langsung terima karena perlu pengalaman", "Diskusikan dengan atasan dan ambil pelatihan jika perlu", "Terima tapi cari bantuan diam-diam", "Tolak dan usulkan kolega lain"], a: 1, id: 41 },
    { q: "Klien meminta Anda bekerja tanpa standar industri untuk hemat biaya. Respons?", c: ["Setuju karena bisa hemat", "Jelaskan risiko dan tegak pada standar", "Lakukan dengan perjanjian tanpa jaminan kualitas", "Coba setengah standar dulu"], a: 1, id: 42 },
    { q: "Menemukan diri Anda kurang kompeten untuk suatu tugas. Apa yang dilakukan?", c: ["Lanjutkan saja dan belajar sambil bekerja", "Diskusikan dengan atasan dan cari solusi", "Lapor ketika masalah timbul", "Minta bantuan klien"], a: 1, id: 43 },
    { q: "Mengalami burnout namun tetap memiliki pekerjaan pending. Bagaimana mengatasi?", c: ["Lanjutkan bekerja meski kualitas menurun", "Beritahu atasan dan cari solusi seimbang", "Ambil cuti tanpa pemberitahuan", "Selesaikan dengan cepat meski tidak sempurna"], a: 1, id: 44 },
    { q: "Teknologi baru mengubah cara kerja industri Anda. Tindakan Anda?", c: ["Abaikan dan teruskan cara lama", "Pelajari dan adopsi untuk tetap kompeten", "Tunggu sampai klien minta dulu", "Minta perusahaan yang upgrade sistem"], a: 1, id: 45 },
    { q: "Diminta melakukan pekerjaan di area yang ada konflik kepentingan pribadi. Apakah boleh?", c: ["Boleh jika tidak ada orang lain", "Tidak boleh untuk menjaga integritas", "Boleh tapi harus sangat hati-hati", "Boleh dengan pengungkapan penuh"], a: 1, id: 46 },
    { q: "Klien meminta Anda bekerja dengan jam yang tidak standar dan berbahaya. Tindakan?", c: ["Setuju karena klien membayar", "Tolak dan usulkan jadwal yang aman", "Lakukan dengan syarat gaji overtime besar", "Setuju tapi kurangi komitmen klien lain"], a: 1, id: 47 },
    { q: "Menerima tawaran pelatihan gratis di bidang yang relevan. Apakah perlu konfirmasi atasan?", c: ["Tidak perlu, itu untuk pengembangan diri", "Sebaiknya beritahu atasan agar saling support", "Terima tapi sembunyikan dari atasan", "Minta atasan yang membayar pelatihan"], a: 1, id: 48 },
    { q: "Ditemukan bahwa Anda membuat kesalahan teknis dalam pekerjaan sebelumnya. Langkah?", c: ["Sembunyikan agar tidak disorot", "Segera beritahu atasan dan klien, perbaiki", "Tunggu klien menyadarinya", "Perbaiki sendiri tanpa lapor"], a: 1, id: 49 },
    { q: "Klien minta sertifikasi Anda untuk layanan yang belum Anda sertifikasi. Respons?", c: ["Berikan sertifikat palsu", "Tolak dan jelaskan standar sertifikasi", "Berikan dengan syarat rahasia", "Coba dulu sebelum sertifikasi resmi"], a: 1, id: 50 },
    
    // Soal 51-60: Integritas dan Kejujuran
    { q: "Kesalahan Anda menyebabkan kerugian klien. Bagaimana menghadapinya?", c: ["Sembunyikan agar tidak tahu", "Akui, minta maaf, dan tanggung jawab", "Alihkan kesalahan ke orang lain", "Tutup dengan cerita lain yang mengalihkan"], a: 1, id: 51 },
    { q: "Menemukan biaya tidak masuk dalam penawaran awal kepada klien. Tindakan?", c: ["Sembunyikan dan tagih saat invoice", "Komunikasikan perubahan dengan jelas dan jujur", "Serap biaya sendiri agar klien senang", "Tagih diam-diam setelah pekerjaan selesai"], a: 1, id: 52 },
    { q: "Klien meminta Anda memberikan referensi palsu dari klien terdahulu. Apakah boleh?", c: ["Boleh untuk bantu klien", "Tidak boleh karena melanggar integritas", "Boleh tapi tidak dengan detail real", "Boleh dengan persetujuan klien terdahulu"], a: 1, id: 53 },
    { q: "Atasan meminta menutupi kesalahan sistemik perusahaan. Respons?", c: ["Ikuti instruksi atasan", "Tolak dan laporkan ke level lebih tinggi atau otoritas", "Lakukan tapi dokumentasikan untuk perlindungan", "Cari cara untuk menutupi secara kreativ"], a: 1, id: 54 },
    { q: "Menemukan bahwa kompetitor melakukan tindakan tidak etis. Tindakan?", c: ["Balas dengan cara serupa", "Laporkan ke otoritas yang relevan jika terbukti", "Abaikan karena bukan bidang saya", "Beritahu klien untuk menggunakan layanan saya"], a: 1, id: 55 },
    { q: "Diminta meningkatkan angka di laporan tanpa dasar faktual. Bagaimana?", c: ["Setuju karena meningkatkan penjualan", "Tolak dan rapor data yang akurat", "Lakukan dengan catatan khusus", "Tanyakan berapa banyak harus dinaikkan"], a: 1, id: 56 },
    { q: "Pengalaman Anda kurang dari yang Anda klaim di CV. Bagaimana memperbaikinya?", c: ["Dibiarkan saja, semua orang pernah bohong", "Koreksi secara transparan ke perusahaan", "Tutupi dengan memberikan hasil lebih baik", "Perbaiki CV terakhir sebelum background check"], a: 1, id: 57 },
    { q: "Klien menggunakan produk Anda untuk tujuan ilegal. Bagaimana?", c: ["Teruskan karena pembayaran sudah diterima", "Hentikan layanan dan laporkan ke otoritas", "Teruskan tapi jangan tanyakan kepada siapa", "Minta klien untuk private"], a: 1, id: 58 },
    { q: "Menemukan data palsu dalam database klien yang mereka kirim sendiri. Tindakan?", c: ["Gunakan data apa adanya", "Tanyakan dan verifikasi sebelum digunakan", "Laporkan langsung ke otoritas", "Jangan tanyakan, biarkan klien tanggung jawab"], a: 1, id: 59 },
    { q: "Diberikan bonus atas dasar pencapaian target yang sebenarnya tidak realistis. Tindakan?", c: ["Ambil bonus tanpa pertanyaan", "Diskusikan dengan atasan tentang realism target", "Ambil tapi rasakan bersalah", "Tolak bonus jika tidak realistis"], a: 1, id: 60 },
    
    // Soal 61-70: Tanggung Jawab Sosial
    { q: "Proyek Anda akan berdampak negatif pada lingkungan. Apa yang dilakukan?", c: ["Lanjutkan, bukan tanggung jawab saya", "Identifikasi risiko dan usulkan mitigasi", "Hentikan proyek total", "Lanjutkan tapi dengan pengurangan dampak"], a: 1, id: 61 },
    { q: "Klien meminta mengurangi standar keamanan untuk hemat biaya. Respons?", c: ["Setuju karena klien prioritas", "Tolak dan jelaskan risiko keamanan", "Kurangi sedikit saja", "Lakukan dengan izin tertulis dari klien"], a: 1, id: 62 },
    { q: "Layanan Anda akan mempengaruhi ribuan orang secara negatif. Tindakan?", c: ["Lanjutkan karena sudah kontrak", "Assess risiko dan cari solusi mitigasi", "Hentikan seluruh proyek", "Lanjutkan tapi informasikan risiko"], a: 1, id: 63 },
    { q: "Temuan menunjukkan klien merugikan konsumen secara sistematis. Anda harus...", c: ["Diam karena hubungan baik dengan klien", "Laporkan ke otoritas yang berwenang", "Beritahu klien untuk perbaiki sendiri", "Konsultasikan dengan lawyer klien"], a: 1, id: 64 },
    { q: "Program Anda berdampak pada pengurangan lapangan kerja karyawan. Etika tindakan?", c: ["Tidak masalah, efisiensi adalah tujuan", "Assess dampak sosial dan cari solusi transisi", "Jangan implementasikan program", "Implementasikan tapi bantu pelatihan ulang"], a: 1, id: 65 },
    { q: "Klien meminta strategi yang memanfaatkan celah hukum yang merugikan publik. Tindakan?", c: ["Setuju karena legal secara teknis", "Tolak karena merugikan publik dan integritas", "Lakukan dengan syarat tidak ada bukti", "Lakukan tapi dengan dokumentasi tersembunyi"], a: 1, id: 66 },
    { q: "Menemukan klien mengeksploitasi buruh anak dalam supply chain. Tindakan?", c: ["Abaikan karena di negara lain", "Laporkan ke otoritas dan stop layanan", "Beritahu klien untuk stop praktik", "Teruskan tapi dengan catatan moral"], a: 1, id: 67 },
    { q: "Data pribadi konsumen akan terbuka dalam layanan baru. Bagaimana?", c: ["Lanjutkan karena sudah oke secara hukum", "Assess privasi dan implementasikan proteksi tinggi", "Jangan buka data konsumen", "Buka tapi dengan izin tertulis konsumen"], a: 1, id: 68 },
    { q: "Produk Anda akan mempengaruhi kesehatan publik. Tindakan yang tepat?", c: ["Teruskan selama ada persetujuan hukum", "Conduct riset dampak kesehatan mendalam", "Jangan luncurkan produk", "Luncurkan dengan warning tapi jangan promosi"], a: 1, id: 69 },
    { q: "Klien meminta menyembunyikan informasi kesehatan dari regulasi. Respons Anda?", c: ["Setuju untuk loyalitas klien", "Tolak karena melindungi publik adalah prioritas", "Sembunyikan sampai waktu tertentu", "Laporkan hanya jika ada bukti kuat"], a: 1, id: 70 }
];

/**
 * Get next unused question from question pool
 * Automatically resets pool if exhausted
 * @returns {{q: string, c: [string], a: number, id: number}} Random unused question
 */
function getUnusedQuestion() {
    const unusedQuestions = allQuestions.filter(q => !usedQuestions.includes(q.id));
    
    if (unusedQuestions.length === 0) {
        usedQuestions = [];
        logMessage("⚠️ Semua soal sudah digunakan, mengulang dari awal");
        return allQuestions[Math.floor(Math.random() * allQuestions.length)];
    }
    
    const randomIndex = Math.floor(Math.random() * unusedQuestions.length);
    const selectedQuestion = unusedQuestions[randomIndex];
    usedQuestions.push(selectedQuestion.id);
    
    return selectedQuestion;
}

/**
 * Reset used questions when game starts
 * @private
 */
function resetUsedQuestions() {
    usedQuestions = [];
}

// ===== CITY SYSTEM =====
/**
 * Initialize city prices based on configuration
 * Prices vary from BASE_CITY_PRICE to BASE + (COUNT-1)*INCREMENT
 * @private
 */
function initializeCityPrices() {
    cities.forEach((city, index) => {
        cityPrices[city] = CONFIG.BASE_CITY_PRICE + (index * CONFIG.CITY_PRICE_INCREMENT);
    });
}

/**
 * Update visual ownership marker on city tile
 * @param {number} tileIndex - Tile index to update marker for
 */
function updateCityOwnershipDisplay(tileIndex) {
    const ownerIndex = cityOwnership[tileIndex];
    if (ownerIndex === undefined) return;
    
    const tileElement = document.getElementById(`tile-${tileIndex}`);
    if (!tileElement) return;
    
    const existingMarker = tileElement.querySelector('.owner-marker');
    if (existingMarker) existingMarker.remove();
    
    const marker = document.createElement("div");
    marker.className = "owner-marker";
    const colorMap = {
        "player-1": "#ff4757",
        "player-2": "#3742fa",
        "player-3": "#2ed573",
        "player-4": "#ffa502"
    };
    const color = colorMap[players[ownerIndex].color] || "#666";
    
    marker.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        z-index: 20;
    `;
    tileElement.style.position = "relative";
    tileElement.appendChild(marker);
}

// ===== GAME LIFECYCLE =====
/**
 * Initialize new game state before starting
 * Called on page load
 */
function initGame() {
    initializeBoardTiles();
    resetUsedQuestions();
    initializeCityPrices();
    initJailState();
    createBoard();
    createPlayerPieces();
    updateUI();
    
    gameRunning = false;
    gameStarted = false;
    
    const rollBtn = document.getElementById("rollButton");
    if (rollBtn) rollBtn.disabled = true;
    
    logMessage("ℹ️ Siap dimainkan — tambahkan pemain jika perlu, lalu klik 'Mulai Permainan'.");
}

/**
 * Initialize jail state for all players
 * @private
 */
function initJailState() {
    jailState = {};
    players.forEach((_, i) => {
        jailState[i] = { inJail: false, turnsInJail: 0 };
    });
}

/**
 * Start active game session
 * Resets player positions, clears city ownership, enables dice rolling
 */
function startGame() {
    if (gameRunning) {
        updateGameInfo('Permainan sudah berjalan');
        return;
    }

    if (players.length < CONFIG.MIN_PLAYERS) {
        updateGameInfo(`Minimal ${CONFIG.MIN_PLAYERS} pemain untuk memulai permainan`);
        return;
    }

    resetUsedQuestions();
    initializeCityPrices();
    
    // Shuffle cards at game start
    shuffleOpportunityCards();
    shuffleCommunityCards();

    players.forEach((p) => {
        p.points = CONFIG.STARTING_POINTS;
        p.position = 0;
        p.hasAngelCard = false;
        p.hasJailFreeCard = false;
    });

    cityOwnership = {};
    document.querySelectorAll('.owner-marker').forEach(el => el.remove());
    
    initJailState();

    players.forEach((_, i) => {
        const piece = document.getElementById(`player-${i}`);
        const startTile = document.getElementById('tile-0');
        if (piece && startTile) startTile.appendChild(piece);
    });

    currentPlayerIndex = 0;
    gameRunning = true;
    gameStarted = true;
    
    const rollBtn = document.getElementById("rollButton");
    if (rollBtn) rollBtn.disabled = false;

    logMessage('🎮 Permainan dimulai! Giliran: ' + players[currentPlayerIndex].name);
    updateGameInfo('Permainan dimulai — giliran: ' + players[currentPlayerIndex].name);
    updateUI();
}

/**
 * Reset entire game to initial state
 * Clears board, resets players, disables controls
 */
function resetGame() {
    document.querySelectorAll('.owner-marker').forEach(el => el.remove());
    document.querySelectorAll('.player-piece').forEach(el => el.remove());

    cityOwnership = {};
    usedQuestions = [];
    currentQuestion = null;
    currentPlayerIndex = 0;
    gameRunning = false;
    gameStarted = false;

    players = players.map((p, i) => ({
        name: p.name || `Pemain ${i+1}`,
        points: CONFIG.STARTING_POINTS,
        position: 0,
        color: p.color || `player-${(i%4)+1}`,
        hasAngelCard: false,
        hasJailFreeCard: false,
    }));

    initializeCityPrices();
    createPlayerPieces();

    const rollBtn = document.getElementById("rollButton");
    if (rollBtn) rollBtn.disabled = true;

    logMessage('🔁 Permainan di-reset. Siap untuk dimulai kembali.');
    updateGameInfo('Permainan telah di-reset. Klik Mulai Permainan untuk memulai.');
    updateUI();
}

/**
 * Clear game log display
 */
function clearLog() {
    const log = document.getElementById('gameLog');
    if (log) log.innerHTML = '';
    updateGameInfo('Log permainan dibersihkan.');
}

// ===== BOARD & VISUAL SYSTEM =====
/**
 * Create board tiles in DOM
 * @private
 */
function createBoard() {
    const board = document.getElementById("gameBoard");
    if (!board) return;

    boardTiles.forEach((tile, index) => {
        const tileElement = document.createElement("div");
        tileElement.className = `board-tile tile-${index} tile-${tile.type}`;
        tileElement.textContent = tile.name;
        tileElement.id = `tile-${index}`;
        tileElement.style.position = "relative";

        const position = getBoardPosition(index);
        tileElement.style.gridColumn = position.col;
        tileElement.style.gridRow = position.row;

        board.appendChild(tileElement);
    });

    createCardBoxes();
    
    // Update ownership display for all owned tiles
    Object.keys(cityOwnership).forEach(tileIndex => {
        updateCityOwnershipDisplay(parseInt(tileIndex));
    });
}

/**
 * Create decorative card boxes in center of board
 * @private
 */
function createCardBoxes() {
    const board = document.getElementById("gameBoard");
    if (!board) return;
    
    const cardContainer = document.createElement("div");
    cardContainer.className = "card-container";
    cardContainer.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 20px;";
    
    const opportunityBox = document.createElement("div");
    opportunityBox.className = "card-box opportunity-box";
    opportunityBox.innerHTML = `
        <div class="card-box-title">🎲 KESEMPATAN</div>
        <div class="card-box-count">10 Kartu</div>
    `;
    
    const communityBox = document.createElement("div");
    communityBox.className = "card-box community-box";
    communityBox.innerHTML = `
        <div class="card-box-title">📦 DANA UMUM</div>
        <div class="card-box-count">10 Kartu</div>
    `;
    
    cardContainer.appendChild(opportunityBox);
    cardContainer.appendChild(communityBox);
    board.appendChild(cardContainer);
}

/**
 * Calculate grid position for board tile
 * 7x7 grid with tiles positioned around perimeter
 * @param {number} index - Tile index (0-23)
 * @returns {{col: number, row: number}} CSS grid position
 * @private
 */
function getBoardPosition(index) {
    if (index <= 6) {
        return { col: 7 - index, row: 7 };
    } else if (index <= 12) {
        const pos = index - 6;
        return { col: 1, row: 7 - pos };
    } else if (index <= 18) {
        const pos = index - 12;
        return { col: pos + 1, row: 1 };
    } else {
        const pos = index - 18;
        return { col: 7, row: pos + 1 };
    }
}

/**
 * Create visual player pieces on board
 * @private
 */
function createPlayerPieces() {
    players.forEach((player, index) => {
        const piece = document.createElement("div");
        piece.className = `player-piece ${player.color}`;
        piece.id = `player-${index}`;

        const startTile = document.getElementById("tile-0");
        if (startTile) startTile.appendChild(piece);
    });
}

// ===== PLAYER MANAGEMENT =====
/**
 * Add new player at runtime (before game starts)
 */
function addPlayer() {
    if (gameRunning) {
        updateGameInfo('Tidak dapat menambah pemain saat permainan berjalan');
        return;
    }
    
    if (players.length >= CONFIG.MAX_PLAYERS) {
        updateGameInfo(`Maksimum pemain adalah ${CONFIG.MAX_PLAYERS}`);
        return;
    }

    const newIndex = players.length;
    const colorClass = `player-${(newIndex % 4) + 1}`;
    const newPlayer = {
        name: `Pemain ${newIndex + 1}`,
        points: CONFIG.STARTING_POINTS,
        position: 0,
        color: colorClass,
        hasAngelCard: false,
        hasJailFreeCard: false,
    };

    players.push(newPlayer);

    const piece = document.createElement("div");
    piece.className = `player-piece ${newPlayer.color}`;
    piece.id = `player-${newIndex}`;
    const startTile = document.getElementById("tile-0");
    if (startTile) startTile.appendChild(piece);

    logMessage(`➕ ${newPlayer.name} ditambahkan ke permainan.`);
    updateUI();
}

/**
 * Remove last player (manual deletion before game starts)
 */
function removePlayer() {
    if (gameRunning) {
        updateGameInfo('Tidak dapat menghapus pemain saat permainan berjalan');
        return;
    }
    
    if (players.length <= CONFIG.MIN_PLAYERS) {
        updateGameInfo(`Minimal ${CONFIG.MIN_PLAYERS} pemain diperlukan`);
        return;
    }

    const removeIndex = players.length - 1;
    eliminatePlayer(removeIndex, `dihapus oleh host`);
    updateUI();
}

/**
 * Remove player from game (due to elimination, manual removal, or score <= 0)
 * Updates ownership, removes pieces, adjusts indices
 * @param {number} index - Player index to eliminate
 * @param {string} reason - Reason for elimination
 */
function eliminatePlayer(index, reason) {
    const name = players[index].name;

    const pieceEl = document.getElementById(`player-${index}`);
    if (pieceEl && pieceEl.parentNode) pieceEl.parentNode.removeChild(pieceEl);

    // Update ownership indices when player is eliminated
    const newCityOwnership = {};
    Object.keys(cityOwnership).forEach((tileIndex) => {
        const owner = cityOwnership[tileIndex];
        if (owner === index) {
            // Remove ownership if eliminated player owned it
            // Don't add to newCityOwnership
        } else if (owner > index) {
            // Shift ownership index down
            newCityOwnership[tileIndex] = owner - 1;
        } else {
            // Keep ownership as is
            newCityOwnership[tileIndex] = owner;
        }
    });
    cityOwnership = newCityOwnership;

    players.splice(index, 1);

    players.forEach((p, i) => {
        const el = document.getElementById(`player-${i >= index ? i + 1 : i}`);
        if (el) el.id = `player-${i}`;
    });

    if (players.length === 0) {
        gameRunning = false;
        updateGameInfo(`Semua pemain hilang. Permainan selesai.`);
        return;
    }

    if (currentPlayerIndex >= players.length) {
        currentPlayerIndex = currentPlayerIndex % players.length;
    }

    logMessage(`❌ ${name} dieliminasi ${reason ? `(${reason})` : ""}`);
    updateGameInfo(`${name} dieliminasi dari permainan.`);

    // Update ownership display for all owned tiles
    Object.keys(cityOwnership).forEach(tileIndex => {
        updateCityOwnershipDisplay(parseInt(tileIndex));
    });

    if (players.length === 1) {
        gameRunning = false;
        updateGameInfo(`🏆 ${players[0].name} MENANG!`);
        const rollBtn = document.getElementById("rollButton");
        if (rollBtn) rollBtn.disabled = true;
    }
}

/**
 * Check all players for elimination condition (points <= 0)
 * Called each turn during active game
 * @private
 */
function checkEliminations() {
    for (let i = players.length - 1; i >= 0; i--) {
        if (players[i].points <= 0) {
            eliminatePlayer(i, "skor 0 atau kurang");
        }
    }
}

// ===== MOVEMENT & DICE SYSTEM =====
/**
 * Roll dice with animation
 * Generates random 1-6 and calls movePlayer
 */
function rollDice() {
    if (!gameRunning) return;

    const rollBtn = document.getElementById("rollButton");
    const diceDisplay = document.getElementById("diceDisplay");
    if (!rollBtn || !diceDisplay) return;

    // Check if player is in jail
    const state = jailState[currentPlayerIndex];
    if (state && state.inJail) {
        // Player is in jail, this is a jail roll
        rollBtn.disabled = true;
        diceDisplay.classList.add("rolling");

        let rollCount = 0;
        const rollInterval = setInterval(() => {
            diceDisplay.textContent = Math.floor(Math.random() * 6) + 1;
            rollCount++;

            if (rollCount >= 10) {
                clearInterval(rollInterval);
                const finalRoll = Math.floor(Math.random() * 6) + 1;
                diceDisplay.textContent = finalRoll;
                diceDisplay.classList.remove("rolling");

                const player = players[currentPlayerIndex];
                logMessage(`🎲 ${player.name} lempar dadu di penjara: ${finalRoll}`);
                
                if (finalRoll === 6) {
                    jailState[currentPlayerIndex].inJail = false;
                    jailState[currentPlayerIndex].turnsInJail = 0;
                    logMessage(`✅ ${player.name} dapat 6! Keluar dari penjara`);
                    updateGameInfo(`Dapat 6! Anda keluar penjara dan bergerak ${finalRoll} langkah`);
                    movePlayer(currentPlayerIndex, finalRoll);
                } else {
                    jailState[currentPlayerIndex].turnsInJail++;
                    logMessage(`❌ ${player.name} dapat ${finalRoll}, tetap di penjara (giliran ke-${jailState[currentPlayerIndex].turnsInJail})`);
                    updateGameInfo(`Dapat ${finalRoll}, tidak cukup. Tetap di penjara. (Giliran ke-${jailState[currentPlayerIndex].turnsInJail})`);
                    
                    if (jailState[currentPlayerIndex].turnsInJail >= CONFIG.MAX_JAIL_TURNS) {
                        jailState[currentPlayerIndex].inJail = false;
                        jailState[currentPlayerIndex].turnsInJail = 0;
                        logMessage(`⚠️ ${player.name} terpaksa keluar setelah ${CONFIG.MAX_JAIL_TURNS} giliran di penjara`);
                        updateGameInfo(`Terpaksa keluar setelah ${CONFIG.MAX_JAIL_TURNS} giliran`);
                        updateUI();
                        nextPlayer();
                    } else {
                        updateUI();
                        nextPlayer();
                    }
                }
            }
        }, 100);
        return;
    }

    // Normal dice roll
    rollBtn.disabled = true;
    diceDisplay.classList.add("rolling");

    let rollCount = 0;
    const rollInterval = setInterval(() => {
        diceDisplay.textContent = Math.floor(Math.random() * 6) + 1;
        rollCount++;

        if (rollCount >= 10) {
            clearInterval(rollInterval);
            const finalRoll = Math.floor(Math.random() * 6) + 1;
            diceDisplay.textContent = finalRoll;
            diceDisplay.classList.remove("rolling");

            movePlayer(currentPlayerIndex, finalRoll);
        }
    }, 100);
}

/**
 * Move player forward N steps with animation
 * Handles START wrap-around bonus
 * @param {number} playerIndex - Index of player to move
 * @param {number} steps - Number of steps to move
 */
function movePlayer(playerIndex, steps) {
    const player = players[playerIndex];
    const playerPiece = document.getElementById(`player-${playerIndex}`);
    if (!playerPiece) return;

    const oldPosition = player.position;
    let moveCount = 0;
    
    const moveInterval = setInterval(() => {
        const currentTile = document.getElementById(`tile-${player.position}`);
        if (currentTile && currentTile.contains(playerPiece)) {
            currentTile.removeChild(playerPiece);
        }

        player.position = (player.position + 1) % CONFIG.BOARD_SIZE;

        const newTile = document.getElementById(`tile-${player.position}`);
        if (newTile) newTile.appendChild(playerPiece);

        moveCount++;

        if (moveCount >= steps) {
            clearInterval(moveInterval);

            if (oldPosition + steps >= CONFIG.BOARD_SIZE) {
                const bonus = CONFIG.START_PASS_BONUS;
                player.points += bonus;
                logMessage(`💰 ${player.name} melewati START! +${bonus} poin`);
                updateGameInfo(`${player.name} melewati START! +${bonus} poin`);
            }

            // Reset dice display after movement
            const diceDisplay = document.getElementById("diceDisplay");
            if (diceDisplay) {
                diceDisplay.textContent = "?";
            }

            handleTileEffect(player.position);
        }
    }, 250);
}

/**
 * Instantly move player to specific tile position
 * Used for "Go To" cards and parking selector
 * @param {number} playerIndex - Index of player to move
 * @param {number} newPosition - Target tile position (0-23)
 */
function movePlayerToPosition(playerIndex, newPosition) {
    const player = players[playerIndex];
    const playerPiece = document.getElementById(`player-${playerIndex}`);
    if (!playerPiece || !playerPiece.parentNode) return;

    const oldTile = playerPiece.parentNode;
    oldTile.removeChild(playerPiece);
    
    player.position = newPosition;
    const newTile = document.getElementById(`tile-${newPosition}`);
    if (newTile) newTile.appendChild(playerPiece);
}

// ===== TILE EFFECT SYSTEM =====
/**
 * Execute tile effect based on tile type
 * Routes to appropriate handler function
 * @param {number} position - Tile position on board
 * @private
 */
function handleTileEffect(position) {
    const tile = boardTiles[position];
    const player = players[currentPlayerIndex];

    switch (tile.type) {
        case "question":
            handleCityTile(position);
            break;
        case "opportunity":
            handleOpportunity();
            break;
        case "community":
            handleCommunity();
            break;
        case "parking":
            handleParking();
            break;
        case "jail":
            handleJail();
            break;
        default:
            nextPlayer();
            break;
    }
}

/**
 * Handle landing on city tile
 * Check ownership or allow purchase/fine
 * @param {number} position - Tile position
 * @private
 */
function handleCityTile(position) {
    const tile = boardTiles[position];
    const cityName = tile.name;
    const player = players[currentPlayerIndex];
    const ownerIndex = cityOwnership[position]; // Use position (tileIndex) instead of cityName
    
    if (ownerIndex !== undefined) {
        if (ownerIndex === currentPlayerIndex) {
            logMessage(`🏠 ${player.name} berada di kota sendiri: ${cityName}`);
            updateGameInfo(`🏠 Anda berada di kota sendiri: ${cityName}`);
            nextPlayer();
        } else {
            logMessage(`💰 ${player.name} harus bayar denda di ${cityName} milik ${players[ownerIndex].name}`);
            updateGameInfo(`💰 Anda harus menjawab pertanyaan untuk membayar denda di ${cityName}!`);
            showQuestionForFine(cityName, position);
        }
    } else {
        showBuyCityOption(cityName, position);
    }
}

/**
 * Handle free parking tile (select any city to move to)
 * @private
 */
function handleParking() {
    const player = players[currentPlayerIndex];
    logMessage(`🅿️ ${player.name} di PARKIR KEMANA SAJA - bisa pindah ke mana saja!`);
    updateGameInfo(`🅿️ Anda di PARKIR KEMANA SAJA! Klik tombol untuk memilih posisi tujuan.`);
    showParkingSelector();
}

/**
 * Show modal with parking destination options
 * @private
 */
function showParkingSelector() {
    const modal = document.getElementById("questionModal");
    const qText = document.getElementById("questionText");
    const answerContainer = document.getElementById("answerButtons");
    if (!modal || !qText || !answerContainer) return;
    
    qText.innerHTML = `<div style="font-size:18px; color:#9c27b0; font-weight:bold;">Pilih posisi tujuan (0-${CONFIG.BOARD_SIZE - 1}):</div>`;
    answerContainer.innerHTML = "";
    
    for (let i = 0; i < CONFIG.BOARD_SIZE; i += 3) {
        const btn = document.createElement("button");
        btn.className = "answer-button";
        btn.textContent = `Petak ${i}: ${boardTiles[i].name}`;
        btn.onclick = () => {
            movePlayerToPosition(currentPlayerIndex, i);
            modal.classList.add("hidden");
            logMessage(`🅿️ ${players[currentPlayerIndex].name} pindah ke petak ${i}`);
            updateGameInfo(`Pindah ke petak ${i}: ${boardTiles[i].name}`);
            nextPlayer();
        };
        answerContainer.appendChild(btn);
    }
    
    modal.classList.remove("hidden");
}

/**
 * Handle jail tile landing
 * Show options to pay or roll for escape
 * @private
 */
function handleJail() {
    const player = players[currentPlayerIndex];
    const state = jailState[currentPlayerIndex];
    
    // Reset dice display when entering jail
    const diceDisplay = document.getElementById("diceDisplay");
    if (diceDisplay) {
        diceDisplay.textContent = "?";
    }
    
    if (!state.inJail) {
        state.inJail = true;
        state.turnsInJail = 0;
        logMessage(`🔒 ${player.name} masuk PENJARA!`);
        updateGameInfo(`🔒 ${player.name} masuk PENJARA! Bayar ${CONFIG.JAIL_PAYMENT_COST} poin ATAU lempar dadu untuk dapat 6.`);
        showJailOptions();
    } else {
        // Player sudah di penjara, langsung tunjukkan opsi
        showJailOptions();
    }
}

/**
 * Show jail payment/dice options modal
 * @private
 */
function showJailOptions() {
    const modal = document.getElementById("questionModal");
    const qText = document.getElementById("questionText");
    const answerContainer = document.getElementById("answerButtons");
    const player = players[currentPlayerIndex];
    
    if (!modal || !qText || !answerContainer) return;
    
    // Reset dice display when showing jail options
    const diceDisplay = document.getElementById("diceDisplay");
    if (diceDisplay) {
        diceDisplay.textContent = "?";
    }
    
    // Disable roll button initially
    const rollBtn = document.getElementById("rollButton");
    if (rollBtn) {
        rollBtn.disabled = true;
    }
    
    qText.innerHTML = `<div style="font-size:18px; color:#d32f2f; font-weight:bold;">🔒 ${player.name} Di PENJARA</div>
        <div style="font-size:14px; margin-top:10px; color:#666;">Giliran: ${player.name}</div>
        <div style="font-size:14px; margin-top:10px;">Bayar ${CONFIG.JAIL_PAYMENT_COST} poin ATAU lempar dadu (harus dapat 6)</div>`;
    answerContainer.innerHTML = "";
    
    const payBtn = document.createElement("button");
    payBtn.className = "answer-button";
    payBtn.textContent = `Bayar ${CONFIG.JAIL_PAYMENT_COST} poin`;
    payBtn.onclick = () => {
        if (player.points >= CONFIG.JAIL_PAYMENT_COST) {
            player.points -= CONFIG.JAIL_PAYMENT_COST;
            jailState[currentPlayerIndex].inJail = false;
            jailState[currentPlayerIndex].turnsInJail = 0;
            modal.classList.add("hidden");
            logMessage(`💰 ${player.name} membayar ${CONFIG.JAIL_PAYMENT_COST} poin untuk keluar penjara`);
            updateGameInfo(`Anda membayar ${CONFIG.JAIL_PAYMENT_COST} poin dan keluar penjara`);
            updateUI();
            nextPlayer();
        } else {
            updateGameInfo(`Poin tidak cukup! Anda perlu ${CONFIG.JAIL_PAYMENT_COST} poin`);
        }
    };
    answerContainer.appendChild(payBtn);
    
    const diceBtn = document.createElement("button");
    diceBtn.className = "answer-button";
    diceBtn.textContent = "Lempar Dadu (Harus dapat 6)";
    diceBtn.onclick = () => {
        modal.classList.add("hidden");
        // Enable roll button for jail roll
        if (rollBtn) {
            rollBtn.disabled = false;
            updateGameInfo(`${player.name}: Klik tombol "Lempar Dadu" untuk mencoba keluar dari penjara (harus dapat 6)`);
        }
    };
    answerContainer.appendChild(diceBtn);
    
    modal.classList.remove("hidden");
}

// ===== CITY PURCHASE & FINE SYSTEM =====
/**
 * Show question for purchasing unclaimed city
 * @param {string} cityName - Name of city to purchase
 * @param {number} position - Tile position
 * @private
 */
function showBuyCityOption(cityName, position) {
    const player = players[currentPlayerIndex];
    const price = cityPrices[cityName] || 150;
    const selectedQuestion = getUnusedQuestion();
    
    currentQuestion = {
        question: selectedQuestion.q,
        answers: selectedQuestion.c,
        correct: selectedQuestion.a,
        cityName: cityName,
        tileIndex: position, // Store tile index for ownership tracking
        price: price,
        type: "buy",
        questionId: selectedQuestion.id
    };

    const qText = document.getElementById("questionText");
    if (qText) {
        qText.innerHTML = `
            <div style="margin-bottom: 10px; font-size: 16px; color: #4caf50;">
                🏙️ Kota: ${cityName}
            </div>
            <div style="font-weight: bold; margin-bottom: 10px;">
                Jawab pertanyaan dengan benar untuk membeli kota:
            </div>
            <div>${selectedQuestion.q}</div>
        `;
    }

    const answerContainer = document.getElementById("answerButtons");
    if (answerContainer) {
        answerContainer.innerHTML = "";
        currentQuestion.answers.forEach((answer, index) => {
            const button = document.createElement("button");
            button.className = "answer-button";
            button.textContent = answer;
            button.onclick = () => answerQuestion(index);
            answerContainer.appendChild(button);
        });
    }

    const modal = document.getElementById("questionModal");
    if (modal) modal.classList.remove("hidden");
}

/**
 * Show question for paying fine on owned city
 * @param {string} cityName - Name of city with owner
 * @param {number} tileIndex - Tile index for ownership tracking
 * @private
 */
function showQuestionForFine(cityName, tileIndex) {
    const selectedQuestion = getUnusedQuestion();
    
    currentQuestion = {
        question: selectedQuestion.q,
        answers: selectedQuestion.c,
        correct: selectedQuestion.a,
        cityName: cityName,
        tileIndex: tileIndex,
        type: "fine",
        questionId: selectedQuestion.id
    };

    const qText = document.getElementById("questionText");
    if (qText) {
        qText.innerHTML = `
            <div style="margin-bottom: 10px; font-size: 16px; color: #f44336;">
                ⚠️ Anda harus membayar denda di ${cityName}!
            </div>
            <div style="font-weight: bold; margin-bottom: 10px;">
                Jawab pertanyaan dengan benar untuk menghindari denda:
            </div>
            <div>${selectedQuestion.q}</div>
        `;
    }

    const answerContainer = document.getElementById("answerButtons");
    if (answerContainer) {
        answerContainer.innerHTML = "";
        currentQuestion.answers.forEach((answer, index) => {
            const button = document.createElement("button");
            button.className = "answer-button";
            button.textContent = answer;
            button.onclick = () => answerQuestion(index);
            answerContainer.appendChild(button);
        });
    }

    const modal = document.getElementById("questionModal");
    if (modal) modal.classList.remove("hidden");
}

// ===== QUESTION HANDLING =====
/**
 * Process answer to current question
 * Handles buy/fine/dana_umum question types with different point adjustments
 * @param {number} answerIndex - Index of selected answer (0-3)
 */
function answerQuestion(answerIndex) {
    const player = players[currentPlayerIndex];
    const isCorrect = answerIndex === currentQuestion.correct;
    const questionType = currentQuestion.type || "default";

    if (questionType === "buy") {
        handleBuyAnswerResult(player, isCorrect);
    } else if (questionType === "fine") {
        handleFineAnswerResult(player, isCorrect);
    } else if (questionType === "dana_umum") {
        handleDanaUmumAnswerResult(player, isCorrect);
    } else {
        handleDefaultAnswerResult(player, isCorrect);
    }

    const modal = document.getElementById("questionModal");
    if (modal) modal.classList.add("hidden");
    
    updateUI();
    nextPlayer();
}

/**
 * Handle answer result for city purchase question
 * Correct = buy city (no points deducted); Incorrect = -50 poin penalty
 * @param {Object} player - Player object
 * @param {boolean} isCorrect - Answer correctness
 * @private
 */
function handleBuyAnswerResult(player, isCorrect) {
    if (isCorrect) {
        const cityName = currentQuestion.cityName;
        const price = currentQuestion.price;
        // Get tile index from the question context - we need to find which tile was being purchased
        // We'll store it in currentQuestion when showing buy option
        const tileIndex = currentQuestion.tileIndex;
        
        if (tileIndex !== undefined) {
            // When answer is correct, player gets the city WITHOUT paying!
            // This is the reward for correct answer
            cityOwnership[tileIndex] = currentPlayerIndex;
            updateCityOwnershipDisplay(tileIndex);
            logMessage(`✅ ${player.name} menjawab benar! Mendapat kota ${cityName} tanpa biaya!`);
            updateGameInfo(`🎉 ${player.name} berhasil mendapat ${cityName} GRATIS karena jawaban benar!`);
        }
    } else {
        player.points -= CONFIG.WRONG_PURCHASE_PENALTY;
        logMessage(`❌ ${player.name} salah menjawab saat membeli! -${CONFIG.WRONG_PURCHASE_PENALTY} poin`);
        updateGameInfo(`😔 Jawaban salah! Anda kehilangan ${CONFIG.WRONG_PURCHASE_PENALTY} poin dan tidak bisa membeli kota.`);
    }
}

/**
 * Handle answer result for fine payment question
 * Correct = skip fine; Incorrect = -100 poin
 * @param {Object} player - Player object
 * @param {boolean} isCorrect - Answer correctness
 * @private
 */
function handleFineAnswerResult(player, isCorrect) {
    const cityName = currentQuestion.cityName;
    
    if (isCorrect) {
        logMessage(`✅ ${player.name} benar! Tidak perlu bayar denda di ${cityName}`);
        updateGameInfo(`🎉 Jawaban benar! Anda tidak perlu membayar denda.`);
    } else {
        player.points -= CONFIG.FINE_AMOUNT;
        logMessage(`❌ ${player.name} salah! Harus bayar denda ${CONFIG.FINE_AMOUNT} poin di ${cityName}`);
        updateGameInfo(`😔 Jawaban salah! Anda membayar denda ${CONFIG.FINE_AMOUNT} poin.`);
    }
}

/**
 * Handle answer result for DANA UMUM (community chest) question
 * Correct = +110 poin; Incorrect = -50 poin
 * @param {Object} player - Player object
 * @param {boolean} isCorrect - Answer correctness
 * @private
 */
function handleDanaUmumAnswerResult(player, isCorrect) {
    if (isCorrect) {
        const bonus = CONFIG.CORRECT_ANSWER_BONUS + CONFIG.CORRECT_DANA_UMUM_BONUS;
        player.points += bonus;
        logMessage(`✅ ${player.name} benar! +${bonus} poin`);
        updateGameInfo(`🎉 Jawaban benar! ${player.name} mendapat ${bonus} poin!`);
    } else {
        player.points -= CONFIG.WRONG_ANSWER_PENALTY;
        logMessage(`❌ ${player.name} salah! -${CONFIG.WRONG_ANSWER_PENALTY} poin`);
        updateGameInfo(`😔 Jawaban salah! ${player.name} kehilangan ${CONFIG.WRONG_ANSWER_PENALTY} poin.`);
    }
}

/**
 * Handle answer result for default question (fallback)
 * @param {Object} player - Player object
 * @param {boolean} isCorrect - Answer correctness
 * @private
 */
function handleDefaultAnswerResult(player, isCorrect) {
    if (isCorrect) {
        const bonus = CONFIG.CORRECT_ANSWER_BONUS + CONFIG.CORRECT_DANA_UMUM_BONUS;
        player.points += bonus;
        logMessage(`✅ ${player.name} benar! +${bonus} poin`);
        updateGameInfo(`🎉 Jawaban benar! ${player.name} mendapat ${bonus} poin!`);
    } else {
        player.points -= CONFIG.WRONG_ANSWER_PENALTY;
        logMessage(`❌ ${player.name} salah! -${CONFIG.WRONG_ANSWER_PENALTY} poin`);
        updateGameInfo(`😔 Jawaban salah! ${player.name} kehilangan ${CONFIG.WRONG_ANSWER_PENALTY} poin.`);
    }
}

// ===== CARD SYSTEMS =====
/**
 * Opportunity cards (KESEMPATAN) - special event cards with gacha system
 * Structure: {msg, money?, score?, move?, goTo?, bonus?, type}
 * @type {Array<Object>}
 */
let opportunityCards = [
    { msg: "🔓 Bebas dari penjara! Kartu ini dapat digunakan kapan saja untuk keluar penjara", type: "jail_free", id: 1 },
    { msg: "🏁 Maju sampai START! +50 poin bonus", goTo: 0, bonus: 50, id: 2 },
    { msg: "🇨🇳 Maju sampai China! Jika melewati start +20 poin", goTo: 11, bonus: 20, checkStart: true, id: 3 },
    { msg: "💰 Terima bunga dari bank +10 poin", money: 10, id: 4 },
    { msg: "➡️ Maju 3 langkah!", move: 3, id: 5 },
    { msg: "➡️ Maju 5 langkah!", move: 5, id: 6 },
    { msg: "💰 Terima bunga dari bank +5 poin", money: 5, id: 7 },
    { msg: "💸 Bayar pajak -10 poin", money: -10, id: 8 },
    { msg: "🛡️ Dapat kartu pelindung! Tidak akan kena pajak/denda pada giliran berikutnya", type: "protector", id: 9 },
    { msg: "⬅️ Mundur sampai START", goTo: 0, id: 10 },
    { msg: "🎁 Dapat hadiah +20 poin", money: 20, id: 11 },
    { msg: "💎 Dapat bonus +15 poin", money: 15, id: 12 },
    { msg: "🚀 Maju 4 langkah!", move: 4, id: 13 },
    { msg: "💸 Bayar denda -15 poin", money: -15, id: 14 },
    { msg: "🎯 Dapat hadiah spesial +25 poin", money: 25, id: 15 },
];

/**
 * Shuffle opportunity cards array
 * @private
 */
function shuffleOpportunityCards() {
    for (let i = opportunityCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opportunityCards[i], opportunityCards[j]] = [opportunityCards[j], opportunityCards[i]];
    }
}

/**
 * Community cards (DANA UMUM) - community chest cards with gacha system
 * @type {Array<Object>}
 */
let communityCards = [
    { msg: "🏥 Bayar BPJS -10 poin", money: -10, id: 1 },
    { msg: "💸 Bayar pajak -5 poin", money: -5, id: 2 },
    { msg: "🚗 Bayar cicilan mobil -25 poin", money: -25, id: 3 },
    { msg: "🏥 Bayar rumah sakit -10 poin", money: -10, id: 4 },
    { msg: "🔒 Masuk penjara!", goTo: 6, type: "jail", id: 5 },
    { msg: "⬅️ Mundur sampai START", goTo: 0, id: 6 },
    { msg: "🎁 Dapat bansos +15 poin", money: 15, id: 7 },
    { msg: "🚨 Kena tilang -15 poin", money: -15, id: 8 },
    { msg: "🎉 Dapat hadiah kejutan +15 poin", money: 15, id: 9 },
    { msg: "💰 Terima +5 poin dari setiap pemain", type: "collect_all", amount: 5, id: 10 },
    { msg: "🎊 Dapat bonus +20 poin", money: 20, id: 11 },
    { msg: "💳 Bayar tagihan -12 poin", money: -12, id: 12 },
    { msg: "🎁 Dapat hadiah +18 poin", money: 18, id: 13 },
    { msg: "🏦 Dapat dividen +12 poin", money: 12, id: 14 },
    { msg: "💸 Bayar asuransi -8 poin", money: -8, id: 15 },
];

/**
 * Shuffle community cards array
 * @private
 */
function shuffleCommunityCards() {
    for (let i = communityCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [communityCards[i], communityCards[j]] = [communityCards[j], communityCards[i]];
    }
}

/**
 * Handle opportunity/chance card landing
 * Gacha system - draws random opportunity card
 * @private
 */
function handleOpportunity() {
    // Shuffle cards before showing
    shuffleOpportunityCards();
    showCardModal("KESEMPATAN", opportunityCards);
}

/**
 * Handle community chest card landing
 * Shows card modal with random card selection
 * @private
 */
function handleCommunity() {
    // Shuffle cards before showing
    shuffleCommunityCards();
    showCardModal("DANA UMUM", communityCards);
}

/**
 * Execute opportunity card effect
 * Applies points/movement based on card type with gacha system
 * @param {number} cardIndex - Index of opportunity card to execute
 * @private
 */
function executeOpportunityCard(cardIndex) {
    const player = players[currentPlayerIndex];
    const card = opportunityCards[cardIndex];
    
    // Handle special card types
    if (card.type === "jail_free") {
        // Give player a get-out-of-jail-free card
        player.hasJailFreeCard = true;
        logMessage(`🎲 ${player.name}: ${card.msg}`);
        updateGameInfo(card.msg);
    } else if (card.type === "protector") {
        // Give player protector card (angel card)
        player.hasAngelCard = true;
        logMessage(`🎲 ${player.name}: ${card.msg}`);
        updateGameInfo(card.msg);
    } else if (card.move) {
        // Move player
        const oldPos = player.position;
        const newPos = (player.position + card.move + CONFIG.BOARD_SIZE) % CONFIG.BOARD_SIZE;
        movePlayerToPosition(currentPlayerIndex, newPos);
        
        // Check if passed start
        if (oldPos + card.move >= CONFIG.BOARD_SIZE) {
            player.points += CONFIG.START_PASS_BONUS;
            logMessage(`🎲 ${player.name}: ${card.msg} (Melewati START +${CONFIG.START_PASS_BONUS} poin)`);
        } else {
            logMessage(`🎲 ${player.name}: ${card.msg}`);
        }
        updateGameInfo(card.msg);
    } else if (card.goTo !== undefined) {
        // Move to specific position
        const oldPos = player.position;
        movePlayerToPosition(currentPlayerIndex, card.goTo);
        
        // Check if passed start (for China card)
        if (card.checkStart && oldPos > card.goTo) {
            player.points += (card.bonus || 0);
            logMessage(`🎲 ${player.name}: ${card.msg} (Melewati START +${card.bonus} poin)`);
        } else {
            player.points += (card.bonus || 0);
            logMessage(`🎲 ${player.name}: ${card.msg}`);
        }
        updateGameInfo(card.msg);
    } else {
        // Points only
        player.points += (card.money || 0);
        logMessage(`🎲 ${player.name}: ${card.msg}`);
        updateGameInfo(card.msg);
    }

    updateUI();
    closeCardModal();
    nextPlayer();
}

/**
 * Execute community card effect
 * Applies points/movement based on card type with gacha system
 * @param {number} cardIndex - Index of community card to execute
 * @private
 */
function executeCommunityCard(cardIndex) {
    const player = players[currentPlayerIndex];
    const card = communityCards[cardIndex];
    
    if (card.type === "collect_all") {
        // Collect from all players
        const amount = card.amount || 5;
        let total = 0;
        players.forEach((p, idx) => {
            if (idx !== currentPlayerIndex && p.points >= amount) {
                p.points -= amount;
                total += amount;
            }
        });
        player.points += total;
        logMessage(`📦 ${player.name}: ${card.msg} (Mendapat ${total} poin dari pemain lain)`);
        updateGameInfo(`${card.msg} - Mendapat ${total} poin dari pemain lain`);
    } else if (card.type === "jail" || (card.goTo === 6)) {
        // Go to jail
        movePlayerToPosition(currentPlayerIndex, 6);
        jailState[currentPlayerIndex] = { inJail: true, turnsInJail: 0 };
        logMessage(`📦 ${player.name}: ${card.msg}`);
        updateGameInfo(card.msg);
    } else if (card.goTo !== undefined) {
        // Move to specific position
        movePlayerToPosition(currentPlayerIndex, card.goTo);
        player.points += (card.money || 0);
        logMessage(`📦 ${player.name}: ${card.msg}`);
        updateGameInfo(card.msg);
    } else {
        // Points only
        player.points += (card.money || 0);
        logMessage(`📦 ${player.name}: ${card.msg}`);
        updateGameInfo(card.msg);
    }

    updateUI();
    closeCardModal();
    nextPlayer();
}

// ===== GAME FLOW & TURN SYSTEM =====
/**
 * Advance to next player's turn
 * Checks win conditions (last player standing only - no score limit)
 * Updates UI and enables dice roll button
 */
function nextPlayer() {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;

    if (gameStarted) {
        // Removed win condition based on score - game continues indefinitely
        // Game only ends when only one player remains
        
        if (players.length === 1) {
            gameRunning = false;
            updateGameInfo(`🏆 ${players[0].name} MENANG! Hanya satu pemain yang tersisa!`);
            logMessage(`🏆 GAME SELESAI! ${players[0].name} adalah pemenangnya!`);
            const rollBtn = document.getElementById("rollButton");
            if (rollBtn) rollBtn.disabled = true;
            return;
        }
    }

    // Reset dice display for next player
    const diceDisplay = document.getElementById("diceDisplay");
    if (diceDisplay) {
        diceDisplay.textContent = "?";
    }

    updateUI();
    
    // Check if current player is in jail
    const state = jailState[currentPlayerIndex];
    if (state && state.inJail) {
        const rollBtn = document.getElementById("rollButton");
        if (rollBtn) rollBtn.disabled = true;
        const currentPlayer = players[currentPlayerIndex];
        logMessage(`🔒 ${currentPlayer.name} masih di PENJARA. Pilih bayar atau lempar dadu.`);
        updateGameInfo(`🔒 ${currentPlayer.name} di PENJARA! Bayar ${CONFIG.JAIL_PAYMENT_COST} poin ATAU lempar dadu (harus dapat 6)`);
        showJailOptions();
    } else {
        const rollBtn = document.getElementById("rollButton");
        if (rollBtn) rollBtn.disabled = false;
    }
}

// ===== UI UPDATE SYSTEM =====
/**
 * Update all UI elements based on current game state
 * Checks eliminations, updates player stats, highlights current player
 */
function updateUI() {
    if (gameStarted) {
        checkEliminations();
    }

    if (players.length === 0) return;
    
    const currentPlayerText = document.getElementById("currentPlayerText");
    if (currentPlayerText) {
        currentPlayerText.textContent = `Giliran: ${players[currentPlayerIndex].name}`;
    }

    const statsContainer = document.getElementById("playerStats");
    if (statsContainer) {
        statsContainer.innerHTML = "";

        players.forEach((player, index) => {
            const card = document.createElement("div");
            card.className = "player-card";
            if (index === currentPlayerIndex) {
                card.style.background = "rgba(255,255,255,0.4)";
            }

            card.innerHTML = `
                <div>
                    <div class="player-name">${player.name}</div>
                    <div class="player-info">⭐ ${player.points} poin</div>
                </div>
            `;

            statsContainer.appendChild(card);
        });
    }
}

/**
 * Update game info message displayed to user
 * @param {string} message - Message to display
 */
function updateGameInfo(message) {
    const gameInfo = document.getElementById("gameInfo");
    if (gameInfo) gameInfo.textContent = message;
}

/**
 * Add timestamped message to game log
 * @param {string} message - Message to log
 */
function logMessage(message) {
    const log = document.getElementById("gameLog");
    if (!log) return;
    
    const logEntry = document.createElement("div");
    logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    log.appendChild(logEntry);
    // Use setTimeout to ensure DOM is updated before scrolling
    setTimeout(() => {
        log.scrollTop = log.scrollHeight;
    }, 0);
}

// ===== MODAL SYSTEM =====
/**
 * Show card modal with random card selection (GACHA SYSTEM)
 * Displays card message and apply button with animation
 * @param {string} cardType - Type of card ("KESEMPATAN" or "DANA UMUM")
 * @param {Array<Object>} cards - Array of card objects to choose from
 * @private
 */
function showCardModal(cardType, cards) {
    const modal = document.getElementById("cardModal");
    const header = document.getElementById("cardHeader");
    const content = document.getElementById("cardContent");
    
    if (!modal || !header || !content) {
        console.error("Modal elements not found");
        return;
    }
    
    // GACHA SYSTEM - Random card selection
    const randomIndex = Math.floor(Math.random() * cards.length);
    const selectedCard = cards[randomIndex];
    
    if (cardType === "KESEMPATAN") {
        header.innerHTML = `<h2>🎲 KESEMPATAN</h2><p style="font-size:12px; margin-top:5px;">Kartu Acak #${randomIndex + 1}</p>`;
        header.className = "card-header opportunity-header";
    } else {
        header.innerHTML = `<h2>📦 DANA UMUM</h2><p style="font-size:12px; margin-top:5px;">Kartu Acak #${randomIndex + 1}</p>`;
        header.className = "card-header community-header";
    }
    
    content.innerHTML = "";
    
    // Add spinning animation effect
    const messageDiv = document.createElement("div");
    messageDiv.className = "card-message";
    messageDiv.style.animation = "cardReveal 0.5s ease-out";
    messageDiv.textContent = selectedCard.msg;
    content.appendChild(messageDiv);
    
    const instructionDiv = document.createElement("div");
    instructionDiv.className = "card-instruction";
    instructionDiv.textContent = "✨ Kartu Gacha Terpilih! Klik tombol untuk menerapkan efek";
    content.appendChild(instructionDiv);
    
    const executeButton = document.createElement("button");
    executeButton.className = "card-execute-button";
    executeButton.textContent = "✨ Terapkan Kartu";
    executeButton.onclick = function() {
        if (cardType === "KESEMPATAN") {
            executeOpportunityCard(randomIndex);
        } else {
            executeCommunityCard(randomIndex);
        }
    };
    content.appendChild(executeButton);
    
    modal.classList.remove("hidden");
}

/**
 * Close card modal and clear content
 */
function closeCardModal() {
    const modal = document.getElementById("cardModal");
    if (modal) {
        modal.classList.add("hidden");
        const content = document.getElementById("cardContent");
        if (content) content.innerHTML = "";
    }
}

/**
 * Make closeCardModal globally accessible for HTML onclick handlers
 */
window.closeCardModal = closeCardModal;

// ===== INITIALIZATION =====
/**
 * Initialize game when page loads
 */
window.onload = initGame;
