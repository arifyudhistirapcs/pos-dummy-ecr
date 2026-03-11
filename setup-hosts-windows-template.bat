@echo off
REM ============================================
REM Setup Hosts File untuk EDC ECRLink
REM PCS Indonesia
REM ============================================

echo.
echo ========================================
echo Setup Hosts File - EDC ECRLink
echo ========================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Script ini harus dijalankan sebagai Administrator!
    echo.
    echo Cara menjalankan:
    echo 1. Klik kanan file ini
    echo 2. Pilih "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Script berjalan sebagai Administrator - OK
echo.

REM Get domain from user (default: SUBDOMAIN_PLACEHOLDER.pcsindonesia.com)
echo Masukkan domain EDC (default: SUBDOMAIN_PLACEHOLDER.pcsindonesia.com):
set /p EDC_DOMAIN="Domain: "
if "%EDC_DOMAIN%"=="" set EDC_DOMAIN=SUBDOMAIN_PLACEHOLDER.pcsindonesia.com

REM Get IP address from user
set /p EDC_IP="Masukkan IP address EDC di toko ini (contoh: 192.168.0.105): "

REM Validate IP is not empty
if "%EDC_IP%"=="" (
    echo ERROR: IP address tidak boleh kosong!
    pause
    exit /b 1
)

echo.
echo IP Address EDC: %EDC_IP%
echo Domain: %EDC_DOMAIN%
echo.

REM Confirm
set /p CONFIRM="Apakah data sudah benar? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Setup dibatalkan.
    pause
    exit /b 0
)

echo.
echo Menambahkan entry ke hosts file...

REM Backup hosts file first
set HOSTS_FILE=%SystemRoot%\System32\drivers\etc\hosts
set BACKUP_FILE=%SystemRoot%\System32\drivers\etc\hosts.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_FILE=%BACKUP_FILE: =0%

copy "%HOSTS_FILE%" "%BACKUP_FILE%" >nul 2>&1
if %errorLevel% equ 0 (
    echo Backup hosts file: %BACKUP_FILE%
) else (
    echo WARNING: Gagal membuat backup hosts file
)

REM Check if entry already exists
findstr /C:"%EDC_DOMAIN%" "%HOSTS_FILE%" >nul 2>&1
if %errorLevel% equ 0 (
    echo.
    echo WARNING: Entry untuk %EDC_DOMAIN% sudah ada di hosts file!
    echo.
    type "%HOSTS_FILE%" | findstr /C:"%EDC_DOMAIN%"
    echo.
    set /p OVERWRITE="Apakah ingin menghapus entry lama dan tambahkan yang baru? (Y/N): "
    if /i not "%OVERWRITE%"=="Y" (
        echo Setup dibatalkan.
        pause
        exit /b 0
    )
    
    REM Remove old entry
    echo Menghapus entry lama...
    findstr /V /C:"%EDC_DOMAIN%" "%HOSTS_FILE%" > "%HOSTS_FILE%.tmp"
    move /Y "%HOSTS_FILE%.tmp" "%HOSTS_FILE%" >nul 2>&1
)

REM Add new entry
echo.
echo Menambahkan entry baru...
echo. >> "%HOSTS_FILE%"
echo # EDC ECRLink - PCS Indonesia >> "%HOSTS_FILE%"
echo %EDC_IP% %EDC_DOMAIN% >> "%HOSTS_FILE%"

if %errorLevel% equ 0 (
    echo OK - Entry berhasil ditambahkan!
) else (
    echo ERROR: Gagal menambahkan entry ke hosts file!
    pause
    exit /b 1
)

REM Flush DNS cache
echo.
echo Flushing DNS cache...
ipconfig /flushdns >nul 2>&1

if %errorLevel% equ 0 (
    echo OK - DNS cache berhasil di-flush!
) else (
    echo WARNING: Gagal flush DNS cache
)

REM Test ping
echo.
echo Testing DNS resolution...
ping -n 1 %EDC_DOMAIN% | findstr /C:"Pinging %EDC_DOMAIN%"

echo.
echo ========================================
echo Setup Selesai!
echo ========================================
echo.
echo Hosts file location: %HOSTS_FILE%
echo Backup file: %BACKUP_FILE%
echo.
echo Entry yang ditambahkan:
echo %EDC_IP% %EDC_DOMAIN%
echo.
echo Langkah selanjutnya:
echo 1. Pastikan aplikasi EDC sudah running
echo 2. Test koneksi: https://%EDC_DOMAIN%:6746 pastikan tidak ada warning SSL
echo 3. Masukkan konfigurasi wss://%EDC_DOMAIN%:6746 di POS anda
echo.
pause
