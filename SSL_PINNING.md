# SSL Certificate Pinning - ECR Link WSS

## ⚠️ Masalah Koneksi WSS

EDC menggunakan **SSL Certificate Pinning** dengan public key specific. Ini berarti:

1. EDC memiliki self-signed certificate dengan RSA public key tertentu
2. Client (POS) harus memverifikasi bahwa public key server cocok dengan yang diharapkan
3. Public key yang digunakan: `pcsindonesia_wss.pem`

## 🔒 Contoh Implementasi (Java)

```java
// Load public key
PublicKey publicKey = loadPublicKeyProd(context);

// Create SSLContext dengan custom TrustManager
SSLContext sslContext = createSSLContextProd(publicKey);

// TrustManager memverifikasi public key server
new X509TrustManager() {
    @Override
    public void checkServerTrusted(X509Certificate[] chain, String authType) {
        PublicKey serverPublicKey = chain[0].getPublicKey();
        if (!serverPublicKey.equals(publicKey)) {
            throw new CertificateException("Server's public key does not match");
        }
    }
};
```

## 🚫 Kenapa Browser Web Tidak Bisa?

**Browser (Chrome, Firefox, Safari) tidak mengizinkan:**
- ❌ Bypass SSL certificate validation
- ❌ Custom TrustManager seperti di Java/Kotlin
- ❌ Memaksa koneksi ke server dengan certificate tidak valid
- ❌ SSL pinning dari sisi client

**Error yang muncul:**
```
WebSocket closed: Code 1006 (Abnormal closure)
```

## ✅ Solusi

### 1. **Gunakan WS (Port 6745) - Recommended untuk Testing**

**Keuntungan:**
- ✅ Tidak perlu SSL certificate
- ✅ Simple, langsung jalan
- ✅ Cocok untuk development/testing

**Cara:**
```bash
# Jalankan local server
cd pos-dummy-ecr-link
python3 -m http.server 3000

# Buka http://localhost:3000
# Setting: Protocol = WS, Port = 6745
```

**Catatan:** GitHub Pages (HTTPS) tidak bisa pakai WS karena mixed content policy.

---

### 2. **Accept Self-Signed Certificate di Browser**

**Cara (One-time setup):**
1. Buka `https://192.168.x.x:6746` langsung di browser tab baru
2. Browser akan menunjukkan warning "Your connection is not private"
3. Klik "Advanced" → "Proceed to 192.168.x.x (unsafe)"
4. Setelah itu, kembali ke aplikasi POS dan coba connect lagi

**Keuntungan:**
- ✅ Bisa pakai WSS dari browser
- ✅ Simple, tidak perlu install apa-apa

**Kekurangan:**
- ❌ Harus dilakukan di setiap browser/device
- ❌ Tidak user-friendly
- ❌ Tidak secure untuk production

---

### 3. **Gunakan Native App Wrapper (Electron/Tauri)**

**Keuntungan:**
- ✅ Full control atas SSL handling
- ✅ Bisa implement custom TrustManager seperti Java
- ✅ Bisa di-build untuk Windows/Mac/Linux
- ✅ Production-ready

**Contoh Electron:**
```javascript
// Electron main process
const { app } = require('electron');

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // Bypass certificate error untuk IP EDC
  if (url.includes('192.168.')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});
```

**Setup:**
1. Install Node.js
2. Init Electron project
3. Load POS dummy sebagai webview
4. Handle certificate error
5. Build executable

---

### 4. **Reverse Proxy dengan Certificate Valid**

**Arsitektur:**
```
POS (Browser) → Reverse Proxy (SSL Valid) → EDC (Self-signed)
```

**Setup dengan Nginx:**
```nginx
server {
    listen 443 ssl;
    server_name pos-proxy.yourdomain.com;
    
    ssl_certificate /path/to/valid-cert.pem;
    ssl_certificate_key /path/to/valid-key.pem;
    
    location /ws {
        proxy_pass https://192.168.x.x:6746;
        proxy_ssl_verify off;  # Ignore EDC self-signed cert
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Keuntungan:**
- ✅ Browser lihat certificate valid
- ✅ EDC tetap pakai self-signed
- ✅ Production-ready

**Kekurangan:**
- ❌ Perlu setup server tambahan
- ❌ Perlu domain + SSL certificate valid

---

### 5. **Install Certificate ke System/Browser**

**Windows:**
1. Download certificate dari EDC
2. Open MMC → Certificates → Trusted Root Certification Authorities
3. Import certificate EDC
4. Restart browser

**Mac:**
1. Double-click certificate
2. Add to Keychain → System
3. Trust Always

---

## 🎯 Rekomendasi

| Skenario | Solusi |
|----------|--------|
| **Testing/Development** | Gunakan WS (Port 6745) dengan Local Server |
| **Production (Single POS)** | Accept Certificate di Browser (solusi cepat) |
| **Production (Multiple POS)** | Native App (Electron) atau Reverse Proxy |
| **Enterprise** | Reverse Proxy dengan valid SSL certificate |

## 📱 Quick Start - WS (Port 6745)

**Cara paling mudah untuk testing:**

```bash
# 1. Clone repository
git clone https://github.com/arifyudhistirapcs/pos-dummy-ecr.git
cd pos-dummy-ecr

# 2. Jalankan local server
python3 -m http.server 3000

# 3. Buka http://localhost:3000

# 4. Setting:
#    - Protocol: WS
#    - Port: 6745
#    - IP: IP EDC Anda

# 5. Klik Connect
```

## 🔧 Setup Electron (Production)

**Langkah-langkah:**

1. **Install Node.js** dari https://nodejs.org

2. **Create Electron app:**
```bash
mkdir pos-dummy-electron
cd pos-dummy-electron
npm init -y
npm install electron --save-dev
```

3. **Create main.js:**
```javascript
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  // Load POS Dummy dari GitHub Pages atau local
  win.loadURL('https://arifyudhistirapcs.github.io/pos-dummy-ecr/');
  // atau local: win.loadFile('index.html');
}

// Bypass certificate errors untuk IP lokal
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.includes('192.168.') || url.includes('10.')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

app.whenReady().then(createWindow);
```

4. **Update package.json:**
```json
{
  "name": "pos-dummy-electron",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  }
}
```

5. **Run:**
```bash
npm start
```

6. **Build executable:**
```bash
npm install electron-builder --save-dev
npm run build
```

## 📞 Support

Jika masih mengalami masalah koneksi:
1. Cek apakah ECR Link di EDC sudah aktif
2. Pastikan IP dan port benar
3. Coba solusi WS (Port 6745) terlebih dahulu
4. Jika harus WSS, gunakan Electron atau Accept Certificate
