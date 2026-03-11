# SOP Deployment POS Dummy - Mode Domain (WildCard SSL)

## 📋 Overview

**Arsitektur:** Domain-based dengan wildcard SSL certificate dari Sectigo

```
┌─────────────────┐      WSS (Sectigo SSL)      ┌─────────────┐
│ POS Dummy       │────────────────────────────→│ EDC         │
│ (Browser)       │  edc-XXX.pcsindonesia.com   │ (IP Lokal)  │
└─────────────────┘                             └─────────────┘
       │
       │ DNS Resolution (Hosts File)
       ↓
┌─────────────────┐
│ Windows Hosts   │  edc-001.pcsindonesia.com → 192.168.1.10
│ File            │  edc-002.pcsindonesia.com → 192.168.1.20
└─────────────────┘
```

**Keuntungan:**
- ✅ SSL Certificate trusted (Sectigo)
- ✅ Tidak perlu install CA certificate manual
- ✅ WSS langsung jalan tanpa warning
- ✅ Professional dan secure

---

## 🎯 Persiapan Deployment

### 1. Setup Infrastruktur (Tim IT)

#### a. Generate/Update Wildcard Certificate
- Pastikan certificate `*.pcsindonesia.com` valid dari Sectigo
- Deploy ke semua EDC

#### b. Buat Daftar Toko

| Kode Toko | Nama Toko | Subdomain | IP EDC |
|-----------|-----------|-----------|--------|
| 001 | Jakarta Pusat | edc-001.pcsindonesia.com | 192.168.1.10 |
| 002 | Jakarta Selatan | edc-002.pcsindonesia.com | 192.168.1.20 |
| 003 | Bandung | edc-003.pcsindonesia.com | 192.168.2.10 |
| ... | ... | ... | ... |

### 2. Dokumen untuk Staff Toko

#### Sederhanakan dengan 2 opsi:

**Opsi A: Automated Script (Recommended untuk banyak toko)**
Buat batch script untuk otomatis edit hosts file:

```batch
:: setup-pos-toko-001.bat
@echo off
echo Setting up POS Dummy for Toko 001...
echo.

:: Check admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run as Administrator!
    pause
    exit /b 1
)

:: Backup hosts file
copy C:\Windows\System32\drivers\etc\hosts C:\Windows\System32\drivers\etc\hosts.backup

:: Add entry
echo. >> C:\Windows\System32\drivers\etc\hosts
echo # EDC Config Toko 001 >> C:\Windows\System32\drivers\etc\hosts
echo 192.168.1.10 edc-001.pcsindonesia.com >> C:\Windows\System32\drivers\etc\hosts

:: Flush DNS
ipconfig /flushdns

echo.
echo Setup complete!
echo You can now open: https://arifyudhistirapcs.github.io/pos-dummy-ecr/
echo.
pause
```

**Opsi B: Manual Guide (Untuk toko yang lebih sedikit)**
Lihat [SOP_STAFF_TOKO_MANUAL.md](SOP_STAFF_TOKO_MANUAL.md)

---

## 🚀 Deployment Step-by-Step

### Fase 1: Persiapan (Tim IT)

#### Week 1: Setup Certificate & Domain
- [ ] Verify wildcard certificate `*.pcsindonesia.com` aktif
- [ ] Test koneksi WSS ke sample EDC
- [ ] Buat daftar subdomain per toko
- [ ] Prepare deployment kit (script/guide)

#### Week 2: Pilot Test
- [ ] Pilih 2-3 toko untuk pilot
- [ ] Setup hosts file di POS pilot
- [ ] Test transaksi end-to-end
- [ ] Kumpulkan feedback

### Fase 2: Rollout (Tim IT + Store Staff)

#### Week 3-4: Batch Rollout
- [ ] Kirim deployment kit ke toko
- [ ] Staff toko setup POS
- [ ] Verifikasi koneksi per toko
- [ ] Dokumentasi issue & troubleshooting

---

## 📦 Deployment Kit per Toko

### Isi Kit:
1. **Setup Script** (`setup-pos-[kode-toko].bat`)
2. **Quick Guide** (1 page PDF)
3. **Support Contact**

### Quick Guide (1 Page):

```
┌─────────────────────────────────────────┐
│  POS DUMMY SETUP - TOKO [XXX]          │
├─────────────────────────────────────────┤
│                                         │
│  Step 1: Run Setup Script              │
│  ├─ Klik kanan setup-pos-XXX.bat       │
│  └─ Pilih "Run as Administrator"       │
│                                         │
│  Step 2: Buka POS Dummy                │
│  ├─ Buka Chrome                        │
│  ├─ Kunjungi: bit.ly/pos-dummy-ecr     │
│  └─ Atau: https://arifyudhistirapcs... │
│                                         │
│  Step 3: Setting                       │
│  ├─ Domain: edc-XXX.pcsindonesia.com   │
│  ├─ Protocol: WSS                      │
│  └─ Port: 6746                         │
│                                         │
│  Step 4: Test                          │
│  └─ Klik "Test Connection"             │
│                                         │
│  ✅ Done!                              │
│                                         │
│  Support: [contact]                    │
└─────────────────────────────────────────┘
```

---

## 🔧 Script Generator (untuk Tim IT)

```python
#!/usr/bin/env python3
"""
Generate deployment scripts for each store
Usage: python generate_scripts.py stores.csv
"""

import csv
import sys

def generate_bat(store_code, subdomain, ip):
    return f'''@echo off
echo Setting up POS Dummy for Toko {store_code}...
echo.

:: Check admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run as Administrator!
    pause
    exit /b 1
)

:: Backup hosts file
copy C:\\Windows\\System32\\drivers\\etc\\hosts C:\\Windows\\System32\\drivers\\etc\\hosts.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%

:: Remove old entry if exists
findstr /V "{subdomain}" C:\\Windows\\System32\\drivers\\etc\\hosts > C:\\Windows\\System32\\drivers\\etc\\hosts.tmp
move /Y C:\\Windows\\System32\\drivers\\etc\\hosts.tmp C:\\Windows\\System32\\drivers\\etc\\hosts

:: Add new entry
echo. >> C:\\Windows\\System32\\drivers\\etc\\hosts
echo # EDC Config Toko {store_code} >> C:\\Windows\\System32\\drivers\\etc\\hosts
echo {ip} {subdomain} >> C:\\Windows\\System32\\drivers\\etc\\hosts

:: Flush DNS
ipconfig /flushdns

echo.
echo ==========================================
echo Setup complete for Toko {store_code}!
echo.
echo Domain: {subdomain}
echo IP EDC: {ip}
echo.
echo Next steps:
echo 1. Open Chrome
echo 2. Go to: https://arifyudhistirapcs.github.io/pos-dummy-ecr/
echo 3. Setting Domain: {subdomain}
echo 4. Click "Test Connection"
echo ==========================================
echo.
pause
'''

def main():
    if len(sys.argv) != 2:
        print("Usage: python generate_scripts.py stores.csv")
        print("CSV format: store_code,store_name,subdomain,ip")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            store_code = row['store_code']
            subdomain = row['subdomain']
            ip = row['ip']
            
            filename = f"setup-pos-{store_code}.bat"
            with open(filename, 'w') as bat_file:
                bat_file.write(generate_bat(store_code, subdomain, ip))
            
            print(f"Generated: {filename}")

if __name__ == '__main__':
    main()
```

**CSV Format (stores.csv):**
```csv
store_code,store_name,subdomain,ip
001,Jakarta Pusat,edc-001.pcsindonesia.com,192.168.1.10
002,Jakarta Selatan,edc-002.pcsindonesia.com,192.168.1.20
003,Bandung,edc-003.pcsindonesia.com,192.168.2.10
```

---

## 📝 Checklist Deployment

### Pre-Deployment (Tim IT):
- [ ] Wildcard SSL certificate valid
- [ ] Sample EDC tested dengan domain
- [ ] Script generator tested
- [ ] Deployment kit prepared
- [ ] Support team briefed

### Per Toko (Staff Toko):
- [ ] Run setup script as Administrator
- [ ] Verify hosts file updated
- [ ] Open POS Dummy di Chrome
- [ ] Setting domain sesuai toko
- [ ] Test connection (WSS)
- [ ] Test transaksi Rp 1
- [ ] Sign-off deployment

### Post-Deployment (Tim IT):
- [ ] Verify semua toko connected
- [ ] Monitor error logs
- [ ] Dokumentasi issue
- [ ] Update knowledge base

---

## 🆘 Troubleshooting

### Issue: "This site can't be reached" untuk domain

**Penyebab:** Hosts file belum terupdate

**Solusi:**
1. Check hosts file:
   ```cmd
   type C:\Windows\System32\drivers\etc\hosts | findstr pcsindonesia
   ```
2. Verify entry exists
3. Flush DNS: `ipconfig /flushdns`
4. Restart Chrome

### Issue: "NET::ERR_CERT_COMMON_NAME_INVALID"

**Penyebab:** Certificate tidak match dengan domain

**Solusi:**
- Pastikan subdomain format benar: `edc-XXX.pcsindonesia.com`
- Check certificate coverage dengan: https://www.sslchecker.com/sslchecker

### Issue: Setup script tidak bisa jalan

**Penyebab:** Tidak run as Administrator

**Solusi:**
- Right-click → "Run as Administrator"
- Atau disable UAC (not recommended)

---

## 📞 Support Escalation

| Level | Issue | Contact |
|-------|-------|---------|
| 1 | Setup script error | IT Helpdesk |
| 2 | Cannot connect WSS | IT Infrastructure |
| 3 | Certificate issue | BRI/PCS Support |
| 4 | EDC hardware | BRI/PCS Support |

---

## 🎓 Training Material

### For Store Staff (15 minutes):
1. **Video Tutorial**: How to run setup script (3 min)
2. **Video Tutorial**: Setting POS Dummy (5 min)
3. **Hands-on Practice**: Test connection (5 min)
4. **Q&A** (2 min)

### For IT Support (1 hour):
1. Architecture explanation
2. Script customization
3. Troubleshooting scenarios
4. Support escalation process

---

## ✅ Success Metrics

- Deployment time per toko: < 15 minutes
- Success rate: > 95%
- Support tickets: < 5% of stores
- Uptime: > 99%

---

**Version:** 1.0  
**Last Updated:** 2024  
**Owner:** IT Infrastructure Team
