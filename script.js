const API = 'https://agro-server-nuwi.onrender.com'; // ЗАМЕНИ НА СВОЙ RENDER
let user = JSON.parse(localStorage.getItem('agro_u'));
let lastLogsCount = 0;
let activeJob = null;

// Переключение между Входом и Регистрацией
function toggleAuth(isLogin) {
    document.getElementById('login-form').classList.toggle('hidden', !isLogin);
    document.getElementById('reg-form').classList.toggle('hidden', isLogin);
}

// Регистрация
async function register() {
    const payload = {
        name: document.getElementById('r-name').value,
        phone: document.getElementById('r-phone').value,
        role: document.getElementById('r-role').value,
        id: document.getElementById('r-id').value,
        pass: document.getElementById('r-pass').value
    };
    if(!payload.id || !payload.pass || !payload.name) return alert("Заполни все поля!");

    try {
        const res = await fetch(`${API}/api/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if(res.ok) {
            alert("Успех! Теперь войдите.");
            toggleAuth(true);
        } else {
            const err = await res.json();
            alert(err.error);
        }
    } catch(e) { alert("Сервер недоступен"); }
}

// Вход в систему
async function login() {
    const id = document.getElementById('l-id').value;
    const pass = document.getElementById('l-pass').value;
    if(!id || !pass) return alert("Введите данные");

    try {
        const res = await fetch(`${API}/api/state`);
        const data = await res.json();
        const found = data.users.find(u => u.id === id && u.pass === pass);
        
        if(found) {
            user = found;
            localStorage.setItem('agro_u', JSON.stringify(found));
            startApp();
        } else alert("Неверный логин или пароль!");
    } catch(e) { alert("Ошибка подключения"); }
}

function logout() { localStorage.removeItem('agro_u'); location.reload(); }

// Запуск интерфейса после логина
function startApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('u-name').innerText = user.name;
    document.getElementById('u-role').innerText = user.role === 'owner' ? 'Владелец' : 'Админ';
    
    if(user.role === 'owner') document.getElementById('nav-owner').classList.remove('hidden');
    else document.getElementById('nav-worker').classList.remove('hidden');
    
    refresh();
    setInterval(refresh, 5000); // Автообновление каждые 5 сек
}

async function refresh() {
    try {
        const res = await fetch(`${API}/api/state`);
        const data = await res.json();
        if(user.role === 'owner') renderBoss(data); else renderWorker(data);
        handleLogs(data.logs);
    } catch(e) { console.log("Сбой сети"); }
}

// Рендер для Владельца
function renderBoss(data) {
    document.getElementById('boss-list').innerHTML = data.fields.map(f => `
        <div class="bg-white p-6 rounded-[2.5rem] shadow-sm border-l-[12px] ${f.stage==='Завершено'?'border-emerald-500':'border-orange-400'}">
            <h3 class="font-black text-xl">${f.name}</h3>
            <p class="text-[10px] font-bold text-emerald-600 uppercase">Админ: ${f.assignedTo} | ${f.area} Га</p>
            <span class="text-[9px] font-black uppercase text-slate-300">${f.stage}</span>
        </div>
    `).join('');

    document.getElementById('reports-body').innerHTML = data.reports.map(r => `
        <tr class="border-b">
            <td class="p-3"><b>${r.work}</b><br><span class="text-slate-400">${r.field}</span></td>
            <td class="p-3 text-blue-600 font-bold">${r.techCost} ₸</td>
            <td class="p-3">${r.totalCost} ₸</td>
            <td class="p-3 font-black text-emerald-600 text-right">${r.perHa} ₸</td>
        </tr>
    `).join('');

    const sc = document.getElementById('scales-ui');
    if (data.truckInWay) {
        sc.innerHTML = `
            <p class="text-[10px] font-black text-emerald-600 uppercase mb-2">Машина на весах</p>
            <h2 class="text-2xl font-black mb-4">${data.truckInWay.plate}</h2>
            <input id="netto" type="number" placeholder="ЧИСТЫЙ ВЕС" class="input-field text-center text-2xl mb-4">
            <button onclick="acceptWeight()" class="btn-primary">Принять</button>
        `;
    } else sc.innerHTML = `<p class="text-slate-300 font-black uppercase text-[10px]">Машин нет</p>`;

    document.getElementById('fuel-val').innerText = data.fuel + ' л';
}

// Рендер для Админа
function renderWorker(data) {
    const my = data.fields.filter(f => f.assignedTo === user.id);
    document.getElementById('w-jobs').innerHTML = my.map(f => `
        <div class="bg-white p-8 rounded-[3rem] shadow-sm border-l-[16px] border-orange-400">
            <h3 class="font-black text-2xl mb-4">${f.name}</h3>
            ${getBtn(f)}
        </div>
    `).join('');

    const stat = data.workers[user.id] || {bonus:0, fuelSpent:0, totalBrought:0};
    document.getElementById('worker-stats-card').innerHTML = `
        <div class="space-y-3">
            <div class="flex justify-between font-black uppercase text-xs"><span>Премия:</span><span class="text-emerald-600">${stat.bonus} ₸</span></div>
            <div class="flex justify-between font-black uppercase text-xs"><span>Расход ГСМ:</span><span class="text-red-400">${stat.fuelSpent} л</span></div>
            <div class="flex justify-between font-black uppercase text-xs"><span>Вес сдано:</span><span class="text-blue-500">${stat.totalBrought} кг</span></div>
        </div>
    `;
}

function getBtn(f) {
    if(f.stage === 'Ожидание') return `<button onclick="setStatus(${f.id}, 'Пахота')" class="btn-primary">Начать пахоту</button>`;
    if(f.stage === 'Пахота') return `<button onclick="openFinish(${f.id}, 'Пахота', 'Боронование')" class="btn-dark">Завершить пахоту</button>`;
    if(f.stage === 'Боронование') return `<button onclick="openFinish(${f.id}, 'Боронование', 'Посев')" class="btn-dark">Завершить бороны</button>`;
    if(f.stage === 'Посев') return `<button onclick="openFinish(${f.id}, 'Посев', 'Завершено')" class="btn-primary">Завершить посев</button>`;
    return `<div class="text-emerald-600 font-black text-center uppercase text-[10px]">Готово</div>`;
}

// Логика модалок и отправок
function openFinish(id, stage, next) {
    activeJob = { id, stage, next };
    document.getElementById('finish-title').innerText = stage;
    document.getElementById('seed-box').classList.toggle('hidden', stage !== 'Посев');
    document.getElementById('finish-modal').classList.remove('hidden');
}

async function submitFinish() {
    const p = { 
        fieldId: activeJob.id, stageName: activeJob.stage, nextStage: activeJob.next,
        fuel: document.getElementById('in-fuel').value,
        money: document.getElementById('in-money').value,
        techMoney: document.getElementById('in-tech').value,
        comment: document.getElementById('in-comment').value,
        seeds: document.getElementById('in-seeds').value
    };
    await fetch(`${API}/api/finish-stage`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p) });
    closeModals(); refresh();
}

async function setStatus(fieldId, newStage) {
    await fetch(`${API}/api/field-status`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({fieldId, newStage}) });
    refresh();
}

async function acceptWeight() {
    const w = document.getElementById('netto').value;
    await fetch(`${API}/api/accept-weight`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({weight:w}) });
    refresh();
}

async function addFuel() {
    const a = document.getElementById('f-add').value;
    await fetch(`${API}/api/stock-up`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({amount:a}) });
    document.getElementById('f-add').value = ''; refresh();
}

async function sendTruck() {
    const p = { model: document.getElementById('t-model').value, plate: document.getElementById('t-plate').value, workerId: user.id };
    await fetch(`${API}/api/send-truck`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p) });
    closeModals(); refresh();
}

async function openFieldModal() {
    document.getElementById('field-modal').classList.remove('hidden');
    const res = await fetch(`${API}/api/state`);
    const data = await res.json();
    document.getElementById('fn-worker').innerHTML = data.users.filter(u => u.role === 'worker').map(w => `<option value="${w.id}">${w.name}</option>`).join('');
}

async function saveField() {
    const p = { name: document.getElementById('fn-name').value, area: document.getElementById('fn-area').value, workerId: document.getElementById('fn-worker').value };
    await fetch(`${API}/api/assign-field`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p) });
    closeModals(); refresh();
}

function handleLogs(logs) {
    if(logs.length > lastLogsCount) {
        const last = logs[logs.length - 1];
        if(!last.target || last.target === user.id) showNotif(last.text);
        lastLogsCount = logs.length;
    }
}

function showNotif(txt) {
    const container = document.getElementById('notif-container');
    const d = document.createElement('div');
    d.className = "bg-slate-900 text-white p-4 rounded-2xl shadow-2xl notif-anim font-black text-[10px] uppercase text-center border-l-4 border-emerald-500 pointer-events-auto";
    d.innerText = txt;
    container.appendChild(d);
    setTimeout(() => d.remove(), 5000);
}

function tab(id, btn) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    btn.classList.add('active-tab');
}

function closeModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); }
function openTruckModal() { document.getElementById('truck-modal').classList.remove('hidden'); }

// Авто-вход
if(user) startApp();