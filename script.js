const API = 'https://agro-server-nuwi.onrender.com'; // ТВОЙ АДРЕС RENDER
let user = JSON.parse(localStorage.getItem('agro_u'));
let lastLogsCount = 0;
let activeJob = null;

function toggleAuth(isLogin) {
    document.getElementById('login-form').classList.toggle('hidden', !isLogin);
    document.getElementById('reg-form').classList.toggle('hidden', isLogin);
}

async function register() {
    const payload = {
        name: document.getElementById('r-name').value,
        phone: document.getElementById('r-phone').value,
        role: document.getElementById('r-role').value,
        id: document.getElementById('r-id').value,
        pass: document.getElementById('r-pass').value
    };
    if(!payload.id || !payload.pass || !payload.name) return alert("Заполни все поля!");
    const res = await fetch(`${API}/api/register`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
    if(res.ok) { alert("Успех!"); toggleAuth(true); } else alert("Ошибка регистрации");
}

async function login() {
    const id = document.getElementById('l-id').value;
    const pass = document.getElementById('l-pass').value;
    const res = await fetch(`${API}/api/state`);
    const data = await res.json();
    const found = data.users.find(u => u.id === id && u.pass === pass);
    if(found) { user = found; localStorage.setItem('agro_u', JSON.stringify(found)); startApp(); } 
    else alert("Ошибка входа!");
}

function logout() { localStorage.removeItem('agro_u'); location.reload(); }

function startApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('u-name').innerText = user.name;
    document.getElementById('u-role').innerText = user.role === 'owner' ? 'Boss' : 'Админ';
    
    if(user.role === 'owner') {
        document.getElementById('nav-owner').classList.remove('hidden');
        document.getElementById('add-field-btn').classList.remove('hidden');
    } else {
        document.getElementById('nav-worker').classList.remove('hidden');
    }
    refresh(); setInterval(refresh, 5000);
}

async function refresh() {
    try {
        const res = await fetch(`${API}/api/state`);
        const data = await res.json();
        if(user.role === 'owner') renderBoss(data); else renderWorker(data);
        handleLogs(data.logs);
    } catch(e) { console.log("Offline"); }
}

function renderBoss(data) {
    document.getElementById('boss-list').innerHTML = data.fields.map(f => `
        <div class="bg-white p-5 rounded-3xl shadow-sm border-l-8 ${f.stage==='Завершено'?'border-emerald-500':'border-orange-400'}">
            <h3 class="font-black text-lg">${f.name}</h3>
            <p class="text-[10px] font-bold text-slate-400">АДМИН: ${f.assignedTo} | ${f.area} Га</p>
            <div class="mt-2 text-[9px] font-black uppercase text-emerald-600">${f.stage}</div>
        </div>
    `).join('');

    document.getElementById('reports-body').innerHTML = data.reports.map(r => `
        <tr class="border-b">
            <td class="p-3"><span class="font-black">${r.field}</span><br>${r.worker}</td>
            <td class="p-3">${r.work}</td>
            <td class="p-3 text-blue-600 font-bold">${r.techCost} ₸</td>
            <td class="p-3 font-black text-emerald-600">${r.perHa} ₸</td>
        </tr>
    `).join('');

    renderStock(data.stock);
    
    const sc = document.getElementById('scales-ui');
    if (data.truckInWay) {
        sc.innerHTML = `<h2 class="text-xl font-black mb-4 uppercase">${data.truckInWay.plate}</h2>
            <input id="netto" type="number" placeholder="ВЕС (КГ)" class="input-field mb-4 text-center">
            <button onclick="acceptWeight()" class="btn-primary">Принять вес</button>`;
    } else sc.innerHTML = `<p class="text-slate-300 font-black uppercase text-[10px]">Машин в пути нет</p>`;
}

function renderStock(s) {
    const d = document.getElementById('stock-display');
    d.innerHTML = `
        <div class="col-span-2 text-emerald-600 border-b pb-1">ОСНОВНОЕ:</div>
        <div class="bg-slate-50 p-3 rounded-xl">⛽ ГСМ: ${s.fuel} л</div>
        <div class="bg-slate-50 p-3 rounded-xl">🌿 Глифосад: ${s.glyphosate} л</div>
        <div class="col-span-2 text-blue-600 border-b pb-1 mt-2">СЕМЕНА:</div>
        <div>🌽 Кукур: ${s.seeds.corn} кг</div>
        <div>🌱 Соя: ${s.seeds.soy} кг</div>
        <div>🍬 Свекла: ${s.seeds.beet} кг</div>
        <div class="col-span-2 text-orange-600 border-b pb-1 mt-2">УДОБРЕНИЯ:</div>
        <div>💎 Аммоф: ${s.fertilizers.ammos} кг</div>
        <div>💎 Диамм: ${s.fertilizers.diammos} кг</div>
        <div>💎 Селит: ${s.fertilizers.selitra} кг</div>
    `;
}

function updateStockItems() {
    const cat = document.getElementById('st-cat').value;
    const itemSelect = document.getElementById('st-item');
    const items = {
        seeds: { corn: 'Кукуруза', soy: 'Соя', beet: 'Свекла' },
        fertilizers: { ammos: 'Аммофос', diammos: 'Диаммофос', nitram: 'Нитраммофоска', selitra: 'Селитра', carbamid: 'Карбамид' }
    };
    if (items[cat]) {
        itemSelect.classList.remove('hidden');
        itemSelect.innerHTML = Object.entries(items[cat]).map(([k,v]) => `<option value="${k}">${v}</option>`).join('');
    } else { itemSelect.classList.add('hidden'); }
}

async function addStock() {
    const p = { category: document.getElementById('st-cat').value, item: document.getElementById('st-item').value, amount: document.getElementById('st-amount').value };
    await fetch(`${API}/api/stock-up`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p) });
    refresh();
}

function renderWorker(data) {
    const my = data.fields.filter(f => f.assignedTo === user.id);
    document.getElementById('w-jobs').innerHTML = my.map(f => `
        <div class="bg-white p-6 rounded-[2rem] shadow-sm border-l-8 border-orange-400">
            <h3 class="font-black text-xl mb-3">${f.name}</h3>
            ${getBtn(f)}
        </div>
    `).join('');
    const stat = data.workers[user.id] || {bonus:0, fuelSpent:0};
    document.getElementById('worker-stats-card').innerHTML = `
        <p class="font-black text-emerald-600 text-2xl">${stat.bonus} ₸</p>
        <p class="text-[10px] uppercase font-bold text-slate-300">Твоя премия</p>`;
}

function getBtn(f) {
    if(f.stage === 'Ожидание') return `<button onclick="setStatus(${f.id}, 'Пахота')" class="btn-primary">Начать пахоту</button>`;
    if(['Пахота', 'Боронование', 'Посев'].includes(f.stage)) {
        let next = f.stage === 'Пахота' ? 'Боронование' : (f.stage === 'Боронование' ? 'Посев' : 'Завершено');
        return `<button onclick="openFinish(${f.id}, '${f.stage}', '${next}')" class="btn-dark">Завершить ${f.stage}</button>`;
    }
    return `<div class="text-emerald-500 font-black uppercase text-xs">Участок готов</div>`;
}

async function saveField() {
    const p = { name: document.getElementById('fn-name').value, area: document.getElementById('fn-area').value, workerId: document.getElementById('fn-worker').value, ownerId: user.id };
    const res = await fetch(`${API}/api/assign-field`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p) });
    if(res.ok) { closeModals(); refresh(); } else alert("Ошибка: только Boss может создавать!");
}

// Остальные функции (submitFinish, setStatus, acceptWeight, sendTruck, handleLogs, showNotif, tab, closeModals, openTruckModal)
// должны быть скопированы из твоего предыдущего script.js без изменений.

async function submitFinish() {
    const p = { fieldId: activeJob.id, stageName: activeJob.stage, nextStage: activeJob.next, fuel: document.getElementById('in-fuel').value, money: document.getElementById('in-money').value, techMoney: document.getElementById('in-tech').value, comment: document.getElementById('in-comment').value, seeds: document.getElementById('in-seeds').value };
    await fetch(`${API}/api/finish-stage`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p) });
    closeModals(); refresh();
}
async function setStatus(fieldId, newStage) { await fetch(`${API}/api/field-status`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({fieldId, newStage}) }); refresh(); }
async function acceptWeight() { const w = document.getElementById('netto').value; await fetch(`${API}/api/accept-weight`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({weight:w}) }); refresh(); }
async function sendTruck() { const p = { model: document.getElementById('t-model').value, plate: document.getElementById('t-plate').value, workerId: user.id }; await fetch(`${API}/api/send-truck`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p) }); closeModals(); refresh(); }
function handleLogs(logs) { if(logs.length > lastLogsCount) { const last = logs[logs.length-1]; if(!last.target || last.target === user.id) showNotif(last.text); lastLogsCount = logs.length; } }
function showNotif(txt) { const c = document.getElementById('notif-container'); const d = document.createElement('div'); d.className = "bg-slate-900 text-white p-4 rounded-2xl shadow-2xl notif-anim font-black text-[10px] uppercase text-center border-l-4 border-emerald-500 pointer-events-auto"; d.innerText = txt; c.appendChild(d); setTimeout(() => d.remove(), 5000); }
function tab(id, btn) { document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab')); btn.classList.add('active-tab'); }
function closeModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); }
function openTruckModal() { document.getElementById('truck-modal').classList.remove('hidden'); }
function openFinish(id, stage, next) { activeJob = { id, stage, next }; document.getElementById('finish-title').innerText = stage; document.getElementById('seed-box').classList.toggle('hidden', stage !== 'Посев'); document.getElementById('finish-modal').classList.remove('hidden'); }

if(user) startApp();
