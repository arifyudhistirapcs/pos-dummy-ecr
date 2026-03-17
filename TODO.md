# TODO / Changelog

## Completed ✅

### 2024-03-12
1. **Fixed Tab Navigation** - Masalah: function `processPayment()` menggunakan `await` tapi tidak dideklarasikan sebagai `async`. Ini menyebabkan syntax error yang menghentikan seluruh eksekusi JavaScript, termasuk event listener untuk tab navigation.
   - File: `app.js`
   - Change: `function processPayment()` → `async function processPayment()`

2. **Added Java Reference Implementation** - Contoh Java code untuk AES/ECB/PKCS5Padding encryption
   - File: `AESExample.java`

3. **Added Encryption Documentation** - Dokumentasi lengkap perbandingan Java vs JavaScript
   - File: `ENCRYPTION.md`

4. **GitHub Pages Support** - Menambahkan deteksi dan warning untuk GitHub Pages (HTTPS)
   - Warning banner di tab Settings
   - Improved error message untuk code 1006 di GitHub Pages
   - Diagnostic script untuk troubleshooting

## GitHub Pages Issue - SOLVED

### Masalah
GitHub Pages menggunakan HTTPS, browser akan blokir:
- **WS (ws://)** - Mixed Content Policy
- **WSS (wss://)** dengan self-signed certificate - SSL Error

### Solusi
1. **Domain Mode (Recommended)** - Gunakan `*.pcsindonesia.com` + hosts file
2. **Local Server** - Jalankan `python3 -m http.server 3000`

### Setup Domain Mode
1. Setting → Protocol: WSS, Port: 6746
2. Masukkan Subdomain (contoh: store001)
3. Download & jalankan script setup hosts file
4. Restart browser

## Pending / Future Improvements

### High Priority
- [ ] Test encryption output matches between Java and JavaScript
- [ ] Add unit tests for encryption functions
- [ ] Implement error handling for WebSocket connection timeouts

### Medium Priority
- [ ] Add transaction history persistence (localStorage)
- [ ] Implement retry mechanism for failed connections
- [ ] Add sound notifications for transaction events

### Low Priority
- [ ] Dark/light theme toggle
- [ ] Multi-language support
- [ ] Export transaction reports to CSV/Excel
