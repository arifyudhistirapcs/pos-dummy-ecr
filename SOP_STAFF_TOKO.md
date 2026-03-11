# SOP Setup POS Dummy di Toko

## 📋 Daftar Isi
1. [Persiapan](#1-persiapan)
2. [Install Sertifikat SSL](#2-install-sertifikat-ssl-untuk-wss)
3. [Setting POS Dummy](#3-setting-pos-dummy)
4. [Test Transaksi](#4-test-transaksi)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Persiapan

### Cek Komputer POS:
- [ ] Windows 10/11
- [ ] Google Chrome (terinstall)
- [ ] Koneksi WiFi ke jaringan toko
- [ ] Aplikasi ECR Link di EDC sudah aktif

### ⚠️ PENTING: Static IP EDC
Pastikan EDC menggunakan **Static IP** (bukan DHCP):
- IP EDC tidak boleh berubah-ubah
- Jika IP berubah, POS tidak bisa connect
- Hubungi IT support jika EDC masih menggunakan DHCP

### Info yang Dibutuhkan:
- IP Address EDC (lihat di aplikasi ECR Link di EDC)
- Contoh: `192.168.1.10` (harus static)

---

## 2. Install Sertifikat SSL (Untuk WSS)

### Langkah 1: Download Sertifikat
1. Buka browser Chrome di komputer POS
2. Kunjungi: `https://arifyudhistirapcs.github.io/pos-dummy-ecr/`
3. Klik menu **Pengaturan** (ikon gear di sidebar)
4. Scroll ke bawah, klik tombol **"Setup Sertifikat (WSS)"**
5. Klik tombol **"Download Sertifikat CA"**
6. File `pcsindonesia_ca.crt` akan ter-download

### Langkah 2: Install Sertifikat ke Windows
1. Buka folder **Downloads**
2. Klik kanan file `pcsindonesia_ca.crt`
3. Pilih **"Install Certificate..."**
   
   ![Install Certificate](assets/install-cert-1.png)

4. Pilih **"Local Machine"** → Klik **Next**
   
   > **Catatan:** Jika muncul UAC (User Account Control), klik **Yes**

5. Pilih **"Place all certificates in the following store"**
   
   ![Certificate Store](assets/install-cert-2.png)

6. Klik **Browse...**

7. Pilih **"Trusted Root Certification Authorities"**
   
   ![Trusted Root](assets/install-cert-3.png)

8. Klik **OK** → **Next** → **Finish**

9. Jika muncul warning **Security Warning**, klik **Yes**
   
   ![Security Warning](assets/install-cert-4.png)

10. Muncul pesan **"The import was successful"** → Klik **OK**

### Langkah 3: Restart Chrome
1. Tutup semua tab Chrome
2. Buka ulang Google Chrome
3. Kembali ke POS Dummy (refresh halaman)

---

## 3. Setting POS Dummy

### Langkah 1: Buka POS Dummy
1. Buka browser Chrome
2. Kunjungi: `https://arifyudhistirapcs.github.io/pos-dummy-ecr/`
3. Tunggu halaman loading selesai

### Langkah 2: Setting Koneksi EDC
1. Klik menu **Pengaturan** di sidebar kiri
2. Isi form berikut:

| Field | Nilai | Contoh |
|-------|-------|--------|
| Protocol | **WSS** | wss:// |
| IP Address EDC | *(IP dari ECR Link)* | 192.168.1.10 |
| Port | **6746** | 6746 |
| POS Address | **172.0.0.1** | 172.0.0.1 |
| Secret Key | **ECR2022secretKey** | ECR2022secretKey |

3. Klik **"Simpan Pengaturan"**

### Langkah 3: Test Koneksi
1. Klik tombol **"Test Connection"**
2. Lihat status di **Activity Log**:
   - ✅ **Connected** = Berhasil
   - ❌ **Disconnected** = Cek IP dan sertifikat

Atau bisa juga klik **"Setup Sertifikat (WSS)"** → **"Test Koneksi WSS"**

---

## 4. Test Transaksi

### Test Sale (Pembelian)
1. Klik menu **Kasir**
2. Pilih beberapa menu makanan/minuman
3. Pilih **Tipe Transaksi: Sale**
4. Pilih **Metode: Purchase**
5. Klik **"Bayar Sekarang"**
6. Pastikan EDC muncul halaman transaksi
7. Selesaikan transaksi di EDC
8. Lihat hasil di POS Dummy

---

## 5. Troubleshooting

### Masalah: "WebSocket closed: Code 1006"

**Penyebab:** Sertifikat belum ter-install dengan benar

**Solusi:**
1. Pastikan sertifikat di-install ke **"Trusted Root Certification Authorities"**
2. Restart Chrome setelah install sertifikat
3. Coba ulang install sertifikat
4. Jika masih gagal, restart komputer

### Masalah: "Failed to create WebSocket"

**Penyebab:** Protocol tidak cocok (WS vs WSS)

**Solusi:**
1. Pastikan Protocol di-setting ke **WSS** (bukan WS)
2. Pastikan Port **6746** (bukan 6745)

### Masalah: Tidak bisa connect ke EDC

**Cek:**
1. Apakah aplikasi ECR Link di EDC sudah dibuka?
2. Apakah IP Address EDC sudah benar? **Pastikan IP tidak berubah dari settingan awal**
3. Apakah POS dan EDC terhubung ke WiFi yang sama?
4. Coba ping IP EDC dari komputer POS:
   - Buka Command Prompt (CMD)
   - Ketik: `ping 192.168.1.10` (ganti dengan IP EDC)
   - Jika timeout, berarti koneksi bermasalah

**Jika IP EDC berubah:**
- Tandanya EDC menggunakan DHCP (bukan Static IP)
- Hubungi IT support segera
- Jangan coba edit hosts file sendiri tanpa instruksi IT

### Masalah: "This site can't be reached"

**Penyebab:** Tidak ada koneksi internet

**Solusi:**
1. POS Dummy bisa jalan tanpa internet (localhost)
2. Tapi untuk load dari GitHub Pages, perlu internet
3. Alternatif: Download file POS Dummy dan buka lokal (index.html)

---

## 📞 Kontak Support

Jika mengalami masalah:
1. Screenshot error message
2. Catat langkah-langkah yang sudah dicoba
3. Hubungi tim IT support

---

## ✅ Checklist Setup

- [ ] Download sertifikat CA
- [ ] Install sertifikat ke Trusted Root CA
- [ ] Restart Chrome
- [ ] Setting IP EDC di POS Dummy
- [ ] Test koneksi WSS
- [ ] Test transaksi Rp 1
- [ ] POS siap digunakan! 🎉

---

**Catatan Penting:**
- Simpan file sertifikat (`pcsindonesia_ca.crt`) di folder yang aman
- Jika komputer di-reformat, perlu install ulang sertifikat
- Jika IP EDC berubah, update di menu Pengaturan
