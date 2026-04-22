
const DB = {
    get(key, defaultVal) {
        try {
            const v = localStorage.getItem('wazi_' + key);
            return v !== null ? JSON.parse(v) : defaultVal;
        } catch { return defaultVal; }
    },
    set(key, val) {
        localStorage.setItem('wazi_' + key, JSON.stringify(val));
    },
    remove(key) {
        localStorage.removeItem('wazi_' + key);
    }
};

// 預設資料初始化
function initDefaultData() {
    if (!DB.get('initialized', false)) {
        DB.set('employees', [
            { id: 1, name: '小可', hourly_rate: 180, bonus_rate: 0 },
            { id: 2, name: '小鳳', hourly_rate: 180, bonus_rate: 0 },
            { id: 3, name: '佩真', hourly_rate: 180, bonus_rate: 0 },
            { id: 4, name: 'RURU', hourly_rate: 180, bonus_rate: 0 },
            { id: 5, name: '小瑜', hourly_rate: 180, bonus_rate: 0 },
            { id: 6, name: '春滿', hourly_rate: 180, bonus_rate: 0 }
        ]);
        
        DB.set('vendors', [
            { id: 1, name: '麵包', type: 'items', items: [
                { name: '吐司', price: 35 },
                { name: '漢堡', price: 6.5 },
                { name: '大亨堡', price: 8 }
            ]},
            { id: 2, name: '喬富', type: 'amount' },
            { id: 3, name: '全閎', type: 'amount' },
            { id: 4, name: '蘿蔔糕', type: 'amount' },
            { id: 5, name: '昇威', type: 'amount' },
            { id: 6, name: '高麗菜', type: 'amount' }
        ]);

        DB.set('settings', {
            water_start: 144.9, water_price: 9,
            electric110_start: 12751.2, electric110_price: 5,
            electric220_start: 69325.4, electric220_price: 5,
            gas_start: 751, gas_price: 151,
            password: '1031',
            fee_rate: 2.4,
            cash_multipliers: { c1000: 1000, c100: 100, c50: 5, c10: 1.3333, c5: 1.1111 },
            opening_cash: 8000,
            default_rent: 50000,
            sub_electric110_start: 0, sub_electric110_price: 5,
            sub_electric220_start: 0, sub_electric220_price: 5
        });
        
        DB.set('nextEmpId', 100);
        DB.set('nextVendorId', 100);
        DB.set('initialized', true);
    }
}

// ==================== 全局變量 ====================
let currentUser = null;
let employees = [];
let vendors = [];
let miscellaneousItems = [];

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initDefaultData();

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('logDate').value = today;
    document.getElementById('settlementMonth').value = today.substring(0, 7);
    document.getElementById('reconciliationMonth').value = today.substring(0, 7);
    document.getElementById('reportMonth').value = today.substring(0, 7);

    employees = DB.get('employees', []);
    vendors = DB.get('vendors', []);

    // 取消登入密碼，直接顯示主畫面
    currentUser = 'admin';
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) loginScreen.style.display = 'none';
    const mainScreen = document.getElementById('mainScreen');
    if (mainScreen) mainScreen.style.display = 'block';
    switchTab('daily-log');

    bindDailyInputs();
    loadDailyLog();
});

function bindDailyInputs() {
    const cashFields = ['cash1000', 'cash100', 'cash50', 'cash10', 'cash5'];
    cashFields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.addEventListener('input', calculateCash);
    });
    const online = document.getElementById('onlineAmount');
    if (online) online.addEventListener('input', calculateOnline);
    const scan = document.getElementById('scanAmount');
    if (scan) scan.addEventListener('input', calculateScan);
}

// ==================== 登入/登出 ====================

function login() {
    const passwordInput = document.getElementById('passwordInput').value;
    const settings = DB.get('settings', {});
    const correctPassword = settings.password || '1031';
    
    if (passwordInput === correctPassword) {
        currentUser = 'admin';
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'block';
        switchTab('daily-log');
    } else {
        alert('❌ 密碼錯誤');
        document.getElementById('passwordInput').value = '';
    }
}

function logout() {
    if (confirm('確定要登出嗎？')) {
        currentUser = null;
        document.getElementById('mainScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('passwordInput').value = '';
    }
}

// ==================== 導航 ====================

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(tabName);
    if (target) target.classList.add('active');
    
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${tabName}'`)) {
            btn.classList.add('active');
        }
    });

    if (tabName === 'dashboard') loadDashboard();
    else if (tabName === 'daily-log') loadDailyLog();
    else if (tabName === 'reconciliation') loadReconciliation();
    else if (tabName === 'reports') loadReports();
    else if (tabName === 'settings') { loadEmployeesDisplay(); loadVendorsDisplay(); loadSettingsDisplay(); }
    else if (tabName === 'monthly') loadMonthlySettlementForm();
}

// ==================== 概況 ====================

function loadDashboard() {
    const month = new Date().toISOString().substring(0, 7);
    const stats = getMonthlyStats(month);

    const html = `
        <div class="stat-card">
            <h4>💰 總營業額</h4>
            <div class="value">NT$ ${stats.totalRevenue.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <h4>📅 營運天數</h4>
            <div class="value">${stats.workingDays}</div>
        </div>
        <div class="stat-card">
            <h4>📈 日均營收</h4>
            <div class="value">NT$ ${stats.avgDaily.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <h4>📦 廠商進貨</h4>
            <div class="value">NT$ ${stats.vendorTotal.toLocaleString()}</div>
        </div>
    `;
    document.getElementById('statsGrid').innerHTML = html;
}

// ==================== 每日記帳 ====================

function loadDailyLog() {
    const date = document.getElementById('logDate').value;
    const log = DB.get('daily_log_' + date, {});
    vendors = DB.get('vendors', []);

    const container = document.getElementById('cashInputContainer');
    if (log.cash?.mode === 'direct') {
        container.innerHTML = `
            <div class="form-group card" style="text-align:center;">
                <label>直接輸入現金總額</label>
                <input type="number" step="any" id="cashDirect" value="${log.cash.direct || ''}" placeholder="輸入總金額" inputmode="decimal" style="font-size:1.5em;padding:15px;max-width:300px;margin:0 auto;">
            </div>
        `;
        container.setAttribute('data-mode', 'direct');
        document.getElementById('cashDirect').addEventListener('input', calculateCash);
    } else {
        container.innerHTML = `
            <div class="cash-input-grid">
                <div class="cash-input-group"><label>千鈔</label><input type="number" step="any" id="cash1000" value="${log.cash?.c1000 || ''}" placeholder="張" inputmode="decimal"></div>
                <div class="cash-input-group"><label>百鈔</label><input type="number" step="any" id="cash100" value="${log.cash?.c100 || ''}" placeholder="張" inputmode="decimal"></div>
            </div>
            <div class="cash-input-grid" style="grid-template-columns: repeat(3, 1fr);">
                <div class="cash-input-group"><label>50元</label><input type="number" step="any" id="cash50" value="${log.cash?.c50 || ''}" placeholder="枚" inputmode="decimal"></div>
                <div class="cash-input-group"><label>10元</label><input type="number" step="any" id="cash10" value="${log.cash?.c10 || ''}" placeholder="枚/金" inputmode="decimal"></div>
                <div class="cash-input-group"><label>5元</label><input type="number" step="any" id="cash5" value="${log.cash?.c5 || ''}" placeholder="枚/金" inputmode="decimal"></div>
            </div>
        `;
        container.setAttribute('data-mode', 'count');
        ['cash1000', 'cash100', 'cash50', 'cash10', 'cash5'].forEach(f => {
            const el = document.getElementById(f);
            if (el) el.addEventListener('input', calculateCash);
        });
    }

    document.getElementById('onlineAmount').value = log.onlineAmount || '';
    document.getElementById('scanAmount').value = log.scanAmount || '';

    renderVendorPurchases(date);
    miscellaneousItems = log.miscellaneous || [];
    renderMiscTable();

    calculateCash();
    calculateOnline();
    calculateScan();
}

function toggleDirectCash() {
    const container = document.getElementById('cashInputContainer');
    const mode = container.getAttribute('data-mode');
    if (mode === 'count') {
        container.setAttribute('data-mode', 'direct');
        container.innerHTML = `<div class="form-group card" style="text-align:center;"><label>直接輸入現金總額</label><input type="number" step="any" id="cashDirect" placeholder="輸入總金額" inputmode="decimal" style="font-size:1.5em;padding:15px;max-width:300px;margin:0 auto;"></div>`;
        document.getElementById('cashDirect').addEventListener('input', calculateCash);
    } else {
        container.setAttribute('data-mode', 'count');
        container.innerHTML = `
            <div class="cash-input-grid">
                <div class="cash-input-group"><label>千鈔</label><input type="number" step="any" id="cash1000" placeholder="張" inputmode="decimal"></div>
                <div class="cash-input-group"><label>百鈔</label><input type="number" step="any" id="cash100" placeholder="張" inputmode="decimal"></div>
            </div>
            <div class="cash-input-grid" style="grid-template-columns: repeat(3, 1fr);">
                <div class="cash-input-group"><label>50元</label><input type="number" step="any" id="cash50" placeholder="枚" inputmode="decimal"></div>
                <div class="cash-input-group"><label>10元</label><input type="number" step="any" id="cash10" placeholder="枚/金" inputmode="decimal"></div>
                <div class="cash-input-group"><label>5元</label><input type="number" step="any" id="cash5" placeholder="枚/金" inputmode="decimal"></div>
            </div>
        `;
        ['cash1000', 'cash100', 'cash50', 'cash10', 'cash5'].forEach(f => {
            const el = document.getElementById(f);
            if (el) el.addEventListener('input', calculateCash);
        });
    }
    calculateCash();
}

function calculateCash() {
    const container = document.getElementById('cashInputContainer');
    const mode = container.getAttribute('data-mode');
    const settings = DB.get('settings', {});
    const mult = settings.cash_multipliers || { c1000: 1000, c100: 100, c50: 5, c10: 1.3333, c5: 1.1111 };
    const openingCash = settings.opening_cash || 8000;

    let total = 0;
    if (mode === 'direct') {
        total = parseFloat(document.getElementById('cashDirect').value) || 0;
    } else {
        const c1000 = (parseFloat(document.getElementById('cash1000').value) || 0) * mult.c1000;
        const c100 = (parseFloat(document.getElementById('cash100').value) || 0) * mult.c100;
        const c50 = (parseFloat(document.getElementById('cash50').value) || 0) * mult.c50;
        const c10 = (parseFloat(document.getElementById('cash10').value) || 0) * mult.c10;
        const c5 = (parseFloat(document.getElementById('cash5').value) || 0) * mult.c5;
        total = c1000 + c100 + c50 + c10 + c5;
    }

    // 零用金扣在現金
    const cashAfterOpening = total - openingCash;
    document.getElementById('cashTotal').innerText = 'NT$ ' + Math.round(cashAfterOpening).toLocaleString();
    updateDailyTotal();
}

function calculateOnline() {
    const settings = DB.get('settings', {});
    const rate = settings.fee_rate || 2.4;
    const amt = parseFloat(document.getElementById('onlineAmount').value) || 0;
    const actual = Math.round(amt * (100 - rate) / 100);
    document.getElementById('onlineActual').textContent = actual.toLocaleString();
    updateDailyTotal();
}

function calculateScan() {
    const settings = DB.get('settings', {});
    const rate = settings.fee_rate || 2.4;
    const amt = parseFloat(document.getElementById('scanAmount').value) || 0;
    const actual = Math.round(amt * (100 - rate) / 100);
    document.getElementById('scanActual').textContent = actual.toLocaleString();
    updateDailyTotal();
}

function updateDailyTotal() {
    const cashText = document.getElementById('cashTotal').textContent;
    const cash = parseInt(cashText.replace(/\D/g, '')) * (cashText.includes('-') ? -1 : 1) || 0;
    const online = parseInt(document.getElementById('onlineActual').textContent.replace(/\D/g, '')) || 0;
    const scan = parseInt(document.getElementById('scanActual').textContent.replace(/\D/g, '')) || 0;
    
    const total = cash + online + scan;
    document.getElementById('dailyTotal').textContent = 'NT$ ' + total.toLocaleString();
}

function renderVendorPurchases(date) {
    const container = document.getElementById('vendorPurchasesContainer');
    container.innerHTML = '';
    const log = DB.get('daily_log_' + date, {});
    const purchases = log.purchases || {};

    vendors.forEach(v => {
        let content = '';
        if (v.type === 'items') {
            v.items.forEach(item => {
                const val = purchases[v.id]?.[item.name] || '';
                content += `
                    <div style="display:flex; align-items:center; margin-bottom:5px;">
                        <span style="flex:1; font-size:0.85em;">${item.name}</span>
                        <input type="number" step="any" class="vendor-item-input" data-vendor-id="${v.id}" data-item-name="${item.name}" data-price="${item.price}" value="${val}" placeholder="數量 x ${item.price}" inputmode="decimal" style="width:120px; padding:5px; font-size:14px;">
                    </div>
                `;
            });
            const subtotal = calculateVendorSubtotal(v.id, purchases[v.id] || {});
            content += `<div style="text-align:right; font-size:0.8em; color:#667eea; margin-top:5px;">小計: NT$ <span id="subtotal-${v.id}">${subtotal.toLocaleString()}</span></div>`;
        } else {
            const val = purchases[v.id]?.amount || '';
            content = `<input type="number" step="any" class="vendor-amount-input" data-vendor-id="${v.id}" value="${val}" placeholder="金額" inputmode="decimal" style="width:100%; padding:10px;">`;
        }

        container.innerHTML += `
            <div class="card" style="padding:10px; border-left-color:#764ba2;">
                <h4 style="font-size:0.9em; margin-bottom:10px;">${v.name}</h4>
                ${content}
            </div>
        `;
    });

    document.querySelectorAll('.vendor-item-input').forEach(el => {
        el.addEventListener('input', (e) => {
            const vid = e.target.getAttribute('data-vendor-id');
            updateVendorSubtotal(vid);
        });
    });
}

function calculateVendorSubtotal(vendorId, data) {
    const v = vendors.find(v => v.id == vendorId);
    if (!v || v.type !== 'items') return 0;
    let total = 0;
    v.items.forEach(item => {
        const qty = parseFloat(data[item.name]) || 0;
        total += qty * item.price;
    });
    return Math.round(total);
}

function updateVendorSubtotal(vendorId) {
    let total = 0;
    document.querySelectorAll(`.vendor-item-input[data-vendor-id="${vendorId}"]`).forEach(el => {
        const qty = parseFloat(el.value) || 0;
        const price = parseFloat(el.getAttribute('data-price')) || 0;
        total += qty * price;
    });
    const el = document.getElementById(`subtotal-${vendorId}`);
    if (el) el.innerText = Math.round(total).toLocaleString();
}

function renderMiscTable() {
    const tbody = document.querySelector('#miscTable tbody');
    tbody.innerHTML = '';
    miscellaneousItems.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>NT$ ${item.amount.toLocaleString()}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteMiscellaneous(${index})">刪除</button></td>
            </tr>
        `;
    });
}

function addMiscellaneous() {
    const name = document.getElementById('miscName').value;
    const amount = parseFloat(document.getElementById('miscAmount').value) || 0;
    if (name && amount > 0) {
        miscellaneousItems.push({ name, amount });
        document.getElementById('miscName').value = '';
        document.getElementById('miscAmount').value = '';
        renderMiscTable();
    }
}

function deleteMiscellaneous(index) {
    miscellaneousItems.splice(index, 1);
    renderMiscTable();
}

function saveDailyLog() {
    const date = document.getElementById('logDate').value;
    const container = document.getElementById('cashInputContainer');
    const mode = container.getAttribute('data-mode');
    
    const cash = { mode };
    if (mode === 'direct') {
        cash.direct = parseFloat(document.getElementById('cashDirect').value) || 0;
    } else {
        cash.c1000 = parseFloat(document.getElementById('cash1000').value) || 0;
        cash.c100 = parseFloat(document.getElementById('cash100').value) || 0;
        cash.c50 = parseFloat(document.getElementById('cash50').value) || 0;
        cash.c10 = parseFloat(document.getElementById('cash10').value) || 0;
        cash.c5 = parseFloat(document.getElementById('cash5').value) || 0;
    }

    const purchases = {};
    vendors.forEach(v => {
        if (v.type === 'items') {
            purchases[v.id] = {};
            document.querySelectorAll(`.vendor-item-input[data-vendor-id="${v.id}"]`).forEach(el => {
                purchases[v.id][el.getAttribute('data-item-name')] = el.value;
            });
            purchases[v.id].amount = calculateVendorSubtotal(v.id, purchases[v.id]);
        } else {
            const amt = parseFloat(document.querySelector(`.vendor-amount-input[data-vendor-id="${v.id}"]`).value) || 0;
            purchases[v.id] = { amount: amt };
        }
    });

    const settings = DB.get('settings', {});
    const mult = settings.cash_multipliers || { c1000: 1000, c100: 100, c50: 5, c10: 1.3333, c5: 1.1111 };
    let cashTotal = 0;
    if (mode === 'direct') cashTotal = cash.direct;
    else cashTotal = (cash.c1000*mult.c1000) + (cash.c100*mult.c100) + (cash.c50*mult.c50) + (cash.c10*mult.c10) + (cash.c5*mult.c5);

    const log = {
        cash,
        cashTotal,
        onlineAmount: parseFloat(document.getElementById('onlineAmount').value) || 0,
        onlineActual: parseFloat(document.getElementById('onlineActual').innerText.replace(/,/g, '')) || 0,
        scanAmount: parseFloat(document.getElementById('scanAmount').value) || 0,
        scanActual: parseFloat(document.getElementById('scanActual').innerText.replace(/,/g, '')) || 0,
        dailyTotal: parseFloat(document.getElementById('dailyTotal').innerText.replace(/[^\d.-]/g, '')) || 0,
        purchases,
        miscellaneous: miscellaneousItems
    };

    DB.set('daily_log_' + date, log);
    alert('✅ 保存成功！');
}

// ==================== 廠商對帳 ====================

function loadReconciliation() {
    const month = document.getElementById('reconciliationMonth').value;
    const container = document.getElementById('vendorReconciliationContainer');
    container.innerHTML = '';

    vendors.forEach(v => {
        const dailyKeys = Object.keys(localStorage).filter(k => k.startsWith('wazi_daily_log_' + month)).sort();
        let total = 0;
        let detailsHtml = '';

        dailyKeys.forEach(key => {
            const date = key.replace('wazi_daily_log_', '');
            const log = DB.get('daily_log_' + date, {});
            const amt = log.purchases?.[v.id]?.amount || 0;
            if (amt > 0) {
                total += amt;
                detailsHtml += `
                    <div style="display:flex; justify-content:space-between; font-size:0.85em; padding:5px 0; border-bottom:1px dashed #eee;">
                        <span>${date.substring(8)}日</span>
                        <span>NT$ ${amt.toLocaleString()}</span>
                    </div>
                `;
            }
        });

        if (total > 0) {
            container.innerHTML += `
                <div class="card" style="border-left-color:#764ba2;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h4 style="margin:0;">${v.name}</h4>
                        <strong style="color:#764ba2;">總計: NT$ ${total.toLocaleString()}</strong>
                    </div>
                    <div class="collapse-btn" onclick="toggleCollapse('recon-${v.id}')" style="padding:5px; font-size:0.8em;">查看明細 <span>▼</span></div>
                    <div id="recon-${v.id}" class="collapse-content">
                        ${detailsHtml}
                    </div>
                </div>
            `;
        }
    });
}

// ==================== 月結算 ====================

function loadMonthlySettlementForm() {
    const month = document.getElementById('settlementMonth').value;
    const settlement = DB.get('monthly_settlement_' + month, {});
    const settings = DB.get('settings', {});
    
    let html = `
        <div class="card">
            <h4>👥 員工工時</h4>
            <div class="grid">
    `;
    employees.forEach(emp => {
        const val = settlement.staffHours?.[emp.id] || '';
        html += `<div class="form-group"><label>${emp.name}</label><input type="number" step="any" class="staff-hour" data-id="${emp.id}" value="${val}" placeholder="小時" inputmode="decimal"></div>`;
    });
    html += `
            </div>
        </div>
        <div class="card">
            <h4>⚡ 能源度數 (本月輸入)</h4>
            <div class="grid">
                <div class="form-group"><label>水費度數</label><input type="number" step="any" id="settle-water" value="${settlement.water || ''}" placeholder="度" inputmode="decimal"></div>
                <div class="form-group"><label>瓦斯度數</label><input type="number" step="any" id="settle-gas" value="${settlement.gas || ''}" placeholder="度" inputmode="decimal"></div>
                <div class="form-group"><label>電費 110V</label><input type="number" step="any" id="settle-e110" value="${settlement.e110 || ''}" placeholder="度" inputmode="decimal"></div>
                <div class="form-group"><label>電費 220V</label><input type="number" step="any" id="settle-e220" value="${settlement.e220 || ''}" placeholder="度" inputmode="decimal"></div>
            </div>
        </div>
        <div class="card">
            <h4>🏠 固定支出</h4>
            <div class="grid">
                <div class="form-group"><label>店面租金</label><input type="number" step="any" id="settle-rent" value="${settlement.rent || settings.default_rent || 50000}" inputmode="decimal"></div>
                <div class="form-group"><label>公攤費用</label><input type="number" step="any" id="settle-public" value="${settlement.publicFee || ''}" placeholder="金額" inputmode="decimal"></div>
                <div class="form-group"><label>營業稅 (輸入金額)</label><input type="number" step="any" id="settle-tax" value="${settlement.tax || ''}" placeholder="輸入金額" inputmode="decimal"></div>
            </div>
        </div>
        <button class="btn btn-success" style="width:100%; padding:15px;" onclick="saveMonthlySettlement()">💾 保存月結算</button>
    `;
    
    document.getElementById('staffHoursContainer').innerHTML = html;
}

function saveMonthlySettlement() {
    const month = document.getElementById('settlementMonth').value;
    const settings = DB.get('settings', {});
    
    const staffHours = {};
    document.querySelectorAll('.staff-hour').forEach(el => {
        staffHours[el.getAttribute('data-id')] = parseFloat(el.value) || 0;
    });
    
    const water = parseFloat(document.getElementById('settle-water').value) || 0;
    const gas = parseFloat(document.getElementById('settle-gas').value) || 0;
    const e110 = parseFloat(document.getElementById('settle-e110').value) || 0;
    const e220 = parseFloat(document.getElementById('settle-e220').value) || 0;
    const rent = parseFloat(document.getElementById('settle-rent').value) || 0;
    const publicFee = parseFloat(document.getElementById('settle-public').value) || 0;
    const tax = parseFloat(document.getElementById('settle-tax').value) || 0;
    
    const settlement = {
        staffHours, water, gas, e110, e220, rent, publicFee, tax,
        start_degrees: { water: settings.water_start, e110: settings.electric110_start, e220: settings.electric220_start, gas: settings.gas_start }
    };
    
    DB.set('monthly_settlement_' + month, settlement);
    
    if (water > 0) settings.water_start = water;
    if (e110 > 0) settings.electric110_start = e110;
    if (e220 > 0) settings.electric220_start = e220;
    if (gas > 0) settings.gas_start = gas;
    DB.set('settings', settings);
    
    alert('✅ 結算成功！目前度數已自動更新為下月起始度數。');
}

// ==================== 報表 ====================

function getMonthlyStats(month) {
    const dailyKeys = Object.keys(localStorage).filter(k => k.startsWith('wazi_daily_log_' + month));
    const settings = DB.get('settings', {});
    const openingCash = settings.opening_cash || 8000;
    
    let totalRevenue = 0, workingDays = 0, totalCashNet = 0;
    dailyKeys.forEach(key => {
        const log = DB.get(key.replace('wazi_', ''), {});
        if (log.dailyTotal !== undefined) { 
            totalRevenue += log.dailyTotal; 
            workingDays++; 
            // 報表中心：現金收入扣除零用金
            totalCashNet += (log.cashTotal - openingCash);
        }
    });
    const purchaseKeys = Object.keys(localStorage).filter(k => k.startsWith('wazi_purchases_' + month));
    let vendorTotal = 0;
    purchaseKeys.forEach(key => {
        const purchases = DB.get(key.replace('wazi_', ''), {});
        Object.values(purchases).forEach(p => { vendorTotal += p.amount || 0; });
    });
    const dailyLogs = dailyKeys.map(k => DB.get(k.replace('wazi_', ''), {}));
    let miscTotal = 0;
    dailyLogs.forEach(log => {
        (log.miscellaneous || []).forEach(i => { miscTotal += i.amount || 0; });
    });
    return { totalRevenue, vendorTotal, miscTotal, workingDays, avgDaily: workingDays > 0 ? Math.round(totalRevenue / workingDays) : 0, totalCashNet };
}

function loadReports() {
    const month = document.getElementById('reportMonth').value;
    const stats = getMonthlyStats(month);
    const settlement = DB.get('monthly_settlement_' + month, {});
    const settings = DB.get('settings', {});

    let html = `
        <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white;">
            <h3 style="margin-bottom:15px;">📊 ${month} 營運概況</h3>
            <div class="grid" style="grid-template-columns: repeat(2, 1fr); gap:10px;">
                <div><small>總營業額</small><br><strong>NT$ ${stats.totalRevenue.toLocaleString()}</strong></div>
                <div><small>日均營收</small><br><strong>NT$ ${stats.avgDaily.toLocaleString()}</strong></div>
                <div><small>現金淨額</small><br><strong>NT$ ${stats.totalCashNet.toLocaleString()}</strong></div>
                <div><small>營運天數</small><br><strong>${stats.workingDays} 天</strong></div>
            </div>
        </div>
    `;
    document.getElementById('reportContainer').innerHTML = html;
}

// ==================== 系統設定 ====================

function loadEmployeesDisplay() {
    const container = document.getElementById('employeeList');
    container.innerHTML = '';
    employees.forEach(emp => {
        container.innerHTML += `
            <div class="card" style="margin-bottom:10px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                <div><strong>${emp.name}</strong> (時薪: ${emp.hourly_rate}, 獎金: ${emp.bonus_rate}%)</div>
                <button class="btn btn-danger btn-sm" onclick="deleteEmployee(${emp.id})">刪除</button>
            </div>
        `;
    });
}

function addEmployee() {
    const name = document.getElementById('empName').value;
    const rate = parseFloat(document.getElementById('empRate').value) || 0;
    const bonus = parseFloat(document.getElementById('empBonus').value) || 0;
    if (name && rate > 0) {
        const nextId = DB.get('nextEmpId', 100);
        employees.push({ id: nextId, name, hourly_rate: rate, bonus_rate: bonus });
        DB.set('employees', employees);
        DB.set('nextEmpId', nextId + 1);
        loadEmployeesDisplay();
        document.getElementById('empName').value = '';
        document.getElementById('empRate').value = '';
        document.getElementById('empBonus').value = '';
    }
}

function deleteEmployee(id) {
    if (confirm('確定要刪除嗎？')) {
        employees = employees.filter(e => e.id !== id);
        DB.set('employees', employees);
        loadEmployeesDisplay();
    }
}

function loadVendorsDisplay() {
    const container = document.getElementById('vendorList');
    container.innerHTML = '';
    vendors.forEach(v => {
        container.innerHTML += `
            <div class="card" style="margin-bottom:10px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                <div><strong>${v.name}</strong> (${v.type === 'items' ? '品項模式' : '金額模式'})</div>
                <button class="btn btn-danger btn-sm" onclick="deleteVendor(${v.id})">刪除</button>
            </div>
        `;
    });
}

function addVendor() {
    const name = document.getElementById('vendorName').value;
    const type = document.getElementById('vendorType').value;
    if (name) {
        const nextId = DB.get('nextVendorId', 100);
        vendors.push({ id: nextId, name, type, items: type === 'items' ? [] : undefined });
        DB.set('vendors', vendors);
        DB.set('nextVendorId', nextId + 1);
        loadVendorsDisplay();
        document.getElementById('vendorName').value = '';
    }
}

function deleteVendor(id) {
    if (confirm('確定要刪除嗎？')) {
        vendors = vendors.filter(v => v.id !== id);
        DB.set('vendors', vendors);
        loadVendorsDisplay();
    }
}

function loadSettingsDisplay() {
    const settings = DB.get('settings', {});
    document.getElementById('set-water-start').value = settings.water_start || '';
    document.getElementById('set-e110-start').value = settings.electric110_start || '';
    document.getElementById('set-e220-start').value = settings.electric220_start || '';
    document.getElementById('set-gas-start').value = settings.gas_start || '';
    document.getElementById('set-fee-rate').value = settings.fee_rate || 2.4;
    document.getElementById('set-opening-cash').value = settings.opening_cash || 8000;
}

function saveSettings() {
    const settings = DB.get('settings', {});
    settings.water_start = parseFloat(document.getElementById('set-water-start').value) || 0;
    settings.electric110_start = parseFloat(document.getElementById('set-e110-start').value) || 0;
    settings.electric220_start = parseFloat(document.getElementById('set-e220-start').value) || 0;
    settings.gas_start = parseFloat(document.getElementById('set-gas-start').value) || 0;
    settings.fee_rate = parseFloat(document.getElementById('set-fee-rate').value) || 2.4;
    settings.opening_cash = parseFloat(document.getElementById('set-opening-cash').value) || 8000;
    
    DB.set('settings', settings);
    alert('✅ 設定已保存');
}

function toggleCollapse(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active');
}

function exportData() {
    const data = {};
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('wazi_')) data[k] = localStorage.getItem(k);
    });
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wazi_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
            alert('✅ 匯入成功，頁面即將刷新');
            location.reload();
        } catch { alert('❌ 匯入失敗，請檢查檔案格式'); }
    };
    reader.readAsText(file);
}

function clearHistory() {
    const settings = DB.get('settings', {});
    const pw = prompt('請輸入管理密碼以清理歷史帳目：');
    if (pw === (settings.password || '1031')) {
        if (confirm('確定要清理所有歷史帳目嗎？(將保留員工、廠商與度數設定)')) {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith('wazi_daily_log_') || k.startsWith('wazi_monthly_settlement_')) {
                    localStorage.removeItem(k);
                }
            });
            alert('✅ 歷史帳目已清理');
            location.reload();
        }
    } else {
        alert('❌ 密碼錯誤');
    }
}
