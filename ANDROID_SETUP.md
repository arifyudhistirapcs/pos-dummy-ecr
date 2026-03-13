# Android Tablet POS Setup Guide

## Overview

Panduan ini untuk setup POS Dummy ECR Link di Android Tablet (tanpa root access).

## Problem

Android tidak bisa edit `/etc/hosts` file tanpa root access, dan browser Android strict terhadap SSL/HTTPS validation.

## Solusi

### Solusi 1: PersonalDNSfilter (Recommended - Paling Mudah)

Menggunakan aplikasi **PersonalDNSfilter** yang tersedia di Play Store.

#### Keuntungan PersonalDNSfilter:
- Open source dan gratis
- Tidak perlu root
- Interface sederhana
- Bisa tambahkan custom hosts entries

#### Play Store URL:
https://play.google.com/store/apps/details?id=dnsfilter.android

#### Langkah Setup PersonalDNSfilter:

1. **Install Aplikasi**
   - Buka Play Store di Android tablet
   - Cari "PersonalDNSfilter" atau klik link: https://play.google.com/store/apps/details?id=dnsfilter.android
   - Install aplikasi

2. **Buka Aplikasi & Berikan Izin**
   - Buka PersonalDNSfilter
   - Akan muncul permintaan izin VPN, tap "Allow" / "Izinkan"
   - Aplikasi akan membuat VPN lokal (DNS traffic di-intercept)

3. **Konfigurasi Additional Hosts**
   - Di layar utama, scroll ke bawah
   - Tap **"Advanced Settings"** (buka expand)
   - Tap **"Configure Additional Hosts"** (buka expand)
   - Di text area yang muncul, tambahkan entry:
     ```
     192.168.1.100 store001.pcsindonesia.com
     ```
     (Ganti `192.168.1.100` dengan IP EDC Anda, dan `store001` dengan subdomain Anda)

4. **Aktifkan Additional Hosts**
   - Pastikan toggle **"Configure Additional Hosts"** dalam keadaan ON (biru)
   - Tap lagi "Advanced Settings" untuk menutup expand

5. **Start VPN**
   - Kembali ke layar utama aplikasi
   - Tap tombol **"START"** yang besar di tengah
   - Akan muncul key icon di status bar (artinya VPN aktif)

6. **Test Koneksi**
   - Buka Chrome/browser
   - Akses: https://arifyudhistirapcs.github.io/pos-dummy-ecr/
   - Masukkan subdomain di Pengaturan
   - Test Connect ke EDC

#### Screenshot Referensi:
- Layar utama: Tombol START untuk aktifkan VPN
- Advanced Settings → Configure Additional Hosts: Tempat menambahkan entry hosts

---

### Solusi 2: Router/Network DNS Setup (Best for Multiple Devices)

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

### Solusi 3: Custom WebView APK (Production Ready)

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

## Alternatif Lain (Jika PersonalDNSfilter bermasalah)

### Hosts Go (Play Store)
- Lebih sederhana interface-nya
- Langsung tambah IP + Domain
- Tidak se-powerful PersonalDNSfilter tapi lebih mudah

### Virtual Hosts (Play Store)
- Bisa import file hosts
- Support wildcard domains

---

## Troubleshooting Android

### Masalah: PersonalDNSfilter tidak bisa start
**Solusi:**
- Pastikan tidak ada VPN lain yang aktif
- Cek izin: Settings → Apps → PersonalDNSfilter → Permissions → VPN → Allow
- Restart tablet

### Masalah: Entry hosts tidak berfungsi
**Solusi:**
- Pastikan format benar: `IP_ADDRESS DOMAIN` (contoh: `192.168.1.100 store001.pcsindonesia.com`)
- Pastikan toggle "Configure Additional Hosts" dalam keadaan ON
- Restart PersonalDNSfilter (tap STOP lalu START)
- Clear browser cache

### Masalah: Browser tetap tidak resolve domain
**Solusi:**
- Clear browser cache: Chrome → Settings → Privacy → Clear browsing data
- Gunakan Incognito mode untuk test
- Coba browser lain (Firefox, Samsung Internet)
- Pastikan PersonalDNSfilter status "Running" (tombol hijau)

### Masalah: "NET::ERR_CERT_AUTHORITY_INVALID"
**Solusi:**
- Ini SSL error karena GitHub Pages (HTTPS) ke WSS (self-signed)
- Gunakan Domain Mode + PersonalDNSfilter
- Pastikan subdomain resolve ke IP EDC

### Masalah: EDC tidak terhubung
**Solusi:**
- Pastikan IP EDC statis (bukan DHCP)
- Cek ping: Gunakan app "Ping & DNS" atau akses `http://store001.pcsindonesia.com` di browser
- Pastikan port 6745/6746 terbuka di firewall EDC
- Test koneksi dari laptop dulu untuk memastikan EDC berfungsi

---

## Rekomendasi Berdasarkan Skenario

| Skenario | Solusi Recommended |
|----------|-------------------|
| 1-2 tablet, user biasa | Solusi 1: PersonalDNSfilter |
| Banyak tablet (3+), punya router access | Solusi 2: Router DNS Setup |
| Production, branded POS | Solusi 3: Custom APK |

---

## Checklist Setup Android

- [ ] IP EDC sudah di-set statis (bukan DHCP)
- [ ] Subdomain sudah ditentukan (contoh: store001.pcsindonesia.com)
- [ ] Install PersonalDNSfilter dari Play Store
- [ ] Buka app, berikan izin VPN
- [ ] Advanced Settings → Configure Additional Hosts
- [ ] Tambahkan entry: `IP_EDC subdomain.pcsindonesia.com`
- [ ] Aktifkan toggle "Configure Additional Hosts"
- [ ] Kembali ke home, tap START
- [ ] Test akses domain di browser
- [ ] Buka POS Dummy
- [ ] Setting subdomain di Pengaturan
- [ ] Test Connect ke EDC
- [ ] Test transaksi (jika EDC tersedia)

---

## Catatan Penting

### Keamanan
- PersonalDNSfilter membuat VPN lokal (tidak keluar ke internet)
- Data transaksi tetap encrypted (AES)
- Tidak ada data yang disimpan di cloud

### Performa
- DNS resolution sedikit lebih lambat (VPN overhead)
- Untuk performa terbaik, gunakan Solusi 2 (Router DNS)

### Maintenance
- Jika IP EDC berubah, update entry di PersonalDNSfilter
- Recommended: Setup static IP di EDC agar tidak berubah

---

## Butuh Bantuan?

Jika mengalami kesulitan setup Android:
1. Screenshoot error message
2. Catat device model & Android version
3. Hubungi support dengan informasi di atas
