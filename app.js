/**
 * POS Dummy - ECR Link WebSocket Client
 * 
 * Aplikasi POS dummy untuk testing koneksi ke EDC via ECR Link
 * menggunakan WebSocket Secure (WSS) pada port 6746 atau WS pada port 6745
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
        protocol: 'ws',
        edcIp: '',
        edcPort: '6745',
        merchantId: 'MERCHANT001',
        terminalId: 'TERMINAL001',
        encryptionKey: '0123456789ABCDEF0123456789ABCDEF'
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
                this.ws = new WebSocket(url);
                
                this.ws.onopen = () => {
                    log('WebSocket connected successfully', 'success');
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
                    log('WebSocket error occurred', 'error');
                    console.error('WebSocket error:', error);
                    state.isConnecting = false;
                    updateConnectionStatus();
                    reject(error);
                };

                this.ws.onclose = (event) => {
                    log(`WebSocket closed: Code ${event.code}, Reason: ${event.reason || 'No reason provided'}`, 'warning');
                    state.isConnected = false;
                    state.isConnecting = false;
                    updateConnectionStatus();
                    
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`, 'info');
                        setTimeout(() => this.connect(url), this.reconnectDelay);
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

// ===== Encryption Utilities =====
const EncryptionUtils = {
    /**
     * Generate a random IV (Initialization Vector)
     */
    generateIV() {
        const iv = new Uint8Array(16);
        crypto.getRandomValues(iv);
        return iv;
    },

    /**
     * Convert hex string to Uint8Array
     */
    hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        return bytes;
    },

    /**
     * Convert Uint8Array to hex string
     */
    bytesToHex(bytes) {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    /**
     * Convert string to Uint8Array
     */
    stringToBytes(str) {
        return new TextEncoder().encode(str);
    },

    /**
     * Convert Uint8Array to string
     */
    bytesToString(bytes) {
        return new TextDecoder().decode(bytes);
    },

    /**
     * Encrypt data using AES-CBC
     * Note: This is a browser-based implementation. In production, 
     * proper key management and encryption should be used.
     */
    async encrypt(data, keyHex) {
        try {
            const keyData = this.hexToBytes(keyHex);
            const iv = this.generateIV();
            
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'AES-CBC' },
                false,
                ['encrypt']
            );

            const dataBytes = this.stringToBytes(data);
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-CBC', iv: iv },
                cryptoKey,
                dataBytes
            );

            // Combine IV + encrypted data
            const result = new Uint8Array(iv.length + encrypted.byteLength);
            result.set(iv, 0);
            result.set(new Uint8Array(encrypted), iv.length);

            return this.bytesToHex(result);
        } catch (error) {
            log(`Encryption error: ${error.message}`, 'error');
            // Fallback: return base64 encoded data if encryption fails
            return btoa(data);
        }
    },

    /**
     * Decrypt data using AES-CBC
     */
    async decrypt(encryptedHex, keyHex) {
        try {
            const encryptedData = this.hexToBytes(encryptedHex);
            const keyData = this.hexToBytes(keyHex);
            
            // Extract IV (first 16 bytes)
            const iv = encryptedData.slice(0, 16);
            const data = encryptedData.slice(16);

            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'AES-CBC' },
                false,
                ['decrypt']
            );

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-CBC', iv: iv },
                cryptoKey,
                data
            );

            return this.bytesToString(new Uint8Array(decrypted));
        } catch (error) {
            log(`Decryption error: ${error.message}`, 'error');
            // Fallback: try base64 decode
            try {
                return atob(encryptedHex);
            } catch {
                return encryptedHex;
            }
        }
    },

    /**
     * Generate transaction token according to ECR Link spec
     */
    async generateToken(transactionData) {
        const payload = JSON.stringify(transactionData);
        const encrypted = await this.encrypt(payload, state.settings.encryptionKey);
        return encrypted;
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
    document.getElementById('infoUrl').textContent = state.connectionUrl || '-';
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
    if (!state.settings.edcIp) {
        showToast('Error', 'Please configure EDC IP address in Settings', 'error');
        switchTab('settings');
        return;
    }
    
    const protocol = state.settings.protocol;
    const port = state.settings.edcPort || (protocol === 'wss' ? '6746' : '6745');
    const url = `${protocol}://${state.settings.edcIp}:${port}`;
    
    state.connectionUrl = url;
    
    try {
        await ecrWs.connect(url);
        showToast('Connected', 'Successfully connected to EDC', 'success');
    } catch (error) {
        showToast('Connection Failed', error.message || 'Could not connect to EDC', 'error');
    }
}

function testConnection() {
    saveSettingsToState();
    connectToEDC();
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
    
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (!paymentMethod) {
        showToast('Error', 'Please select payment method', 'error');
        return;
    }
    
    // Show payment modal
    showPaymentModal();
    
    // Calculate totals
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;
    
    // Prepare transaction data
    const transactionId = generateTransactionId();
    const transactionData = {
        transactionId: transactionId,
        merchantId: state.settings.merchantId,
        terminalId: state.settings.terminalId,
        timestamp: new Date().toISOString(),
        paymentMethod: paymentMethod,
        amount: total,
        currency: 'IDR',
        items: state.cart.map(item => ({
            name: item.name,
            qty: item.qty,
            price: item.price
        })),
        metadata: {
            posVersion: '1.0.0',
            ecrLinkVersion: '4.10.1'
        }
    };
    
    log(`Processing payment: ${paymentMethod}, Amount: Rp ${formatPrice(total)}`, 'info');
    
    try {
        // Ensure connection
        if (!state.isConnected) {
            updatePaymentStatus('connecting', 'Connecting to EDC...', 'Please wait while we establish connection');
            await connectToEDC();
        }
        
        if (!state.isConnected) {
            throw new Error('Failed to connect to EDC');
        }
        
        // Encrypt payload
        updatePaymentStatus('encrypting', 'Encrypting payload...', 'Securing transaction data');
        await sleep(500); // Small delay for UX
        
        const encryptedToken = await EncryptionUtils.generateToken(transactionData);
        log(`Encrypted token generated: ${encryptedToken.substring(0, 50)}...`, 'info');
        
        // Send to EDC
        updatePaymentStatus('sending', 'Sending to EDC...', 'Waiting for EDC response');
        
        const requestPayload = {
            type: 'PAYMENT_REQUEST',
            token: encryptedToken,
            raw: transactionData
        };
        
        const sent = ecrWs.send(requestPayload);
        if (!sent) {
            throw new Error('Failed to send payment request');
        }
        
        // Wait for response (in real implementation, this would be handled by onmessage)
        // For demo purposes, we'll simulate a response after a delay
        await sleep(3000);
        
        // Simulate success response (in real scenario, this comes from EDC)
        // This part should be replaced with actual response handling
        handlePaymentResponse({
            success: true,
            transactionId: transactionId,
            message: 'Payment processed successfully'
        });
        
    } catch (error) {
        log(`Payment failed: ${error.message}`, 'error');
        handlePaymentResponse({
            success: false,
            error: error.message
        });
    }
}

function handleMessage(data) {
    log(`Received: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`, 'received');
    
    try {
        const response = JSON.parse(data);
        handlePaymentResponse(response);
    } catch (error) {
        log(`Failed to parse response: ${error.message}`, 'error');
    }
}

function handlePaymentResponse(response) {
    const statusEl = document.getElementById('paymentStatus');
    const detailsEl = document.getElementById('paymentDetails');
    const footerEl = document.getElementById('paymentFooter');
    
    statusEl.style.display = 'none';
    detailsEl.style.display = 'block';
    footerEl.style.display = 'flex';
    
    if (response.success) {
        state.totalTransactions++;
        updateInfoPanel();
        
        detailsEl.innerHTML = `
            <div class="payment-result success">
                <div class="result-title success">
                    <i class="fas fa-check-circle"></i> Payment Successful
                </div>
                <div class="result-item">
                    <span class="result-label">Transaction ID</span>
                    <span class="result-value">${response.transactionId}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Amount</span>
                    <span class="result-value">${document.getElementById('total').textContent}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Status</span>
                    <span class="result-value" style="color: var(--success-color);">APPROVED</span>
                </div>
            </div>
        `;
        
        log(`Payment successful: ${response.transactionId}`, 'success');
        showToast('Success', 'Payment processed successfully', 'success');
        
        // Clear cart after successful payment
        clearCart();
    } else {
        detailsEl.innerHTML = `
            <div class="payment-result error">
                <div class="result-title error">
                    <i class="fas fa-times-circle"></i> Payment Failed
                </div>
                <div class="result-item">
                    <span class="result-label">Error</span>
                    <span class="result-value">${response.error || 'Unknown error'}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Status</span>
                    <span class="result-value" style="color: var(--danger-color);">DECLINED</span>
                </div>
            </div>
        `;
        
        log(`Payment failed: ${response.error || 'Unknown error'}`, 'error');
        showToast('Error', response.error || 'Payment failed', 'error');
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
    const messages = {
        connecting: { icon: 'spinner', color: 'var(--primary-color)' },
        encrypting: { icon: 'lock', color: 'var(--info-color)' },
        sending: { icon: 'spinner', color: 'var(--warning-color)' }
    };
    
    statusEl.innerHTML = `
        <div class="spinner"></div>
        <p class="status-message">${message}</p>
        <p class="status-detail">${detail}</p>
    `;
}

// ===== Settings =====
function saveSettingsToState() {
    state.settings.protocol = document.querySelector('input[name="protocol"]:checked')?.value || 'ws';
    state.settings.edcIp = document.getElementById('edcIp')?.value || '';
    state.settings.edcPort = document.getElementById('edcPort')?.value || '6745';
    state.settings.merchantId = document.getElementById('merchantId')?.value || 'MERCHANT001';
    state.settings.terminalId = document.getElementById('terminalId')?.value || 'TERMINAL001';
    state.settings.encryptionKey = document.getElementById('encryptionKey')?.value || '0123456789ABCDEF0123456789ABCDEF';
    
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
    
    document.getElementById('edcIp').value = state.settings.edcIp;
    document.getElementById('edcPort').value = state.settings.edcPort;
    document.getElementById('merchantId').value = state.settings.merchantId;
    document.getElementById('terminalId').value = state.settings.terminalId;
    document.getElementById('encryptionKey').value = state.settings.encryptionKey;
}

function saveSettings(event) {
    event.preventDefault();
    saveSettingsToState();
    log('Settings saved', 'success');
    showToast('Success', 'Settings saved successfully', 'success');
}

// ===== Utilities =====
function generateTransactionId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TXN${timestamp}${random}`;
}

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
    
    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(item.dataset.tab);
        });
    });
    
    // Search menu
    document.getElementById('searchMenu')?.addEventListener('input', renderMenuGrid);
    
    // Log initial message
    log('POS Dummy ECR Link initialized', 'info');
    log('Please configure EDC connection in Settings', 'info');
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

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    // ESC to close modals
    if (e.key === 'Escape') {
        closeModal();
        closePaymentModal();
    }
    
    // F2 for payment
    if (e.key === 'F2' && state.cart.length > 0) {
        e.preventDefault();
        processPayment();
    }
});
