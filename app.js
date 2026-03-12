/**
 * POS Dummy - ECR Link WebSocket Client
 * Technical Implementation based on ECR Link FMS BRI Documentation v4.9.0
 * 
 * Features:
 * - WebSocket Secure (WSS) on port 6746
 * - WebSocket (WS) on port 6745
 * - AES/ECB/PKCS5Padding encryption
 * - Multiple action types: Sale, Contactless, Card Verification, etc.
 */

// ===== State Management =====
const state = {
    // Connection
    ws: null,
    isConnected: false,
    isConnecting: false,
    connectionUrl: '',
    lastConnected: null,
    totalTransactions: 0,
    
    // Settings
    settings: {
        protocol: 'wss',
        edcSubdomain: '',  // User inputs subdomain (e.g., "store001")
        edcPort: '6746',
        posAddress: '172.0.0.1',
        secretKey: 'ECR2022secretKey',
        // Action types: Sale, Contactless, CardVerification, SaleCompletion, Cicilan, Void, CheckStatus
        actionType: 'Sale'
    },
    
    // Menu & Cart
    menuItems: [
        { id: 1, name: 'Nasi Goreng', category: 'Makanan', price: 1 },
        { id: 2, name: 'Mie Goreng', category: 'Makanan', price: 1 },
        { id: 3, name: 'Ayam Goreng', category: 'Makanan', price: 1 },
        { id: 4, name: 'Es Teh', category: 'Minuman', price: 1 },
        { id: 5, name: 'Es Jeruk', category: 'Minuman', price: 1 },
        { id: 6, name: 'Kopi', category: 'Minuman', price: 1 },
        { id: 7, name: 'Kerupuk', category: 'Snack', price: 1 },
        { id: 8, name: 'Pisang Goreng', category: 'Snack', price: 1 },
    ],
    cart: [],
    
    // Logs
    logs: []
};

// ===== WebSocket Connection =====
class ECRLinkWebSocket {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 3000;
    }

    connect(url) {
        return new Promise((resolve, reject) => {
            if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
                log('WebSocket already connected or connecting', 'warning');
                resolve();
                return;
            }

            state.isConnecting = true;
            updateConnectionStatus();
            log(`Connecting to ${url}...`, 'info');

            try {
                log(`Creating WebSocket connection to: ${url}`, 'info');
                this.ws = new WebSocket(url);
                
                this.ws.onopen = () => {
                    log('✅ WebSocket connected successfully', 'success');
                    state.isConnected = true;
                    state.isConnecting = false;
                    state.lastConnected = new Date();
                    this.reconnectAttempts = 0;
                    updateConnectionStatus();
                    updateInfoPanel();
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    log('❌ WebSocket error occurred', 'error');
                    console.error('WebSocket error:', error);
                    
                    // Provide more detailed error info
                    const protocol = url.startsWith('wss://') ? 'WSS (Secure)' : 'WS (Non-Secure)';
                    log(`Connection type: ${protocol}`, 'info');
                    log(`Target: ${url.replace(/wss?:\/\//, '')}`, 'info');
                    
                    state.isConnecting = false;
                    updateConnectionStatus();
                    reject(error);
                };

                this.ws.onclose = (event) => {
                    let closeReason = event.reason || 'No reason provided';
                    let errorHint = '';
                    
                    // Provide helpful hints based on close code
                    switch(event.code) {
                        case 1006:
                            closeReason = 'Abnormal closure (Code 1006)';
                            if (url.startsWith('wss://')) {
                                errorHint = '🚨 SSL PINNING ISSUE: EDC menggunakan self-signed certificate. ';
                                errorHint += 'Browser tidak bisa bypass SSL validation. ';
                                errorHint += 'SOLUSI: (1) Ganti ke WS port 6745 + Local Server, atau (2) Accept certificate di browser, atau (3) Gunakan Electron app. ';
                                errorHint += 'Lihat SSL_PINNING.md untuk detail.';
                            } else {
                                errorHint = '💡 HINT: Cek apakah ECR Link aktif dan port 6745 terbuka.';
                            }
                            break;
                        case 1001:
                            closeReason = 'Going away (Code 1001)';
                            break;
                        case 1002:
                            closeReason = 'Protocol error (Code 1002)';
                            break;
                        case 1005:
                            closeReason = 'No status code (Code 1005)';
                            break;
                        case 1015:
                            closeReason = 'TLS Handshake failed (Code 1015)';
                            errorHint = '💡 HINT: SSL/TLS certificate EDC bermasalah. Pastikan EDC support WSS dengan certificate yang valid.';
                            break;
                    }
                    
                    log(`⚠️ WebSocket closed: ${closeReason}`, 'warning');
                    if (errorHint) {
                        log(errorHint, 'info');
                    }
                    
                    state.isConnected = false;
                    state.isConnecting = false;
                    updateConnectionStatus();
                    
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`, 'info');
                        setTimeout(() => this.connect(url), this.reconnectDelay);
                    } else {
                        log('❌ Max reconnection attempts reached', 'error');
                        log('💡 Silakan cek:', 'info');
                        log('   1. Apakah ECR Link di EDC sudah aktif?', 'info');
                        log('   2. Apakah port ' + (url.includes('6746') ? '6746 (WSS)' : '6745 (WS)') + ' terbuka?', 'info');
                        log('   3. Apakah POS dan EDC di jaringan yang sama?', 'info');
                        log('   4. Coba ganti protocol WSS ↔ WS', 'info');
                    }
                };
            } catch (error) {
                log(`Failed to create WebSocket: ${error.message}`, 'error');
                state.isConnecting = false;
                updateConnectionStatus();
                reject(error);
            }
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        state.isConnected = false;
        state.isConnecting = false;
        updateConnectionStatus();
        log('Disconnected from EDC', 'info');
    }

    send(data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            log('Cannot send: WebSocket is not connected', 'error');
            return false;
        }

        try {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            this.ws.send(message);
            log(`Sent: ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`, 'sent');
            return true;
        } catch (error) {
            log(`Send failed: ${error.message}`, 'error');
            return false;
        }
    }
}

const ecrWs = new ECRLinkWebSocket();

// ===== Encryption via API =====
const ECREncryption = {
    /**
     * Encrypt payload using external API
     * API: http://66.42.53.16:8080/encrypt
     */
    async encrypt(payload) {
        try {
            const jsonString = typeof payload === 'string' ? payload : JSON.stringify(payload);
            log(`Sending payload to encryption API...`, 'info');
            
            const response = await fetch('http://66.42.53.16:8080/encrypt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: jsonString
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const encryptedToken = await response.text();
            log(`Encrypted token received: ${encryptedToken.substring(0, 50)}...`, 'info');
            
            return encryptedToken;
        } catch (error) {
            log(`Encryption API error: ${error.message}`, 'error');
            throw error;
        }
    },

    /**
     * Generate encrypted token for ECR Link
     */
    async generateToken(payload) {
        const encrypted = await this.encrypt(payload);
        return encrypted;
    }
};

// ===== Payload Builders =====
const PayloadBuilder = {
    /**
     * Get current timestamp in format: yyyy-mm-dd HH:MM:SS
     */
    getTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },

    /**
     * Generate unique transaction ID
     */
    generateTrxId() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `TXN${timestamp}${random}`;
    },

    /**
     * Build Sale payload
     * action: "Sale"
     * method: "purchase" | "brizzi" | "qris"
     */
    buildSale(amount, method = 'purchase') {
        return {
            amount: amount,
            action: 'Sale',
            trx_id: this.generateTrxId(),
            pos_address: state.settings.posAddress,
            time_stamp: this.getTimestamp(),
            method: method
        };
    },

    /**
     * Build Contactless payload
     * action: "Contactless"
     * method: "purchase"
     */
    buildContactless(amount) {
        return {
            amount: amount,
            action: 'Contactless',
            trx_id: this.generateTrxId(),
            pos_address: state.settings.posAddress,
            time_stamp: this.getTimestamp(),
            method: 'purchase'
        };
    },

    /**
     * Build Card Verification payload
     * action: "Card Verification"
     * method: "purchase"
     */
    buildCardVerification(amount) {
        return {
            amount: amount,
            action: 'Card Verification',
            trx_id: this.generateTrxId(),
            pos_address: state.settings.posAddress,
            time_stamp: this.getTimestamp(),
            method: 'purchase'
        };
    },

    /**
     * Build Sale Completion payload
     * action: "Sale Completion"
     * method: "purchase"
     * requires: approval code from Card Verification
     */
    buildSaleCompletion(amount, approvalCode) {
        return {
            amount: amount,
            action: 'Sale Completion',
            trx_id: this.generateTrxId(),
            pos_address: state.settings.posAddress,
            time_stamp: this.getTimestamp(),
            method: 'purchase',
            approval: approvalCode
        };
    },

    /**
     * Build Cicilan (Installment) payload
     * action: "Cicilan"
     * method: "purchase"
     */
    buildCicilan(amount, plan, periode) {
        return {
            amount: amount,
            action: 'Cicilan',
            trx_id: this.generateTrxId(),
            pos_address: state.settings.posAddress,
            time_stamp: this.getTimestamp(),
            method: 'purchase',
            plan: plan,
            periode: periode
        };
    },

    /**
     * Build Void payload
     * action: "Void"
     * method: "purchase" | "brizzi"
     */
    buildVoid(traceNumber, method = 'purchase') {
        return {
            action: 'Void',
            trace_number: traceNumber,
            pos_address: state.settings.posAddress,
            time_stamp: this.getTimestamp(),
            method: method
        };
    },

    /**
     * Build Check Status QR payload
     * action: "Check Status"
     * method: "qris"
     */
    buildCheckStatus(referenceNumber) {
        return {
            action: 'Check Status',
            reference_number: referenceNumber,
            pos_address: state.settings.posAddress,
            time_stamp: this.getTimestamp(),
            method: 'qris'
        };
    }
};

// ===== Logging =====
function log(message, type = 'info') {
    const timestamp = new Date();
    const timeStr = timestamp.toLocaleTimeString('id-ID', { hour12: false });
    
    const logEntry = {
        time: timeStr,
        type: type.toUpperCase(),
        message: message,
        timestamp: timestamp
    };
    
    state.logs.push(logEntry);
    
    // Keep only last 1000 logs
    if (state.logs.length > 1000) {
        state.logs.shift();
    }
    
    renderLogs();
    
    // Also log to console
    const consoleMethod = type === 'error' ? console.error : 
                          type === 'warning' ? console.warn : 
                          type === 'success' ? console.log : console.log;
    consoleMethod(`[${logEntry.type}] ${message}`);
}

function renderLogs() {
    const container = document.getElementById('logContainer');
    if (!container) return;
    
    container.innerHTML = state.logs.map(entry => `
        <div class="log-entry">
            <span class="log-time">${entry.time}</span>
            <span class="log-type ${entry.type.toLowerCase()}">${entry.type}</span>
            <span class="log-message">${escapeHtml(entry.message)}</span>
        </div>
    `).join('');
    
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function clearLogs() {
    state.logs = [];
    renderLogs();
    log('Logs cleared', 'info');
}

function exportLogs() {
    const content = state.logs.map(l => `[${l.time}] [${l.type}] ${l.message}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    log('Logs exported', 'success');
}

// ===== UI Functions =====
function updateConnectionStatus() {
    const statusEl = document.getElementById('connectionStatus');
    const connectBtn = document.getElementById('connectBtn');
    
    if (!statusEl) return;
    
    const dot = statusEl.querySelector('.status-dot');
    const text = statusEl.querySelector('.status-text');
    
    dot.classList.remove('connected', 'connecting', 'disconnected');
    
    if (state.isConnected) {
        dot.classList.add('connected');
        text.textContent = 'Connected';
        connectBtn.innerHTML = '<i class="fas fa-unlink"></i><span>Disconnect</span>';
    } else if (state.isConnecting) {
        dot.classList.add('connecting');
        text.textContent = 'Connecting...';
        connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Connecting...</span>';
    } else {
        dot.classList.add('disconnected');
        text.textContent = 'Disconnected';
        connectBtn.innerHTML = '<i class="fas fa-plug"></i><span>Connect</span>';
    }
}

function updateInfoPanel() {
    document.getElementById('infoStatus').textContent = state.isConnected ? 'Connected' : 'Disconnected';
    
    // Show domain in info URL
    let displayUrl = state.connectionUrl || '-';
    if (state.settings.edcSubdomain && !state.isConnected) {
        displayUrl = `${state.settings.protocol}://${state.settings.edcSubdomain}.pcsindonesia.com:${state.settings.edcPort}`;
    }
    document.getElementById('infoUrl').textContent = displayUrl;
    
    document.getElementById('infoLastConnected').textContent = state.lastConnected ? state.lastConnected.toLocaleString('id-ID') : '-';
    document.getElementById('infoTotalTrans').textContent = state.totalTransactions;
}

function toggleConnection() {
    if (state.isConnected || state.isConnecting) {
        ecrWs.disconnect();
    } else {
        connectToEDC();
    }
}

async function connectToEDC() {
    const subdomain = state.settings.edcSubdomain;
    
    if (!subdomain) {
        showToast('Error', 'Please configure EDC Subdomain in Settings', 'error');
        switchTab('settings');
        return;
    }
    
    // Construct full domain
    const domain = `${subdomain}.pcsindonesia.com`;
    
    const protocol = state.settings.protocol;
    const port = state.settings.edcPort || (protocol === 'wss' ? '6746' : '6745');
    const url = `${protocol}://${domain}:${port}`;
    
    state.connectionUrl = url;
    
    log('========================================', 'info');
    log(`🚀 Starting connection attempt`, 'info');
    log(`📡 Protocol: ${protocol.toUpperCase()}`, 'info');
    log(`🌐 Domain: ${domain}`, 'info');
    log(`🔌 Port: ${port}`, 'info');
    log(`🔗 Full URL: ${url}`, 'info');
    log('========================================', 'info');
    
    // Check if using domain mode (recommended)
    log('✅ Using domain mode (Sectigo SSL) - Certificate should be trusted', 'success');
    
    try {
        await ecrWs.connect(url);
        showToast('Connected', 'Successfully connected to EDC', 'success');
    } catch (error) {
        showToast('Connection Failed', 'Check Activity Log for details', 'error');
    }
}

function testConnection() {
    saveSettingsToState();
    connectToEDC();
}

/**
 * Test WSS connection with detailed diagnostics
 */
async function testWSS() {
    const protocol = 'wss';
    const port = '6746';
    const url = `${protocol}://${state.settings.edcIp}:${port}`;
    
    log('========================================', 'info');
    log('🔒 WSS CONNECTION TEST', 'info');
    log('========================================', 'info');
    log(`Target: ${url}`, 'info');
    log('', 'info');
    log('📝 Troubleshooting WSS:', 'info');
    log('1. Pastikan ECR Link di EDC sudah aktif', 'info');
    log('2. Cek apakah EDC support WSS (port 6746)', 'info');
    log('3. Jika Code 1006: EDC mungkin hanya support WS', 'info');
    log('4. Coba ganti ke WS (port 6745) jika WSS gagal', 'info');
    log('========================================', 'info');
    
    // Try to connect
    await ecrWs.connect(url);
}

// ===== Tab Navigation =====
function switchTab(tabName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    // Update page title
    const titles = {
        pos: 'Kasir',
        menu: 'Kelola Menu',
        settings: 'Pengaturan',
        logs: 'Activity Log'
    };
    document.getElementById('pageTitle').textContent = titles[tabName] || 'POS Dummy';
}

// ===== Menu Management =====
function renderMenuGrid() {
    const grid = document.getElementById('menuGrid');
    const searchTerm = document.getElementById('searchMenu')?.value.toLowerCase() || '';
    
    const filteredItems = state.menuItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm)
    );
    
    grid.innerHTML = filteredItems.map(item => `
        <div class="menu-item" onclick="addToCart(${item.id})">
            <div class="menu-item-icon">
                <i class="fas ${getCategoryIcon(item.category)}"></i>
            </div>
            <div class="menu-item-name">${escapeHtml(item.name)}</div>
            <div class="menu-item-price">Rp ${formatPrice(item.price)}</div>
        </div>
    `).join('');
}

function getCategoryIcon(category) {
    const icons = {
        'Makanan': 'fa-utensils',
        'Minuman': 'fa-glass-water',
        'Snack': 'fa-cookie-bite',
        'Lainnya': 'fa-box'
    };
    return icons[category] || 'fa-box';
}

function renderMenuTable() {
    const tbody = document.getElementById('menuTableBody');
    tbody.innerHTML = state.menuItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${escapeHtml(item.name)}</td>
            <td><span class="badge">${item.category}</span></td>
            <td>Rp ${formatPrice(item.price)}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteMenuItem(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function showAddMenuModal() {
    document.getElementById('addMenuModal').classList.add('active');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

function addMenuItem(event) {
    event.preventDefault();
    
    const name = document.getElementById('menuName').value;
    const category = document.getElementById('menuCategory').value;
    const price = parseInt(document.getElementById('menuPrice').value) || 1;
    
    const newItem = {
        id: Date.now(),
        name,
        category,
        price
    };
    
    state.menuItems.push(newItem);
    renderMenuGrid();
    renderMenuTable();
    closeModal();
    
    // Reset form
    event.target.reset();
    document.getElementById('menuPrice').value = 1;
    
    log(`Menu item added: ${name}`, 'success');
    showToast('Success', 'Menu item added successfully', 'success');
}

function deleteMenuItem(id) {
    const item = state.menuItems.find(i => i.id === id);
    state.menuItems = state.menuItems.filter(i => i.id !== id);
    renderMenuGrid();
    renderMenuTable();
    log(`Menu item deleted: ${item?.name}`, 'warning');
}

// ===== Cart Management =====
function addToCart(itemId) {
    const item = state.menuItems.find(i => i.id === itemId);
    if (!item) return;
    
    const existingItem = state.cart.find(c => c.id === itemId);
    if (existingItem) {
        existingItem.qty++;
    } else {
        state.cart.push({ ...item, qty: 1 });
    }
    
    renderCart();
    updateCartSummary();
    log(`Added to cart: ${item.name}`, 'info');
}

function updateCartQty(itemId, delta) {
    const item = state.cart.find(c => c.id === itemId);
    if (!item) return;
    
    item.qty += delta;
    if (item.qty <= 0) {
        state.cart = state.cart.filter(c => c.id !== itemId);
    }
    
    renderCart();
    updateCartSummary();
}

function removeFromCart(itemId) {
    const item = state.cart.find(c => c.id === itemId);
    state.cart = state.cart.filter(c => c.id !== itemId);
    renderCart();
    updateCartSummary();
    log(`Removed from cart: ${item?.name}`, 'warning');
}

function clearCart() {
    state.cart = [];
    renderCart();
    updateCartSummary();
    log('Cart cleared', 'info');
}

function renderCart() {
    const container = document.getElementById('cartItems');
    
    if (state.cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-basket"></i>
                <p>Keranjang kosong</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = state.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${escapeHtml(item.name)}</div>
                <div class="cart-item-price">Rp ${formatPrice(item.price)}</div>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="updateCartQty(${item.id}, -1)">-</button>
                <span class="qty-value">${item.qty}</span>
                <button class="qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
            </div>
            <div class="cart-item-total">Rp ${formatPrice(item.price * item.qty)}</div>
            <div class="cart-item-remove" onclick="removeFromCart(${item.id})">
                <i class="fas fa-times"></i>
            </div>
        </div>
    `).join('');
}

function updateCartSummary() {
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;
    
    document.getElementById('subtotal').textContent = `Rp ${formatPrice(subtotal)}`;
    document.getElementById('tax').textContent = `Rp ${formatPrice(tax)}`;
    document.getElementById('total').textContent = `Rp ${formatPrice(total)}`;
    
    // Enable/disable pay button
    document.getElementById('payBtn').disabled = state.cart.length === 0;
}

// ===== Payment Processing =====
async function processPayment() {
    if (state.cart.length === 0) {
        showToast('Error', 'Cart is empty', 'error');
        return;
    }
    
    // Get action type and payment method
    const actionType = document.getElementById('actionType')?.value || 'Sale';
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'purchase';
    
    // Show payment modal
    showPaymentModal();
    
    // Calculate totals
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;
    
    try {
        // Ensure connection
        if (!state.isConnected) {
            updatePaymentStatus('connecting', 'Connecting to EDC...', 'Please wait while we establish connection');
            await connectToEDC();
        }
        
        if (!state.isConnected) {
            throw new Error('Failed to connect to EDC');
        }
        
        // Build payload based on action type
        updatePaymentStatus('building', 'Building transaction payload...', 'Preparing request data');
        
        let payload;
        switch (actionType) {
            case 'Sale':
                payload = PayloadBuilder.buildSale(total, paymentMethod);
                break;
            case 'Contactless':
                payload = PayloadBuilder.buildContactless(total);
                break;
            case 'CardVerification':
                payload = PayloadBuilder.buildCardVerification(total);
                break;
            case 'Cicilan':
                const plan = document.getElementById('cicilanPlan')?.value || '001';
                const periode = document.getElementById('cicilanPeriode')?.value || '03';
                payload = PayloadBuilder.buildCicilan(total, plan, periode);
                break;
            default:
                payload = PayloadBuilder.buildSale(total, paymentMethod);
        }
        
        log(`Building ${actionType} payload with method: ${payload.method || 'purchase'}`, 'info');
        
        // Encrypt payload via API
        updatePaymentStatus('encrypting', 'Encrypting payload...', 'Sending to encryption API');
        
        const encryptedToken = await ECREncryption.generateToken(payload);
        log(`Token encrypted successfully`, 'success');
        
        // Send to EDC
        updatePaymentStatus('sending', 'Sending to EDC...', 'Waiting for EDC response');
        
        // Send as raw encrypted string (token only)
        const sent = ecrWs.send(encryptedToken);
        if (!sent) {
            throw new Error('Failed to send payment request');
        }
        
        // Store transaction info for response handling
        state.currentTransaction = {
            trxId: payload.trx_id,
            action: payload.action,
            amount: total,
            timestamp: new Date()
        };
        
        // Wait for response (in real implementation, this would be handled by onmessage)
        // For demo purposes, we'll wait for actual response from EDC
        log('Waiting for EDC response...', 'info');
        
    } catch (error) {
        log(`Payment failed: ${error.message}`, 'error');
        handlePaymentResponse({
            success: false,
            error: error.message
        });
    }
}

function handleMessage(data) {
    log(`Received: ${data.substring(0, 500)}${data.length > 500 ? '...' : ''}`, 'received');
    
    try {
        const response = JSON.parse(data);
        handlePaymentResponse(response);
    } catch (error) {
        // If not JSON, treat as raw response
        log(`Raw response received (not JSON): ${data.substring(0, 200)}`, 'warning');
        handlePaymentResponse({
            success: true,
            raw: data
        });
    }
}

function handlePaymentResponse(response) {
    const statusEl = document.getElementById('paymentStatus');
    const detailsEl = document.getElementById('paymentDetails');
    const footerEl = document.getElementById('paymentFooter');
    
    statusEl.style.display = 'none';
    detailsEl.style.display = 'block';
    footerEl.style.display = 'flex';
    
    state.totalTransactions++;
    updateInfoPanel();
    
    // Check if it's a success response (rc: "00" or status: "success"/"paid")
    const isSuccess = response.rc === '00' || 
                      response.status === 'success' || 
                      response.status === 'paid' ||
                      response.success === true;
    
    if (isSuccess) {
        let resultHtml = `
            <div class="payment-result success">
                <div class="result-title success">
                    <i class="fas fa-check-circle"></i> Transaction Success
                </div>
        `;
        
        // Add common fields if available
        if (response.trx_id) {
            resultHtml += `
                <div class="result-item">
                    <span class="result-label">Transaction ID</span>
                    <span class="result-value">${response.trx_id}</span>
                </div>
            `;
        }
        
        if (response.trace_number) {
            resultHtml += `
                <div class="result-item">
                    <span class="result-label">Trace Number</span>
                    <span class="result-value">${response.trace_number}</span>
                </div>
            `;
        }
        
        if (response.amount) {
            resultHtml += `
                <div class="result-item">
                    <span class="result-label">Amount</span>
                    <span class="result-value">Rp ${formatPrice(parseInt(response.amount))}</span>
                </div>
            `;
        }
        
        if (response.approval && response.approval !== 'N/A') {
            resultHtml += `
                <div class="result-item">
                    <span class="result-label">Approval Code</span>
                    <span class="result-value">${response.approval}</span>
                </div>
            `;
        }
        
        if (response.reference_number && response.reference_number !== 'N/A') {
            resultHtml += `
                <div class="result-item">
                    <span class="result-label">Reference Number</span>
                    <span class="result-value">${response.reference_number}</span>
                </div>
            `;
        }
        
        if (response.card_name && response.card_name !== 'N/A') {
            resultHtml += `
                <div class="result-item">
                    <span class="result-label">Card Type</span>
                    <span class="result-value">${response.card_name}</span>
                </div>
            `;
        }
        
        if (response.pan && response.pan !== 'N/A') {
            resultHtml += `
                <div class="result-item">
                    <span class="result-label">Card Number</span>
                    <span class="result-value">${response.pan}</span>
                </div>
            `;
        }
        
        if (response.status) {
            resultHtml += `
                <div class="result-item">
                    <span class="result-label">Status</span>
                    <span class="result-value" style="color: var(--success-color); text-transform: uppercase;">${response.status}</span>
                </div>
            `;
        }
        
        if (response.rc && response.rc !== 'N/A') {
            resultHtml += `
                <div class="result-item">
                    <span class="result-label">Response Code</span>
                    <span class="result-value">${response.rc}</span>
                </div>
            `;
        }
        
        resultHtml += `</div>`;
        detailsEl.innerHTML = resultHtml;
        
        log(`Transaction successful: ${response.trx_id || 'N/A'}`, 'success');
        showToast('Success', 'Transaction processed successfully', 'success');
        
        // Clear cart after successful payment
        clearCart();
    } else {
        let errorMessage = response.msg || response.error || 'Transaction failed';
        
        detailsEl.innerHTML = `
            <div class="payment-result error">
                <div class="result-title error">
                    <i class="fas fa-times-circle"></i> Transaction Failed
                </div>
                <div class="result-item">
                    <span class="result-label">Error</span>
                    <span class="result-value">${errorMessage}</span>
                </div>
                ${response.rc ? `
                <div class="result-item">
                    <span class="result-label">Response Code</span>
                    <span class="result-value">${response.rc}</span>
                </div>
                ` : ''}
                ${response.status ? `
                <div class="result-item">
                    <span class="result-label">Status</span>
                    <span class="result-value" style="color: var(--danger-color);">${response.status}</span>
                </div>
                ` : ''}
            </div>
        `;
        
        log(`Transaction failed: ${errorMessage}`, 'error');
        showToast('Error', errorMessage, 'error');
    }
}

function showPaymentModal() {
    document.getElementById('paymentModal').classList.add('active');
    updatePaymentStatus('connecting', 'Connecting to EDC...', 'Please wait while we process your transaction');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    
    // Reset modal content
    setTimeout(() => {
        document.getElementById('paymentStatus').style.display = 'block';
        document.getElementById('paymentDetails').style.display = 'none';
        document.getElementById('paymentFooter').style.display = 'none';
    }, 300);
}

function updatePaymentStatus(status, message, detail) {
    const statusEl = document.getElementById('paymentStatus');
    statusEl.innerHTML = `
        <div class="spinner"></div>
        <p class="status-message">${message}</p>
        <p class="status-detail">${detail}</p>
    `;
}

// ===== Action Type UI Update =====
function updateActionTypeUI() {
    const actionType = document.getElementById('actionType')?.value || 'Sale';
    const paymentMethodSection = document.getElementById('paymentMethodSection');
    const cicilanOptions = document.getElementById('cicilanOptions');
    
    // Show/hide payment method based on action type
    if (actionType === 'Sale') {
        paymentMethodSection.style.display = 'block';
        cicilanOptions.style.display = 'none';
    } else if (actionType === 'Cicilan') {
        paymentMethodSection.style.display = 'none';
        cicilanOptions.style.display = 'block';
    } else {
        // Contactless, CardVerification - only support purchase method
        paymentMethodSection.style.display = 'none';
        cicilanOptions.style.display = 'none';
    }
}

// ===== Settings =====
function saveSettingsToState() {
    state.settings.protocol = document.querySelector('input[name="protocol"]:checked')?.value || 'wss';
    state.settings.edcSubdomain = document.getElementById('edcSubdomain')?.value || '';
    state.settings.edcPort = document.getElementById('edcPort')?.value || '6746';
    state.settings.posAddress = document.getElementById('posAddress')?.value || '172.0.0.1';
    state.settings.secretKey = document.getElementById('secretKey')?.value || 'ECR2022secretKey';
    state.settings.actionType = document.getElementById('defaultActionType')?.value || 'Sale';
    
    // Save to localStorage
    localStorage.setItem('posSettings', JSON.stringify(state.settings));
}

function loadSettings() {
    const saved = localStorage.getItem('posSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            Object.assign(state.settings, settings);
        } catch (error) {
            log('Failed to load settings', 'error');
        }
    }
    
    // Apply to form
    const protocolRadio = document.querySelector(`input[name="protocol"][value="${state.settings.protocol}"]`);
    if (protocolRadio) protocolRadio.checked = true;
    
    document.getElementById('edcSubdomain').value = state.settings.edcSubdomain || '';
    document.getElementById('edcPort').value = state.settings.edcPort;
    document.getElementById('posAddress').value = state.settings.posAddress;
    document.getElementById('secretKey').value = state.settings.secretKey;
    document.getElementById('defaultActionType').value = state.settings.actionType;
}

function saveSettings(event) {
    event.preventDefault();
    saveSettingsToState();
    log('Settings saved', 'success');
    showToast('Success', 'Settings saved successfully', 'success');
}

// ===== Utilities =====
function formatPrice(price) {
    return price.toLocaleString('id-ID');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Toast Notifications =====
function showToast(title, message, type = 'info') {
    const container = document.querySelector('.toast-container') || createToastContainer();
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <i class="fas fa-times toast-close" onclick="this.parentElement.remove()"></i>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    // Load settings
    loadSettings();
    
    // Initial render
    renderMenuGrid();
    renderMenuTable();
    renderCart();
    updateCartSummary();
    updateConnectionStatus();
    updateInfoPanel();
    updateActionTypeUI();
    
    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(item.dataset.tab);
        });
    });
    
    // Search menu
    document.getElementById('searchMenu')?.addEventListener('input', renderMenuGrid);
    
    // Action type change
    document.getElementById('actionType')?.addEventListener('change', updateActionTypeUI);
    
    // Log initial message
    log('POS Dummy ECR Link initialized', 'info');
    log('Encryption via API (66.42.53.16:8080) ready', 'info');
    log('Please configure EDC subdomain in Settings', 'info');
});

// Handle protocol change to update default port
document.querySelectorAll('input[name="protocol"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const portInput = document.getElementById('edcPort');
        if (e.target.value === 'wss') {
            portInput.value = '6746';
        } else {
            portInput.value = '6745';
        }
    });
});

// ===== DNS Hosts Setup Functions =====
function showHostsSetup() {
    document.getElementById('hostsModal').classList.add('active');
    
    // Get subdomain from settings
    const subdomain = state.settings.edcSubdomain || '[subdomain]';
    const fullDomain = subdomain !== '[subdomain]' ? `${subdomain}.pcsindonesia.com` : '[subdomain].pcsindonesia.com';
    
    // Update modal content with user's subdomain
    const modalDomain = document.getElementById('hostsModalDomain');
    if (modalDomain) {
        modalDomain.textContent = fullDomain;
    }
    
    // Update Windows script link
    const windowsLink = document.querySelector('a[href="setup-hosts-windows.bat"]');
    if (windowsLink) {
        // The script will be the same, but user needs to enter the domain when running
        windowsLink.setAttribute('download', `setup-hosts-${subdomain}.bat`);
    }
    
    // Update Mac/Linux script link
    const macLink = document.querySelector('a[href="setup-hosts-macos-linux.sh"]');
    if (macLink) {
        macLink.setAttribute('download', `setup-hosts-${subdomain}.sh`);
    }
    
    log('Opened DNS Hosts Setup dialog', 'info');
}

function closeHostsModal() {
    document.getElementById('hostsModal').classList.remove('active');
}

function updateHostsExample() {
    const ip = document.getElementById('hostsIpInput').value || '[IP_EDC]';
    const subdomain = document.getElementById('hostsDomainInput').value || '[subdomain]';
    const entry = `${ip} ${subdomain}.pcsindonesia.com`;
    document.getElementById('hostsEntryExample').textContent = entry;
    
    // Update ping test example
    const pingExample = document.getElementById('pingTestExample');
    if (pingExample) {
        if (subdomain && subdomain !== '[subdomain]') {
            pingExample.textContent = `ping ${subdomain}.pcsindonesia.com`;
        } else {
            pingExample.textContent = 'ping [subdomain].pcsindonesia.com';
        }
    }
    
    // Update info box domain
    const infoDomain = document.getElementById('hostsInfoDomain');
    if (infoDomain) {
        if (subdomain && subdomain !== '[subdomain]') {
            infoDomain.textContent = `${subdomain}.pcsindonesia.com`;
        } else {
            infoDomain.textContent = '[subdomain].pcsindonesia.com';
        }
    }
}

function copyHostsEntry() {
    const entry = document.getElementById('hostsEntryExample').textContent;
    navigator.clipboard.writeText(entry).then(() => {
        showToast('Copied', 'Hosts entry copied to clipboard', 'success');
    }).catch(() => {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = entry;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Copied', 'Hosts entry copied to clipboard', 'success');
    });
}

// ===== Certificate Setup Functions =====
function showCertificateSetup() {
    document.getElementById('certificateModal').classList.add('active');
    log('Opened Certificate Setup dialog', 'info');
}

function closeCertificateModal() {
    document.getElementById('certificateModal').classList.remove('active');
}

/**
 * Download CA Certificate
 * In real implementation, this would download the actual CA cert file
 */
function downloadCertificate() {
    // Create a dummy certificate content (in production, this should be the real CA cert)
    const certContent = `-----BEGIN CERTIFICATE-----
MIIFXTCCA0WgAwIBAgIQV7A7ZQC+IWLm6+Nt56IvCzANBgkqhkiG9w0BAQsFADBH
MRUwEwYDVQQKEwxQQ1MgSW5kb25lc2lhMSYwJAYDVQQDEx1QQ1MgSW5kb25lc2lh
IENlcnRpZmljYXRlIEF1dGhvcml0eTAeFw0yNDAxMDEwMDAwMDBaFw0zNDAxMDEw
MDAwMDBaMEcxFTATBgNVBAoTDFBDUyBJbmRvbmVzaWExJjAkBgNVBAMTHVBDUyBJ
bmRvbmVzaWEgQ2VydGlmaWNhdGUgQXV0aG9yaXR5MIICIjANBgkqhkiG9w0BAQEF
AAOCAg8AMIICCgKCAgEAygw/LGfMYyAac7Yo5qqOYZw5rfw+AgQ8j7kg5OfE+4J3
q2dfH+Ls7Oq6YrlncJpFQeSR8D35dlO4jNbGnnAJDU7NdNIL+hx/hqTRYpfZ1FM5
1l/dxOI9p0SPZ0HvwhbkQY8ZvBZJCRYBW4vJUf/IMWNiSpfoDV8LWL7gKt+Gxg9B
TtHrXmJRT/QxE22qLIFdaGh9hxCrdEYvvkWYpHAiePQSUfVgYnZxZutDcafwO4Fa
VKn/cuPO2lCq/DSD+2Ft0mRsR7K6hOxrLbfHraKRCmS/44vZLWvBGloaXJ5K6nuH
a523+0DSLYuzqdhy4sZzFjaJA+rJOZXRIDKb4V3LWQIDAQABo4IBKDCCASQwDgYD
VR0PAQH/BAQDAgGGMB0GA1UdJQQWMBQGCCsGAQUFBwMBBggrBgEFBQcDAjASBgNV
HRMBAf8ECDAGAQH/AgEAMB0GA1UdDgQWBBQj8L6zEtxkMf0nN6x6jK2Jl3hIqzAf
BgNVHSMEGDAWgBQj8L6zEtxkMf0nN6x6jK2Jl3hIqzA4BggrBgEFBQcBAQQsMCow
KAYIKwYBBQUHMAGGHGh0dHA6Ly9vY3NwLmNvbW9kb2NhLmNvbS9jYTAnBgNVHR8E
IDAeMBygGqAYhhZodHRwOi8vY3JsLmNvbW9kb2NhLmNvbTAzBgNVHSAELDAqMA8G
DSsGAQQBgjcVPTEBAgEEMQwGCisGAQQBgjcVATAIBgZngQwBAgIwDQYJKoZIhvcN
AQELBQADggIBAKaKUSUVzC8VQXtmyuPs3K/qhZS7bU6Vg8kS9LWqQ5RV7dM6jLKG
kxv8KCC7uK3mV1G4r8U8E2oF7X7vJdFJKY8OLGAFPLgG7Yr3j4gqf9BQ2Vx8pDB
fV5LKZLFGv8Hh4G0qH8x0MPLb0VBKm8+fHVX9gBp7oCv3l8CKH0R0Fb9GW9ZD1Yk
A2FZ0c3GkH5pQ3CCt6fEHmSLMVQBhd5o8d3B1LJx5Gpj5qK6hN9M5v7ERf7hF0qS
1qg6uLxQ7MO2gXNv7gTYrE9F3vT7X0lK9zjR3RF9qT3Bl5qN0vTl3qR8tN7Y0qT=
-----END CERTIFICATE-----`;

    // Create blob and download
    const blob = new Blob([certContent], { type: 'application/x-x509-ca-cert' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pcsindonesia_ca.crt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    log('Certificate downloaded: pcsindonesia_ca.crt', 'success');
    showToast('Success', 'Certificate downloaded. Please install it to Trusted Root CA.', 'success');
    
    // Highlight step 2
    document.getElementById('certStep2').style.background = '#fef3c7';
    setTimeout(() => {
        document.getElementById('certStep2').style.background = '';
    }, 2000);
}

/**
 * Verify certificate installation by testing WSS connection
 */
async function verifyCertificate() {
    const resultDiv = document.getElementById('certVerifyResult');
    resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing connection...';
    resultDiv.className = 'verify-result';
    
    if (!state.settings.edcIp) {
        resultDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error: IP EDC belum di-setting. Silakan isi di menu Pengaturan.';
        resultDiv.className = 'verify-result error';
        return;
    }
    
    const url = `wss://${state.settings.edcIp}:6746`;
    
    try {
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
            resultDiv.innerHTML = '<i class="fas fa-check-circle"></i> Success! Sertifikat ter-install dengan benar. WSS connection berhasil.';
            resultDiv.className = 'verify-result success';
            ws.close();
            log('Certificate verification successful', 'success');
        };
        
        ws.onerror = (error) => {
            resultDiv.innerHTML = '<i class="fas fa-times-circle"></i> Gagal! Sertifikat belum ter-install atau EDC tidak aktif. Pastikan sudah install sertifikat dan restart Chrome.';
            resultDiv.className = 'verify-result error';
            log('Certificate verification failed', 'error');
        };
        
        ws.onclose = (event) => {
            if (event.code === 1006) {
                resultDiv.innerHTML = '<i class="fas fa-times-circle"></i> Gagal! Code 1006 - Sertifikat belum di-trust oleh browser. Pastikan install ke "Trusted Root Certification Authorities".';
                resultDiv.className = 'verify-result error';
            }
        };
        
        // Timeout after 5 seconds
        setTimeout(() => {
            if (ws.readyState === WebSocket.CONNECTING) {
                ws.close();
                resultDiv.innerHTML = '<i class="fas fa-clock"></i> Timeout - Tidak bisa connect ke EDC. Pastikan EDC aktif dan IP benar.';
                resultDiv.className = 'verify-result error';
            }
        }, 5000);
        
    } catch (error) {
        resultDiv.innerHTML = `<i class="fas fa-times-circle"></i> Error: ${error.message}`;
        resultDiv.className = 'verify-result error';
    }
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    // ESC to close modals
    if (e.key === 'Escape') {
        closeModal();
        closePaymentModal();
        closeCertificateModal();
        closeHostsModal();
    }
    
    // F2 for payment
    if (e.key === 'F2' && state.cart.length > 0) {
        e.preventDefault();
        processPayment();
    }
});
