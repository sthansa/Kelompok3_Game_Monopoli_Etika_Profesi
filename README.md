# 🎲 Game Edukasi Monopoli - Etika Profesi

Game monopoli edukatif untuk belajar etika profesi dengan cara yang menyenangkan.

## 📁 Struktur Folder

```
monopoli-master/
├── index.php              # File utama (PHP)
├── assets/
│   ├── css/
│   │   └── styles.css     # Styling game
│   ├── js/
│   │   ├── script.js      # Logika game utama
│   │   └── questions.js   # Soal-soal (70 soal)
│   └── images/            # Gambar assets
├── data/
│   ├── SOAL_TEMPLATE.txt  # Template soal asli
│   └── questions.json     # Soal dalam format JSON
└── README.md              # Dokumentasi ini
```

## ✨ Fitur yang Telah Diimplementasikan

### ✅ Sistem Kartu Gacha
- **Kesempatan (10 kartu)**: Sistem acak dengan efek berbeda
- **Dana Umum (10 kartu)**: Sistem acak dengan efek berbeda
- Animasi kartu saat muncul (card reveal animation)

### ✅ Kartu Kesempatan
1. Bebas dari penjara
2. Maju sampai start (+50 poin)
3. Maju sampai China (jika melewati start +20 poin)
4. Terima bunga dari bank +10 poin
5. Maju 3 langkah
6. Maju 5 langkah
7. Terima bunga dari bank +5 poin
8. Bayar pajak -10 poin
9. Dapat kartu pelindung
10. Mundur sampai start

### ✅ Kartu Dana Umum
1. Bayar BPJS -10 poin
2. Bayar pajak -5 poin
3. Bayar cicilan mobil -25 poin
4. Bayar rumah sakit -10 poin
5. Masuk penjara
6. Mundur sampai start
7. Dapat bansos +15 poin
8. Kena tilang -15 poin
9. Dapat hadiah kejutan +15 poin
10. Terima +5 poin dari setiap pemain

### ✅ Desain yang Diperbaiki
- Animasi shimmer pada judul
- Animasi card reveal saat kartu muncul
- Desain yang lebih modern dan rapi
- Responsif untuk mobile

### ✅ Organisasi File
- File-file dipindahkan ke folder yang sesuai
- File tidak berguna telah dihapus
- Struktur folder yang rapi dan terorganisir

## 🚀 Cara Menggunakan

1. Pastikan server PHP berjalan (atau gunakan XAMPP/WAMP)
2. Buka `index.php` di browser
3. Klik "Mulai Permainan"
4. Lempar dadu dan mainkan!

## 📝 Catatan

- Soal-soal telah diupdate dari `SOAL_TEMPLATE.txt` (70 soal)
- Sistem gacha/random card telah diimplementasikan
- Semua kartu sesuai dengan spesifikasi yang diminta

## 🎮 Fitur Game

- 4 pemain default (dapat ditambah/dikurangi)
- 24 petak papan permainan
- 10 kota yang dapat dibeli
- Sistem penjara
- Sistem kartu acak (gacha)
- Sistem poin dan eliminasi
- Log permainan real-time

## 🔧 Teknologi

- PHP (untuk struktur)
- JavaScript (untuk logika game)
- CSS3 (untuk styling dan animasi)
- HTML5

---

**Dibuat dengan ❤️ untuk pembelajaran etika profesi**

