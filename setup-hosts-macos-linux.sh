#!/bin/bash

# ============================================
# Setup Hosts File untuk EDC ECRLink
# PCS Indonesia
# ============================================

echo ""
echo "========================================"
echo "Setup Hosts File - EDC ECRLink"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "ERROR: Script ini harus dijalankan dengan sudo!"
    echo ""
    echo "Cara menjalankan:"
    echo "  sudo bash setup-hosts-macos-linux.sh"
    echo ""
    exit 1
fi

echo "Script berjalan sebagai root - OK"
echo ""

# Get subdomain from user
echo "Masukkan subdomain EDC (contoh: store001, edc-jkt-001):"
read -p "Subdomain: " EDC_SUBDOMAIN
if [ -z "$EDC_SUBDOMAIN" ]; then
    echo "ERROR: Subdomain tidak boleh kosong!"
    exit 1
fi

# Construct full domain
EDC_DOMAIN="${EDC_SUBDOMAIN}.pcsindonesia.com"

# Get IP address from user
read -p "Masukkan IP address EDC di toko ini (contoh: 192.168.0.105): " EDC_IP

# Validate IP is not empty
if [ -z "$EDC_IP" ]; then
    echo "ERROR: IP address tidak boleh kosong!"
    exit 1
fi

echo ""
echo "IP Address EDC: $EDC_IP"
echo "Domain: $EDC_DOMAIN"
echo ""

# Confirm
read -p "Apakah data sudah benar? (Y/N): " CONFIRM
if [ "$CONFIRM" != "Y" ] && [ "$CONFIRM" != "y" ]; then
    echo "Setup dibatalkan."
    exit 0
fi

echo ""
echo "Menambahkan entry ke hosts file..."

# Backup hosts file first
HOSTS_FILE="/etc/hosts"
BACKUP_FILE="/etc/hosts.backup.$(date +%Y%m%d_%H%M%S)"

cp "$HOSTS_FILE" "$BACKUP_FILE"
if [ $? -eq 0 ]; then
    echo "Backup hosts file: $BACKUP_FILE"
else
    echo "WARNING: Gagal membuat backup hosts file"
fi

# Check if entry already exists
if grep -q "$EDC_DOMAIN" "$HOSTS_FILE"; then
    echo ""
    echo "WARNING: Entry untuk $EDC_DOMAIN sudah ada di hosts file!"
    echo ""
    grep "$EDC_DOMAIN" "$HOSTS_FILE"
    echo ""
    read -p "Apakah ingin menghapus entry lama dan tambahkan yang baru? (Y/N): " OVERWRITE
    if [ "$OVERWRITE" != "Y" ] && [ "$OVERWRITE" != "y" ]; then
        echo "Setup dibatalkan."
        exit 0
    fi
    
    # Remove old entry
    echo "Menghapus entry lama..."
    grep -v "$EDC_DOMAIN" "$HOSTS_FILE" > "$HOSTS_FILE.tmp"
    mv "$HOSTS_FILE.tmp" "$HOSTS_FILE"
fi

# Add new entry
echo ""
echo "Menambahkan entry baru..."
echo "" >> "$HOSTS_FILE"
echo "# EDC ECRLink - PCS Indonesia" >> "$HOSTS_FILE"
echo "$EDC_IP $EDC_DOMAIN" >> "$HOSTS_FILE"

if [ $? -eq 0 ]; then
    echo "OK - Entry berhasil ditambahkan!"
else
    echo "ERROR: Gagal menambahkan entry ke hosts file!"
    exit 1
fi

# Flush DNS cache
echo ""
echo "Flushing DNS cache..."

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    dscacheutil -flushcache 2>/dev/null
    killall -HUP mDNSResponder 2>/dev/null
    echo "OK - DNS cache berhasil di-flush (macOS)!"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v systemd-resolve &> /dev/null; then
        systemd-resolve --flush-caches 2>/dev/null
        echo "OK - DNS cache berhasil di-flush (Linux systemd)!"
    elif command -v nscd &> /dev/null; then
        nscd -i hosts 2>/dev/null
        echo "OK - DNS cache berhasil di-flush (Linux nscd)!"
    else
        echo "WARNING: Tidak dapat flush DNS cache (command tidak ditemukan)"
    fi
else
    echo "WARNING: OS tidak dikenali, skip flush DNS cache"
fi

# Test ping
echo ""
echo "Testing DNS resolution..."
ping -c 1 $EDC_DOMAIN | grep "PING $EDC_DOMAIN"

echo ""
echo "========================================"
echo "Setup Selesai!"
echo "========================================"
echo ""
echo "Hosts file location: $HOSTS_FILE"
echo "Backup file: $BACKUP_FILE"
echo ""
echo "Entry yang ditambahkan:"
echo "$EDC_IP $EDC_DOMAIN"
echo ""
echo "Langkah selanjutnya:"
echo 1. Pastikan aplikasi EDC sudah running
echo 2. Test koneksi: https://$EDC_DOMAIN:6746 pastikan tidak ada warning SSL
echo 3. Masukkan konfigurasi wss://$EDC_DOMAIN:6746 di POS anda
echo ""
echo "Jika ada masalah, lihat: DNS_HOSTS_SETUP_GUIDE.md"
echo ""
