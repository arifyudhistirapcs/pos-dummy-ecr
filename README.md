# POS Dummy - ECR Link WebSocket Client

Aplikasi POS (Point of Sale) dummy berbasis web untuk testing koneksi ke EDC (Electronic Data Capture) melalui aplikasi **ECR Link** menggunakan WebSocket Secure (WSS).

## Fitur

- ✅ **Konfigurasi IP EDC** - Atur IP address EDC sesuai dengan yang ditampilkan di aplikasi ECR Link
- ✅ **Menu Management** - Tambah, hapus, dan kelola menu dengan harga default Rp 1 untuk testing
- ✅ **Metode Pembayaran** - Mendukung Kartu Kredit/Debit, QRIS, QRIS TAP, dan Alipay
- ✅ **WebSocket Connection** - Koneksi WS (port 6745) dan WSS (port 6746)
- ✅ **Enkripsi Payload** - Enkripsi AES-256 untuk mengamankan data transaksi
- ✅ **Activity Log** - Log real-time untuk monitoring koneksi, request, response, dan error

## Struktur File

```
pos-dummy-ecr-link/
├── index.html      # Main HTML file
├── styles.css      # Styling CSS
├── app.js          # JavaScript logic & WebSocket client
└── README.md       # Dokumentasi ini
```

## Cara Menggunakan

### 1. Persiapan EDC

1. Pastikan EDC Anda telah terinstall aplikasi **ECR Link** versi 4.10.1 atau lebih baru
2. Pastikan aplikasi **FMS BRI** sudah terbuka di EDC
3. Buka aplikasi **ECR Link** di EDC
4. Pilih koneksi **Wi-Fi** dan aktifkan
5. Catat **IP Address** yang ditampilkan di aplikasi ECR Link

### 2. Menjalankan POS Dummy

#### Opsi A: Buka Langsung File HTML
1. Buka file `index.html` di browser modern (Chrome, Firefox, Edge, Safari)
2. Tidak perlu server khusus, bisa langsung double-click file HTML

#### Opsi B: Menggunakan Local Server (Recommended)
```bash
# Menggunakan Python 3 (port bebas, contoh: 3000)
cd pos-dummy-ecr-link
python3 -m http.server 3000

# Menggunakan Node.js (port bebas, contoh: 3000)
npx http-server -p 3000

# Menggunakan PHP
php -S localhost:3000

# Buka browser dan akses: http://localhost:3000
# (Ganti 3000 dengan port lain seperti 5000, 8000, 9000, dll)
```

### 3. Konfigurasi Koneksi

1. Klik menu **Pengaturan** di sidebar
2. Isi konfigurasi berikut:
   - **Protocol**: Pilih `WSS (wss://)` untuk koneksi secure
   - **IP Address EDC**: Masukkan IP address dari aplikasi ECR Link
   - **Port**: 
     - `6745` untuk WS (non-secure)
     - `6746` untuk WSS (secure)
   - **Merchant ID**: ID merchant Anda (opsional)
   - **Terminal ID**: ID terminal Anda (opsional)
   - **Encryption Key**: Kunci enkripsi hex 32 karakter untuk AES-256
3. Klik **Simpan Pengaturan**
4. Klik **Test Connection** atau **Connect** untuk menghubungkan ke EDC

### 4. Melakukan Transaksi

1. Klik menu **Kasir** di sidebar
2. Pilih item menu yang ingin dipesan (klik pada menu item)
3. Atur quantity jika diperlukan
4. Pilih **Metode Pembayaran**:
   - Kartu Kredit/Debit
   - QRIS
   - QRIS TAP
   - Alipay
5. Klik tombol **Bayar Sekarang**
6. Tunggu proses pembayaran selesai
7. EDC akan menampilkan halaman transaksi sesuai metode yang dipilih
8. Setelah transaksi selesai, response akan ditampilkan di POS

### 5. Monitoring

- **Activity Log**: Klik menu **Activity Log** untuk melihat:
  - Status koneksi WebSocket
  - Payload yang dikirim (encrypted)
  - Response dari EDC
  - Error jika terjadi masalah

## Spesifikasi Payload ECR Link

### Format Request

```json
{
  "type": "PAYMENT_REQUEST",
  "token": "<ENCRYPTED_PAYLOAD>",
  "raw": {
    "transactionId": "TXNXXXXXXXXXXX",
    "merchantId": "MERCHANT001",
    "terminalId": "TERMINAL001",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "paymentMethod": "CREDIT_CARD|QRIS|QRIS_TAP|ALIPAY",
    "amount": 1000,
    "currency": "IDR",
    "items": [
      {
        "name": "Nasi Goreng",
        "qty": 1,
        "price": 1
      }
    ],
    "metadata": {
      "posVersion": "1.0.0",
      "ecrLinkVersion": "4.10.1"
    }
  }
}
```

### Enkripsi

Payload dienkripsi menggunakan **AES-256-CBC** dengan format:
- Key: 32 bytes hex string (64 karakter hex)
- IV: 16 bytes random, di-prefix ke encrypted data
- Output: Hex string (IV + encrypted data)

### Format Response

```json
{
  "success": true|false,
  "transactionId": "TXNXXXXXXXXXXX",
  "message": "Payment processed successfully",
  "error": "Error message if failed"
}
```

## Troubleshooting

### Tidak bisa connect ke EDC

1. **Cek IP Address**: Pastikan IP address yang dimasukkan sesuai dengan yang ditampilkan di ECR Link
2. **Cek Port**: 
   - WS menggunakan port **6745**
   - WSS menggunakan port **6746**
3. **Cek Jaringan**: Pastikan POS (komputer/browser) dan EDC terhubung ke jaringan Wi-Fi yang sama
4. **Cek ECR Link**: Pastikan aplikasi ECR Link di EDC sudah aktif dan menampilkan IP address
5. **Firewall**: Pastikan tidak ada firewall yang memblokir koneksi WebSocket

### WebSocket Error

Jika terjadi error saat koneksi:
1. Cek **Activity Log** untuk detail error
2. Coba reconnect dengan klik tombol **Connect** lagi
3. Restart aplikasi ECR Link di EDC
4. Pastikan FMS BRI sudah terbuka di EDC

### Enkripsi Error

Jika enkripsi gagal:
1. Pastikan **Encryption Key** berupa hex string 32 karakter (64 karakter)
2. Contoh key yang valid: `0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF`
3. Jika enkripsi gagal, aplikasi akan menggunakan base64 sebagai fallback

## Keyboard Shortcuts

| Shortcut | Fungsi |
|----------|--------|
| `ESC` | Tutup modal/popup |
| `F2` | Proses pembayaran (saat ada item di cart) |

## Browser Compatibility

Aplikasi ini menggunakan WebSocket dan Web Crypto API yang didukung oleh:
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Keamanan

⚠️ **Peringatan Keamanan**:
- Aplikasi ini menggunakan enkripsi AES-256 di browser client-side
- Encryption key disimpan di localStorage browser
- Untuk produksi, gunakan HTTPS dan pertimbangkan server-side encryption
- Pastikan koneksi WSS (WebSocket Secure) digunakan untuk enkripsi transport layer

## Changelog

### v1.0.0
- Initial release
- WebSocket WS/WSS connection support
- AES-256 encryption for payload
- Menu management
- Multiple payment methods (Credit/Debit, QRIS, QRIS TAP, Alipay)
- Activity logging
- Cart functionality

## Lisensi

Internal Use Only - Dibuat untuk testing integrasi ECR Link

## Kontak Support

Untuk pertanyaan atau issue, silakan hubungi tim developer ECR Link.
