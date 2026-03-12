# Android Tablet POS Setup Guide

## Overview

Panduan ini untuk setup POS Dummy ECR Link di Android Tablet (tanpa root access).

## Problem

Android tidak bisa edit `/etc/hosts` file tanpa root access, dan browser Android strict terhadap SSL/HTTPS validation.

## Solusi

### Solusi 1: DNS Changer App (Recommended - Paling Mudah)

Menggunakan aplikasi VPN lokal yang bisa override DNS resolution.

#### Aplikasi yang Direkomendasikan:

1. **Hosts Go** (Play Store)
   - Gratis, mudah digunakan
   - Support custom hosts entries
   - Tidak perlu root

2. **Virtual Hosts** (Play Store)
   - Load hosts file dari storage
   - Support wildcard domains
   - Interface sederhana

#### Langkah Setup (Hosts Go):

1. Install **Hosts Go** dari Google Play Store
2. Buka aplikasi, tap menu (☰) → **Hosts**
3. Tambahkan entry baru:
   ```
   IP: 192.168.1.100 (IP EDC Anda)
   Domain: store001.pcsindonesia.com
   ```
4. Tap **Save**
5. Kembali ke home, tap tombol **START** (akan membuat VPN lokal)
6. Berikan izin VPN jika diminta
7. Buka Chrome, akses: `https://arifyudhistirapcs.github.io/pos-dummy-ecr/`
8. Setting subdomain: `store001`
9. Test koneksi ke EDC

#### Langkah Setup (Virtual Hosts):

1. Install **Virtual Hosts** dari Play Store
2. Buat file `hosts.txt` di storage Android:
   ```
   192.168.1.100 store001.pcsindonesia.com
   ```
3. Buka Virtual Hosts, tap **Select Hosts File**
4. Pilih file `hosts.txt` yang dibuat
5. Tap **Start**
6. Berikan izin VPN
7. POS Dummy siap digunakan

---

### Solusi 2: Setup DNS di Router (Best for Multiple Devices)

Jika toko Anda punya access ke router WiFi, setup DNS static di router.

#### Keuntungan:
- Semua device otomatis resolve domain
- Tidak perlu install aplikasi di setiap tablet
- Maintenance lebih mudah

#### Contoh Setup (Router MikroTik):
```
/ip dns static
add name=store001.pcsindonesia.com address=192.168.1.100
```

#### Contoh Setup (Router TP-Link):
1. Login admin panel (biasanya `192.168.0.1` atau `192.168.1.1`)
2. Menu **Advanced** → **Network** → **DHCP Server**
3. Section **DNS** atau **Static DNS**
4. Tambahkan:
   - Hostname: `store001.pcsindonesia.com`
   - IP Address: `192.168.1.100` (IP EDC)
5. Save & Reboot router

#### Contoh Setup (Router UniFi):
1. Login UniFi Controller
2. Settings → Networks → LAN
3. DHCP Name Server → Custom
4. Tambahkan DNS static entries
5. Apply Changes

---

### Solusi 3: Local HTTP Server (Termux)

Jalankan POS Dummy langsung di Android tablet.

#### Requirements:
- Android 7.0+
- Storage: 200MB
- RAM: 2GB+

#### Langkah:

1. Install **Termux** dari Play Store atau F-Droid
2. Buka Termux, jalankan commands:
   ```bash
   # Update packages
   pkg update -y
   
   # Install Python & Git
   pkg install python git -y
   
   # Clone repository
   git clone https://github.com/arifyudhistirapcs/pos-dummy-ecr.git
   
   # Enter directory
   cd pos-dummy-ecr
   
   # Edit hosts file (Termux bisa edit hosts tanpa root)
   echo "192.168.1.100 store001.pcsindonesia.com" >> /data/data/com.termux/files/usr/etc/hosts
   
   # Start server
   python -m http.server 3000
   ```
3. Buka browser, akses: `http://localhost:3000`
4. POS Dummy berjalan di tablet!

#### Keuntungan:
- Tidak perlu internet setelah clone
- Bisa edit hosts (Termux environment)
- Full control

#### Kekurangan:
- Perlu jalankan Termux setiap boot
- Lebih kompleks untuk non-technical user

---

### Solusi 4: Custom WebView APK (Production Ready)

Build APK custom khusus untuk toko Anda.

#### Fitur:
- Icon launcher dedicated
- Custom DNS resolver (bypass hosts limitation)
- SSL bypass untuk domain internal
- Auto-connect ke EDC
- Splash screen toko

#### Cara Dapatkan:
Hubungi developer untuk build APK custom dengan:
- Nama toko & logo
- Subdomain yang digunakan
- IP EDC statis
- Fitur tambahan jika diperlukan

---

## Troubleshooting Android

### Masalah: VPN App tidak bisa start
**Solusi:**
- Pastikan tidak ada VPN lain yang aktif
- Cek izin: Settings → Apps → [VPN App] → Permissions → VPN → Allow
- Restart tablet

### Masalah: Browser tetap tidak resolve domain
**Solusi:**
- Clear browser cache: Chrome → Settings → Privacy → Clear browsing data
- Gunakan Incognito mode untuk test
- Coba browser lain (Firefox, Samsung Internet)
- Pastikan VPN status "Connected"

### Masalah: "NET::ERR_CERT_AUTHORITY_INVALID"
**Solusi:**
- Ini SSL error karena GitHub Pages (HTTPS) ke WSS (self-signed)
- Gunakan Domain Mode + DNS Changer App
- Atau akses via HTTP (Solusi 2 atau 3)

### Masalah: EDC tidak terhubung
**Solusi:**
- Pastikan IP EDC statis (bukan DHCP)
- Cek ping: `ping store001.pcsindonesia.com` (via Termux atau network tools app)
- Pastikan port 6745/6746 terbuka di firewall EDC
- Test koneksi dari laptop dulu untuk memastikan EDC berfungsi

---

## Rekomendasi Berdasarkan Skenario

| Skenario | Solusi Recommended |
|----------|-------------------|
| 1-2 tablet, non-technical user | Solusi 1: DNS Changer App |
| Banyak tablet (3+), punya router access | Solusi 2: Router DNS Setup |
| Technical user, standalone tablet | Solusi 3: Termux |
| Production, branded POS | Solusi 4: Custom APK |

---

## Checklist Setup Android

- [ ] IP EDC sudah di-set statis (bukan DHCP)
- [ ] Subdomain sudah ditentukan (contoh: store001.pcsindonesia.com)
- [ ] Install DNS Changer App / Setup Router DNS
- [ ] Tambahkan entry hosts (IP → Domain)
- [ ] Aktifkan VPN (jika menggunakan app)
- [ ] Test ping domain di browser/network tools
- [ ] Buka POS Dummy
- [ ] Setting subdomain di Pengaturan
- [ ] Test Connect ke EDC
- [ ] Test transaksi (jika EDC tersedia)

---

## Catatan Penting

### Keamanan
- DNS Changer App membuat VPN lokal (tidak keluar ke internet)
- Data transaksi tetap encrypted (AES)
- Tidak ada data yang disimpan di cloud

### Performa
- DNS resolution sedikit lebih lambat (VPN overhead)
- Untuk performa terbaik, gunakan Solusi 2 (Router DNS) atau Solusi 3 (Local Server)

### Maintenance
- Jika IP EDC berubah, update entry di DNS app/router
- Recommended: Setup static IP di EDC agar tidak berubah

---

## Butuh Bantuan?

Jika mengalami kesulitan setup Android:
1. Screenshoot error message
2. Catat device model & Android version
3. Hubungi support dengan informasi di atas
