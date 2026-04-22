// ==================== localStorage 資料層 ====================

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
    let totalRevenue = 0, workingDays = 0;
    dailyKeys.forEach(key => {
        const log = DB.get(key.replace('wazi_', ''), {});
        if (log.dailyTotal !== undefined) { totalRevenue += log.dailyTotal; workingDays++; }
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
    return { totalRevenue, vendorTotal, miscTotal, workingDays, avgDaily: workingDays > 0 ? Math.round(totalRevenue / workingDays) : 0 };
}

function loadReports() {
    const month = document.getElementById('reportMonth').value;
    const stats = getMonthlyStats(month);
    const settlement = DB.get('monthly_settlement_' + month, {});
    const settings = DB.get('settings', {});
    const startDegrees = settlement.start_degrees || { water: settings.water_start, e110: settings.electric110_start, e220: settings.electric220_start, gas: settings.gas_start };
    const openingCash = settings.opening_cash || 8000;

    let html = `<h3 style="text-align:center;">📊 ${month} 報表</h3>`;
    
    html += `<h3 style="margin-top:20px;text-align:center;">每日營業額</h3><div class="table-responsive"><table><thead><tr><th>日期</th><th>現金</th><th>其他</th><th>總額</th></tr></thead><tbody>`;
    const dailyKeys = Object.keys(localStorage).filter(k => k.startsWith('wazi_daily_log_' + month)).sort();
    dailyKeys.forEach(key => {
        const date = key.replace('wazi_daily_log_', ''), log = DB.get('daily_log_' + date, {});
        if (log.dailyTotal !== undefined) {
            // 報表中心：現金收入應扣除零用金
            const cash = (log.cashTotal || 0) - openingCash;
            const other = (log.onlineActual || 0) + (log.scanActual || 0);
            html += `<tr><td>${date.substring(8)}日</td><td>NT$ ${cash.toLocaleString()}</td><td>NT$ ${other.toLocaleString()}</td><td><strong>NT$ ${log.dailyTotal.toLocaleString()}</strong></td></tr>`;
        }
    });
    html += `</tbody></table></div><div class="alert alert-success" style="font-size:0.9em;text-align:center;"><strong>全月總營收:</strong> NT$ ${stats.totalRevenue.toLocaleString()}</div>`;

    let totalSalary = 0;
    html += `<h3 style="margin-top:20px;text-align:center;">員工薪資</h3><div class="table-responsive"><table><thead><tr><th>員工</th><th>總薪資</th></tr></thead><tbody>`;
    employees.forEach(emp => {
        const hours = settlement.staffHours?.[emp.id] || 0;
        const bonus = Math.round(emp.hourly_rate * hours * (emp.bonus_rate / 100));
        const total = Math.round(emp.hourly_rate * hours + bonus);
        totalSalary += total;
        html += `<tr><td>${emp.name}</td><td>NT$ ${total.toLocaleString()}</td></tr>`;
    });
    html += `</tbody></table></div>`;

    const water = Math.max(0, (settlement.water || 0) - (startDegrees.water || 0)) * (settings.water_price || 9);
    const mainE110 = Math.max(0, (settlement.e110 || 0) - (startDegrees.e110 || 0)) * (settings.electric110_price || 5);
    const mainE220 = Math.max(0, (settlement.e220 || 0) - (startDegrees.e220 || 0)) * (settings.electric220_price || 5);
    const electric = mainE110 + mainE220;
    const gas = Math.max(0, (settlement.gas || 0) - (startDegrees.gas || 0)) * (settings.gas_price || 151);
    const tax = (settlement.tax || 0) * 0.05;
    const rent = settlement.rent || 0;
    const publicFee = settlement.publicFee || 0;
    const equipmentRent = 1500;
    const totalFixed = water + electric + gas + rent + publicFee + tax + stats.miscTotal + equipmentRent;
    
    const net = stats.totalRevenue - totalSalary - stats.vendorTotal - Math.round(totalFixed);
    html += `<h3 style="margin-top:20px;text-align:center;">本月淨利</h3><div class="alert alert-success" style="font-size:1.3em;padding:20px;text-align:center;"><strong style="font-size:1.5em;">NT$ ${net.toLocaleString()}</strong></div>`;
    html += `<button class="btn btn-primary" style="width:100%" onclick="generatePDF('${month}')">📄 導出 PDF</button>`;
    document.getElementById('reportStats').innerHTML = html;
}

function generatePDF(month) {
    const stats = getMonthlyStats(month);
    const settlement = DB.get('monthly_settlement_' + month, {});
    const settings = DB.get('settings', {});
    const startDegrees = settlement.start_degrees || { water: settings.water_start, e110: settings.electric110_start, e220: settings.electric220_start, gas: settings.gas_start };

    const water = Math.max(0, (settlement.water || 0) - (startDegrees.water || 0)) * (settings.water_price || 9);
    const mainE110 = Math.max(0, (settlement.e110 || 0) - (startDegrees.e110 || 0)) * (settings.electric110_price || 5);
    const mainE220 = Math.max(0, (settlement.e220 || 0) - (startDegrees.e220 || 0)) * (settings.electric220_price || 5);
    const electric = mainE110 + mainE220;
    const gas = Math.max(0, (settlement.gas || 0) - (startDegrees.gas || 0)) * (settings.gas_price || 151);
    const tax = (settlement.tax || 0) * 0.05;
    const rent = settlement.rent || 0;
    const publicFee = settlement.publicFee || 0;
    const equipmentRent = 1500;
    const totalFixed = water + electric + gas + rent + publicFee + tax + stats.miscTotal + equipmentRent;

    let totalSalary = 0;
    employees.forEach(emp => {
        const hours = settlement.staffHours?.[emp.id] || 0;
        const bonus = Math.round(emp.hourly_rate * hours * (emp.bonus_rate / 100));
        totalSalary += Math.round(emp.hourly_rate * hours + bonus);
    });

    const net = stats.totalRevenue - totalSalary - stats.vendorTotal - Math.round(totalFixed);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><title>${month} 報表</title><style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background: #f2f2f2; }
            .summary { background: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 20px; }
        </style></head><body>
            <h1>Wazi 早餐店 - ${month} 營運報表</h1>
            <div class="summary">
                <h2>本月結算摘要</h2>
                <p>總營業額: NT$ ${stats.totalRevenue.toLocaleString()}</p>
                <p>總進貨支出: NT$ ${stats.vendorTotal.toLocaleString()}</p>
                <p>總人事支出: NT$ ${totalSalary.toLocaleString()}</p>
                <p>總固定支出: NT$ ${Math.round(totalFixed).toLocaleString()}</p>
                <hr>
                <h2 style="color:#2ecc71;">本月淨利: NT$ ${net.toLocaleString()}</h2>
            </div>
        </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ==================== 系統設定 ====================

function toggleCollapse(id) {
    const content = document.getElementById(id);
    content.classList.toggle('active');
}

function loadEmployeesDisplay() {
    const container = document.getElementById('employeesContainer');
    container.innerHTML = '';
    employees.forEach(emp => {
        container.innerHTML += `
            <div class="card" style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong>${emp.name}</strong>
                    <div>
                        <button class="btn btn-primary btn-sm" onclick="editEmployee(${emp.id})">編輯</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteEmployee(${emp.id})">刪除</button>
                    </div>
                </div>
                <div id="edit-emp-${emp.id}" class="hidden" style="border-top:1px solid #eee; padding-top:10px;">
                    <div class="grid">
                        <div class="form-group"><label>時薪</label><input type="number" id="edit-rate-${emp.id}" value="${emp.hourly_rate}" inputmode="decimal"></div>
                        <div class="form-group"><label>獎金 %</label><input type="number" id="edit-bonus-${emp.id}" value="${emp.bonus_rate}" inputmode="decimal"></div>
                    </div>
                    <button class="btn btn-success btn-sm" style="width:100%" onclick="saveEmployee(${emp.id})">保存修改</button>
                </div>
            </div>
        `;
    });
}

function showAddEmployeeForm() {
    document.getElementById('addEmployeeForm').classList.toggle('hidden');
}

function addEmployee() {
    const name = document.getElementById('newEmpName').value;
    const rate = parseFloat(document.getElementById('newEmpRate').value) || 180;
    const bonus = parseFloat(document.getElementById('newEmpBonus').value) || 0;
    if (name) {
        const nextId = DB.get('nextEmpId', 100);
        employees.push({ id: nextId, name, hourly_rate: rate, bonus_rate: bonus });
        DB.set('employees', employees);
        DB.set('nextEmpId', nextId + 1);
        document.getElementById('newEmpName').value = '';
        showAddEmployeeForm();
        loadEmployeesDisplay();
    }
}

function editEmployee(id) {
    document.getElementById(`edit-emp-${id}`).classList.toggle('hidden');
}

function saveEmployee(id) {
    const rate = parseFloat(document.getElementById(`edit-rate-${id}`).value) || 180;
    const bonus = parseFloat(document.getElementById(`edit-bonus-${id}`).value) || 0;
    const idx = employees.findIndex(e => e.id == id);
    if (idx !== -1) {
        employees[idx].hourly_rate = rate;
        employees[idx].bonus_rate = bonus;
        DB.set('employees', employees);
        loadEmployeesDisplay();
        alert('✅ 員工資料已更新');
    }
}

function deleteEmployee(id) {
    if (confirm('確定要刪除此員工嗎？')) {
        employees = employees.filter(e => e.id != id);
        DB.set('employees', employees);
        loadEmployeesDisplay();
    }
}

function loadVendorsDisplay() {
    const container = document.getElementById('vendorsContainer');
    container.innerHTML = '';
    vendors.forEach(v => {
        let itemsHtml = '';
        if (v.type === 'items') {
            v.items.forEach((item, idx) => {
                itemsHtml += `
                    <div style="display:flex; gap:5px; margin-bottom:5px;">
                        <input type="text" value="${item.name}" onchange="updateVendorItem(${v.id}, ${idx}, 'name', this.value)" style="flex:2; font-size:14px;">
                        <input type="number" value="${item.price}" onchange="updateVendorItem(${v.id}, ${idx}, 'price', this.value)" style="flex:1; font-size:14px;" inputmode="decimal">
                        <button class="btn btn-danger btn-sm" onclick="deleteVendorItem(${v.id}, ${idx})">×</button>
                    </div>
                `;
            });
            itemsHtml += `<button class="btn btn-secondary btn-sm" style="width:100%; margin-top:5px;" onclick="addVendorItem(${v.id})">+ 新增品項</button>`;
        }
        
        container.innerHTML += `
            <div class="card" style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong>${v.name} (${v.type === 'items' ? '品項模式' : '金額模式'})</strong>
                    <button class="btn btn-danger btn-sm" onclick="deleteVendor(${v.id})">刪除</button>
                </div>
                ${itemsHtml}
            </div>
        `;
    });
}

function showAddVendorForm() {
    document.getElementById('addVendorForm').classList.toggle('hidden');
}

function addVendor() {
    const name = document.getElementById('newVendorName').value;
    const type = document.getElementById('newVendorType').value;
    if (name) {
        const nextId = DB.get('nextVendorId', 100);
        const newVendor = { id: nextId, name, type };
        if (type === 'items') newVendor.items = [];
        vendors.push(newVendor);
        DB.set('vendors', vendors);
        DB.set('nextVendorId', nextId + 1);
        document.getElementById('newVendorName').value = '';
        showAddVendorForm();
        loadVendorsDisplay();
    }
}

function deleteVendor(id) {
    if (confirm('確定要刪除此廠商嗎？')) {
        vendors = vendors.filter(v => v.id != id);
        DB.set('vendors', vendors);
        loadVendorsDisplay();
    }
}

function addVendorItem(vendorId) {
    const idx = vendors.findIndex(v => v.id == vendorId);
    if (idx !== -1) {
        vendors[idx].items.push({ name: '新品項', price: 0 });
        DB.set('vendors', vendors);
        loadVendorsDisplay();
    }
}

function updateVendorItem(vendorId, itemIdx, field, value) {
    const idx = vendors.findIndex(v => v.id == vendorId);
    if (idx !== -1) {
        if (field === 'price') value = parseFloat(value) || 0;
        vendors[idx].items[itemIdx][field] = value;
        DB.set('vendors', vendors);
    }
}

function deleteVendorItem(vendorId, itemIdx) {
    const idx = vendors.findIndex(v => v.id == vendorId);
    if (idx !== -1) {
        vendors[idx].items.splice(itemIdx, 1);
        DB.set('vendors', vendors);
        loadVendorsDisplay();
    }
}

function loadSettingsDisplay() {
    const settings = DB.get('settings', {});
    const container = document.getElementById('settingsContainer');
    container.innerHTML = `
        <div class="card">
            <h4>💰 基礎設定</h4>
            <div class="grid">
                <div class="form-group"><label>開盤零用金</label><input type="number" id="set-opening" value="${settings.opening_cash || 8000}" inputmode="decimal"></div>
                <div class="form-group"><label>支付手續費 %</label><input type="number" id="set-fee" value="${settings.fee_rate || 2.4}" step="0.1" inputmode="decimal"></div>
            </div>
            <div class="grid">
                <div class="form-group"><label>預設租金</label><input type="number" id="set-rent" value="${settings.default_rent || 50000}" inputmode="decimal"></div>
                <div class="form-group"><label>系統密碼</label><input type="password" id="set-pass" value="${settings.password || '1031'}" inputmode="decimal"></div>
            </div>
        </div>
        <div class="card">
            <h4>⚡ 能源單價設定</h4>
            <div class="grid">
                <div class="form-group"><label>水費單價</label><input type="number" id="set-water-p" value="${settings.water_price || 9}" inputmode="decimal"></div>
                <div class="form-group"><label>瓦斯單價</label><input type="number" id="set-gas-p" value="${settings.gas_price || 151}" inputmode="decimal"></div>
            </div>
            <div class="grid">
                <div class="form-group"><label>電費 110V</label><input type="number" id="set-e110-p" value="${settings.electric110_price || 5}" inputmode="decimal"></div>
                <div class="form-group"><label>電費 220V</label><input type="number" id="set-e220-p" value="${settings.electric220_price || 5}" inputmode="decimal"></div>
            </div>
        </div>
        <div class="card">
            <h4>📏 能源起始度數</h4>
            <div class="grid">
                <div class="form-group"><label>水費起始</label><input type="number" id="set-water-s" value="${settings.water_start || 0}" inputmode="decimal"></div>
                <div class="form-group"><label>瓦斯起始</label><input type="number" id="set-gas-s" value="${settings.gas_start || 0}" inputmode="decimal"></div>
            </div>
            <div class="grid">
                <div class="form-group"><label>110V 起始</label><input type="number" id="set-e110-s" value="${settings.electric110_start || 0}" inputmode="decimal"></div>
                <div class="form-group"><label>220V 起始</label><input type="number" id="set-e220-s" value="${settings.electric220_start || 0}" inputmode="decimal"></div>
            </div>
        </div>
        <button class="btn btn-success" style="width:100%; padding:15px;" onclick="saveGeneralSettings()">💾 保存系統設定</button>
        
        <div style="margin-top:20px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <button class="btn btn-primary" onclick="exportData()">📤 備份資料</button>
            <button class="btn btn-primary" onclick="importData()">📥 還原資料</button>
        </div>
        <button class="btn btn-danger" style="width:100%; margin-top:10px;" onclick="clearAllData()">🗑️ 清理歷史帳目</button>
    `;
}

function saveGeneralSettings() {
    const settings = DB.get('settings', {});
    settings.opening_cash = parseFloat(document.getElementById('set-opening').value) || 8000;
    settings.fee_rate = parseFloat(document.getElementById('set-fee').value) || 2.4;
    settings.default_rent = parseFloat(document.getElementById('set-rent').value) || 50000;
    settings.password = document.getElementById('set-pass').value || '1031';
    
    settings.water_price = parseFloat(document.getElementById('set-water-p').value) || 9;
    settings.gas_price = parseFloat(document.getElementById('set-gas-p').value) || 151;
    settings.electric110_price = parseFloat(document.getElementById('set-e110-p').value) || 5;
    settings.electric220_price = parseFloat(document.getElementById('set-e220-p').value) || 5;
    
    settings.water_start = parseFloat(document.getElementById('set-water-s').value) || 0;
    settings.gas_start = parseFloat(document.getElementById('set-gas-s').value) || 0;
    settings.electric110_start = parseFloat(document.getElementById('set-e110-s').value) || 0;
    settings.electric220_start = parseFloat(document.getElementById('set-e220-s').value) || 0;
    
    DB.set('settings', settings);
    alert('✅ 系統設定已保存');
}

function exportData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('wazi_')) {
            data[key] = localStorage.getItem(key);
        }
    }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wazi_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            const data = JSON.parse(reader.result);
            Object.keys(data).forEach(key => {
                localStorage.setItem(key, data[key]);
            });
            alert('✅ 資料還原成功，請重新整理網頁。');
            location.reload();
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearAllData() {
    const pass = prompt('請輸入系統密碼以確認清理所有歷史帳目：');
    const settings = DB.get('settings', {});
    if (pass === (settings.password || '1031')) {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('wazi_daily_log_') || k.startsWith('wazi_monthly_settlement_'));
        keys.forEach(k => localStorage.removeItem(k));
        alert('✅ 歷史帳目已清理（保留了員工、廠商與度數設定）。');
        location.reload();
    } else {
        alert('❌ 密碼錯誤，取消清理。');
    }
}
