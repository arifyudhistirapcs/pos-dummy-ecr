# POS Dummy - ECR Link WebSocket Client

Aplikasi POS (Point of Sale) dummy berbasis web untuk testing koneksi ke EDC (Electronic Data Capture) melalui aplikasi **ECR Link FMS BRI** menggunakan WebSocket Secure (WSS) atau WebSocket (WS).

## Dokumentasi Teknis

Implementasi berdasarkan **Technical Document ECR Link FMS BRI Version 4.9.0**

## Fitur

- ✅ **WebSocket Connection** - WSS (port 6746) dan WS (port 6745)
- ✅ **AES/ECB/PKCS5Padding Encryption** - Sesuai spesifikasi ECR Link
- ✅ **Multiple Action Types**:
  - **Sale** - Untuk Purchase, Brizzi, QRIS
  - **Contactless** - Untuk pembayaran Tap (Visa/Mastercard)
  - **Card Verification** - Verifikasi kartu kredit
  - **Cicilan** - Pembayaran dengan cicilan/installment
- ✅ **Menu Management** - Kelola menu dengan harga Rp 1 untuk testing
- ✅ **Activity Log** - Monitoring koneksi, request, response, dan error

## Spesifikasi Teknis

### Enkripsi

- **Algorithm**: AES/ECB/PKCS5Padding
- **Key Derivation**: SHA-1 hash dari secret key, ambil 16 bytes pertama
- **Secret Key (Development)**: `ECR2022secretKey`
- **Output**: Base64 encoded string

### WebSocket Connection

| Protocol | URL Format | Port |
|----------|------------|------|
| WS | `ws://{edc_ip}:{port}` | 6745 |
| WSS | `wss://{edc_ip}:{port}` | 6746 |

### Payload Structure

#### Sale (Purchase/Brizzi/QRIS)
```json
{
  "amount": 1000,
  "action": "Sale",
  "trx_id": "TXNXXXXXXXXXXX",
  "pos_address": "172.0.0.1",
  "time_stamp": "2024-01-15 10:30:00",
  "method": "purchase"
}
```

#### Contactless
```json
{
  "amount": 1000,
  "action": "Contactless",
  "trx_id": "TXNXXXXXXXXXXX",
  "pos_address": "172.0.0.1",
  "time_stamp": "2024-01-15 10:30:00",
  "method": "purchase"
}
```

#### Card Verification
```json
{
  "amount": 1000,
  "action": "Card Verification",
  "trx_id": "TXNXXXXXXXXXXX",
  "pos_address": "172.0.0.1",
  "time_stamp": "2024-01-15 10:30:00",
  "method": "purchase"
}
```

#### Cicilan (Installment)
```json
{
  "amount": 200000,
  "action": "Cicilan",
  "trx_id": "TXNXXXXXXXXXXX",
  "pos_address": "172.0.0.1",
  "time_stamp": "2024-01-15 10:30:00",
  "method": "purchase",
  "plan": "001",
  "periode": "06"
}
```

## Cara Menggunakan

### 1. Persiapan EDC

1. Pastikan EDC Anda telah terinstall aplikasi **ECR Link** versi 4.9.0 atau lebih baru
2. Pastikan aplikasi **FMS BRI** sudah terbuka di EDC
3. Buka aplikasi **ECR Link** di EDC
4. Pilih koneksi **Wi-Fi** dan aktifkan
5. Catat **IP Address** yang ditampilkan di aplikasi ECR Link

### 2. Konfigurasi POS

1. Buka menu **Pengaturan**
2. Isi konfigurasi:
   - **Protocol**: `WSS` (recommended) atau `WS`
   - **IP Address EDC**: IP dari ECR Link
   - **Port**: `6746` (WSS) atau `6745` (WS)
   - **POS Address**: `172.0.0.1` (default)
   - **Secret Key**: `ECR2022secretKey` (default untuk development)
   - **Default Action Type**: Pilih tipe transaksi default
3. Klik **Simpan Pengaturan**
4. Klik **Test Connection** atau **Connect**

### 3. Melakukan Transaksi

1. Pilih menu **Kasir**
2. Pilih **Tipe Transaksi**:
   - **Sale** - Untuk kartu kredit/debit, Brizzi, atau QRIS
   - **Contactless** - Untuk pembayaran Tap
   - **Card Verification** - Verifikasi kartu kredit
   - **Cicilan** - Pembayaran dengan cicilan
3. Jika memilih **Sale**, pilih metode pembayaran:
   - **Purchase** - Kartu Kredit/Debit
   - **Brizzi** - Kartu Brizzi
   - **QRIS** - QRIS Payment
4. Tambahkan item ke cart (klik menu)
5. Klik **Bayar Sekarang**
6. Tunggu EDC merespons
7. Lihat hasil transaksi di modal

## ⚠️ PENTING: SSL Certificate Pinning

**EDC menggunakan SSL Certificate Pinning dengan public key specific.**

Ini berarti:
- EDC memiliki **self-signed certificate** dengan RSA public key tertentu
- WSS (port 6746) **tidak bisa langsung connect** dari browser tanpa setup tambahan
- **Solusi:** Gunakan **WS (Port 6745)** atau setup certificate pinning

### Solusi Cepat (Untuk Testing):
```bash
# Jalankan local server
cd pos-dummy-ecr-link
python3 -m http.server 3000

# Buka http://localhost:3000
# Setting: Protocol = WS, Port = 6745
```

**Detail lengkap:** Lihat [SSL_PINNING.md](SSL_PINNING.md)

---

## Struktur File

```
pos-dummy-ecr-link/
├── index.html              # Main HTML file
├── styles.css              # Styling CSS
├── app.js                  # JavaScript logic & WebSocket client
├── pcsindonesia_wss.pem    # Public key untuk WSS (SSL Pinning)
├── README.md               # Dokumentasi ini
└── SSL_PINNING.md          # Dokumentasi SSL Pinning
```

## Menjalankan Aplikasi

### Opsi 1: GitHub Pages (Online)

Akses langsung di: `https://arifyudhistirapcs.github.io/pos-dummy-ecr/`

⚠️ **Catatan**: Jika menggunakan GitHub Pages (HTTPS), EDC harus support WSS (port 6746).

### Opsi 2: Local Server

```bash
# Clone repository
git clone https://github.com/arifyudhistirapcs/pos-dummy-ecr.git
cd pos-dummy-ecr

# Jalankan dengan Python
python3 -m http.server 3000

# Buka browser
http://localhost:3000
```

## Response Fields

### Success Response (rc: "00")

| Field | Description |
|-------|-------------|
| `acq_mid` | Merchant ID dari EDC |
| `acq_tid` | Terminal ID dari EDC |
| `action` | Tipe transaksi |
| `amount` | Jumlah transaksi |
| `approval` | Kode approval |
| `batch_number` | Nomor batch |
| `card_name` | Nama kartu (Visa, Mastercard, NSICCS, JCB) |
| `card_type` | Tipe kartu (CHIP, TAP, SCAN) |
| `card_category` | Kategori kartu |
| `is_credit` | Apakah kartu kredit (true/false) |
| `is_off_us` | Apakah kartu bank lain (true/false) |
| `pan` | Nomor kartu (masked) |
| `reference_number` | Nomor referensi transaksi |
| `trace_number` | Nomor trace transaksi |
| `status` | Status (success, paid, failed) |
| `transaction_date` | Waktu transaksi |

### Error Response

| rc | Description |
|----|-------------|
| `50` | PIN Salah |
| `51` | Saldo tidak cukup |
| `-01` | Transaksi dibatalkan |
| `-30005` | Timeout |

## Troubleshooting

### Tidak bisa connect ke EDC

1. **Cek IP Address**: Pastikan IP address sesuai dengan ECR Link
2. **Cek Port**: WSS (6746) atau WS (6745)
3. **Cek Jaringan**: POS dan EDC harus di jaringan yang sama
4. **Cek ECR Link**: Pastikan aplikasi ECR Link aktif
5. **Mixed Content**: Jika menggunakan HTTPS (GitHub Pages), EDC harus support WSS

### Enkripsi Error

- Pastikan **Secret Key** benar: `ECR2022secretKey`
- Key akan di-hash menggunakan SHA-1 dan diambil 16 bytes pertama

### WebSocket Error

- Cek **Activity Log** untuk detail error
- Coba reconnect dengan klik tombol **Connect**
- Restart aplikasi ECR Link di EDC

### Error WSS - Code 1006

**Error:** `WebSocket closed: Code 1006, Reason: No reason provided`

**Penyebab:** EDC kemungkinan besar **tidak support WSS** (WebSocket Secure)

**Ciri-ciri EDC tidak support WSS:**
- Error Code 1006 muncul berulang kali
- Tidak bisa connect meski IP dan port sudah benar

**Solusi:**

#### 1. Ganti ke WS (Port 6745)
```
Pengaturan:
- Protocol: WS (ws://)
- Port: 6745
```

⚠️ **Jika menggunakan GitHub Pages (HTTPS)**:
Browser akan memblokir WS karena mixed content. Solusinya:

#### 2. Gunakan Local Server
```bash
# Download aplikasi
git clone https://github.com/arifyudhistirapcs/pos-dummy-ecr.git
cd pos-dummy-ecr

# Jalankan server
python3 -m http.server 3000

# Buka http://localhost:3000
# Setting: Protocol = WS, Port = 6745
```

#### 3. Cek EDC Anda
1. Buka aplikasi ECR Link di EDC
2. Lihat port yang ditampilkan:
   - Kalau **6745** → Gunakan WS
   - Kalau **6746** → Gunakan WSS
3. Kebanyakan EDC hanya support **6745 (WS)**

### Error WSS - Code 1015

**Error:** TLS Handshake failed

**Penyebab:** SSL/TLS certificate EDC bermasalah atau tidak valid

**Solusi:**
- Gunakan WS (port 6745) sebagai alternatif
- Atau pastikan EDC punya certificate SSL yang valid

## Keyboard Shortcuts

| Shortcut | Fungsi |
|----------|--------|
| `ESC` | Tutup modal |
| `F2` | Bayar (saat ada item di cart) |

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Changelog

### v1.0.0
- Initial release
- WebSocket WS/WSS support (port 6745/6746)
- AES/ECB/PKCS5Padding encryption
- Action types: Sale, Contactless, Card Verification, Cicilan
- Payment methods: Purchase, Brizzi, QRIS
- Activity logging

## Lisensi

Internal Use Only - Dibuat untuk testing integrasi ECR Link FMS BRI

## Referensi

- Technical Document ECR Link FMS BRI Version 4.9.0
- ECR Link Implementation Guide v4.10.1
