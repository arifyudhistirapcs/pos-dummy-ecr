// GitHub Pages Diagnostic Script
// Buka Console di browser dan paste script ini

console.clear();
console.log('%c🔍 ECR Link Diagnostic Tool', 'font-size: 18px; font-weight: bold; color: #4f46e5');
console.log('========================================');

// 1. Check Protocol
console.log('%c1. Page Protocol:', 'font-weight: bold');
console.log('   Location:', window.location.href);
console.log('   Protocol:', window.location.protocol);
console.log('   Is HTTPS:', window.location.protocol === 'https:' ? '✅ Yes' : '❌ No');
console.log('');

// 2. Check WebSocket Support
console.log('%c2. WebSocket Support:', 'font-weight: bold');
console.log('   Available:', typeof WebSocket !== 'undefined' ? '✅ Yes' : '❌ No');
console.log('');

// 3. Test WS vs WSS
console.log('%c3. WebSocket Protocol Restrictions:', 'font-weight: bold');
if (window.location.protocol === 'https:') {
    console.log('   WS (ws://):', '❌ BLOCKED by browser (Mixed Content Policy)');
    console.log('   WSS (wss://):', '✅ Allowed');
    console.log('   %c⚠️  HARUS menggunakan WSS!', 'color: #dc2626; font-weight: bold');
} else {
    console.log('   WS (ws://):', '✅ Allowed');
    console.log('   WSS (wss://):', '✅ Allowed');
}
console.log('');

// 4. Current Settings
console.log('%c4. Current Settings:', 'font-weight: bold');
const settings = JSON.parse(localStorage.getItem('posDummySettings') || '{}');
console.log('   Protocol:', settings.protocol || 'Not set');
console.log('   Subdomain:', settings.edcSubdomain || 'Not set');
console.log('   Port:', settings.edcPort || 'Not set');
console.log('');

// 5. Connection Test Function
console.log('%c5. Connection Test:', 'font-weight: bold');
window.testWSSConnection = function(subdomain, port = '6746') {
    const domain = `${subdomain}.pcsindonesia.com`;
    const url = `wss://${domain}:${port}`;
    
    console.log(`   Testing: ${url}`);
    console.log('   Status: Connecting...');
    
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
        console.log('   Status: %c❌ Timeout (5s)', 'color: #dc2626');
        ws.close();
    }, 5000);
    
    ws.onopen = () => {
        clearTimeout(timeout);
        console.log('   Status: %c✅ Connected!', 'color: #16a34a');
        console.log('   ✅ Domain mode berfungsi!');
        ws.close();
    };
    
    ws.onerror = (err) => {
        clearTimeout(timeout);
        console.log('   Status: %c❌ Error', 'color: #dc2626');
        console.log('   Error:', err);
    };
    
    ws.onclose = (e) => {
        clearTimeout(timeout);
        if (e.code === 1006) {
            console.log('   Error Code: 1006 (Abnormal Closure)');
            console.log('   %c🔴 SSL/TLS Error - Sertifikat tidak di-trust browser', 'color: #dc2626');
            console.log('   %c📋 Solusi: Setup hosts file untuk domain ' + domain, 'color: #2563eb');
        }
    };
};

console.log('   Fungsi tersedia: %ctestWSSConnection("store001", "6746")', 'color: #2563eb; font-style: italic');
console.log('');

// 6. Solutions
console.log('%c6. Solusi untuk GitHub Pages:', 'font-weight: bold; color: #16a34a');
console.log('');
console.log('   %cOpsi A: Domain Mode (Recommended)', 'font-weight: bold');
console.log('   1. Setting → Protocol: WSS, Port: 6746');
console.log('   2. Masukkan Subdomain (contoh: store001)');
console.log('   3. Setup hosts file:');
console.log('      [IP_EDC] store001.pcsindonesia.com');
console.log('   4. Download script:');
console.log('      - Windows: setup-hosts-windows.bat');
console.log('      - Mac/Linux: setup-hosts-macos-linux.sh');
console.log('');
console.log('   %cOpsi B: Local Server', 'font-weight: bold');
console.log('   Jalankan di localhost:');
console.log('   python3 -m http.server 3000');
console.log('   Buka: http://localhost:3000');
console.log('');

console.log('%c========================================', 'font-size: 14px; font-weight: bold');
