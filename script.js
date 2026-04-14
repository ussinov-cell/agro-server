const API = 'https://agro-server-nuwi.onrender.com'; // Адрес твоего сервера на Render для связи | СВЯЗЬ
let user = JSON.parse(localStorage.getItem('agro_u')); // Проверка, залогинен ли ты уже в этом браузере | ПАМЯТЬ
let lastLogsCount = 0; // Счетчик уведомлений, чтобы не показывать старые по кругу | СИСТЕМА
let activeJob = null; // Временное хранилище данных о текущей открытой задаче админа | СИСТЕМА

// Переключатель между экраном входа и регистрации
function toggleAuth(isLogin) {
    document.getElementById('login-form').classList.toggle('hidden', !isLogin); // Показать/скрыть форму входа | ИНТЕРФЕЙС
    document.getElementById('reg-form').classList.toggle('hidden', isLogin); // Показать/скрыть форму регистрации | ИНТЕРФЕЙС
}

// Отправка данных нового пользователя на сервер
async function register() {
    const payload = { // Собираем данные из полей ввода в один пакет | ДАННЫЕ
        name: document.getElementById('r-name').value, // Имя админа или твое | РЕГИСТРАЦИЯ
        phone: document.getElementById('r-phone').value, // Контактный номер | РЕГИСТРАЦИЯ
        role: document.getElementById('r-role').value, // Роль: Boss или Админ | ПРАВА
        id: document.getElementById('r-id').value, // Уникальный логин | РЕГИСТРАЦИЯ
        pass: document.getElementById('r-pass').value // Пароль для защиты | РЕГИСТРАЦИЯ
    };
    if(!payload.id || !payload.pass || !payload.name) return alert("Заполни все поля!"); // Проверка на пустоту | ЛОГИКА
    const res = await fetch(`${API}/api/register`, { // Шлем пакет на сервер | СЕТЬ
        method: 'POST', // Метод "Отправить" | СЕТЬ
        headers: {'Content-Type': 'application/json'}, // Указываем, что шлем JSON | СЕТЬ
        body: JSON.stringify(payload) // Превращаем объект в строку для отправки | СЕТЬ
    });
    if(res.ok) { alert("Успех!"); toggleAuth(true); } else alert("Ошибка регистрации"); // Реакция на ответ сервера | ЛОГИКА
}

// Проверка логина и пароля
async function login() {
    const id = document.getElementById('l-id').value; // Берем логин из поля | ВХОД
    const pass = document.getElementById('l-pass').value; // Берем пароль из поля | ВХОД
    const res = await fetch(`${API}/api/state`); // Запрашиваем список всех юзеров с сервера | СЕТЬ
    const data = await res.json(); // Декодируем ответ сервера | ДАННЫЕ
    const found = data.users.find(u => u.id === id && u.pass === pass); // Ищем совпадение в базе | ЛОГИКА
    if(found) { // Если нашли такого юзера: | ЛОГИКА
        user = found; // Запоминаем его данные | СИСТЕМА
        localStorage.setItem('agro_u', JSON.stringify(found)); // Сохраняем в память телефона/ПК, чтобы не входить заново | ПАМЯТЬ
        startApp(); // Запускаем основной интерфейс | ИНТЕРФЕЙС
    } else alert("Ошибка входа!"); // Если не нашли — ругаемся | ЛОГИКА
}

// Выход из аккаунта
function logout() { 
    localStorage.removeItem('agro_u'); // Стираем данные из памяти браузера | ПАМЯТЬ
    location.reload(); // Перезагружаем страницу, чтобы вернуться на вход | ИНТЕРФЕЙС
}

// Настройка интерфейса под роль (Boss или Админ)
function startApp() {
    document.getElementById('auth-screen').classList.add('hidden'); // Прячем экран входа | ИНТЕРФЕЙС
    document.getElementById('app').classList.remove('hidden'); // Показываем само приложение | ИНТЕРФЕЙС
    document.getElementById('u-name').innerText = user.name; // Пишем твое имя в шапке | ДАННЫЕ
    document.getElementById('u-role').innerText = user.role === 'owner' ? 'Boss' : 'Админ'; // Пишем роль | ДАННЫЕ
    
    if(user.role === 'owner') { // Если ты Владелец: | ПРАВА
        document.getElementById('nav-owner').classList.remove('hidden'); // Показываем меню Владельца | ИНТЕРФЕЙС
        document.getElementById('add-field-btn').classList.remove('hidden'); // Даем кнопку добавления полей | ИНТЕРФЕЙС
    } else { // Если ты Админ: | ПРАВА
        document.getElementById('nav-worker').classList.remove('hidden'); // Показываем меню Админа | ИНТЕРФЕЙС
    }
    refresh(); // Загружаем данные в первый раз | ДАННЫЕ
    setInterval(refresh, 5000); // Повторяем загрузку каждые 5 секунд (автообновление) | СИСТЕМА
}

// Главная функция обновления данных
async function refresh() {
    try {
        const res = await fetch(`${API}/api/state`); // Запрашиваем всё состояние системы с сервера | СЕТЬ
        const data = await res.json(); // Декодируем | ДАННЫЕ
        if(user.role === 'owner') renderBoss(data); else renderWorker(data); // Рисуем экран в зависимости от роли | ИНТЕРФЕЙС
        handleLogs(data.logs); // Проверяем, нет ли новых уведомлений | УВЕДОМЛЕНИЯ
    } catch(e) { console.log("Offline"); } // Если сервер упал — просто пишем в консоль | СИСТЕМА
}

// Рисование экрана Владельца
function renderBoss(data) {
    document.getElementById('boss-list').innerHTML = data.fields.map(f => ` 
        <div class="bg-white p-5 rounded-3xl shadow-sm border-l-8 ${f.stage==='Завершено'?'border-emerald-500':'border-orange-400'}">
            <h3 class="font-black text-lg">${f.name}</h3>
            <p class="text-[10px] font-bold text-slate-400">АДМИН: ${f.assignedTo} | ${f.area} Га</p>
            <div class="mt-2 text-[9px] font-black uppercase text-emerald-600">${f.stage}</div>
        </div>
    `).join(''); // Генерируем карточки полей (12га свеклы и т.д.) | ИНТЕРФЕЙС

    document.getElementById('reports-body').innerHTML = data.reports.map(r => `
        <tr class="border-b">
            <td class="p-3"><span class="font-black">${r.field}</span><br>${r.worker}</td>
            <td class="p-3">${r.work}</td>
            <td class="p-3 text-blue-600 font-bold">${r.techCost} ₸</td>
            <td class="p-3 font-black text-emerald-600">${r.perHa} ₸</td>
        </tr>
    `).join(''); // Заполняем твою таблицу отчетов по затратам | ОТЧЕТЫ

    renderStock(data.stock); // Рисуем остатки на складе (ГСМ, семена) | СКЛАД
    
    const sc = document.getElementById('scales-ui'); // Блок весовой | ВЕСЫ
    if (data.truckInWay) { // Если админ отправил машину: | ЛОГИКА
        sc.innerHTML = `<h2 class="text-xl font-black mb-4 uppercase">${data.truckInWay.plate}</h2>
            <input id="netto" type="number" placeholder="ВЕС (КГ)" class="input-field mb-4 text-center">
            <button onclick="acceptWeight()" class="btn-primary">Принять вес</button>`; // Показываем форму ввода веса | ИНТЕРФЕЙС
    } else sc.innerHTML = `<p class="text-slate-300 font-black uppercase text-[10px]">Машин в пути нет</p>`; // Или пишем, что пусто | ИНТЕРФЕЙС
}

// Рисование склада
function renderStock(s) {
    const d = document.getElementById('stock-display'); // Контейнер для цифр склада | СКЛАД
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
    `; // Выводим все твои запасы на экран | ИНТЕРФЕЙС
}

// Управление списком товаров при пополнении склада
function updateStockItems() {
    const cat = document.getElementById('st-cat').value; // Смотрим, какую категорию ты выбрал (Семена или Удобрения) | СКЛАД
    const itemSelect = document.getElementById('st-item'); // Выпадающий список конкретных товаров | ИНТЕРФЕЙС
    const items = {
        seeds: { corn: 'Кукуруза', soy: 'Соя', beet: 'Свекла' }, // Список семян | ДАННЫЕ
        fertilizers: { ammos: 'Аммофос', diammos: 'Диаммофос', nitram: 'Нитраммофоска', selitra: 'Селитра', carbamid: 'Карбамид' } // Список удобрений | ДАННЫЕ
    };
    if (items[cat]) { // Если для категории есть список товаров: | ЛОГИКА
        itemSelect.classList.remove('hidden'); // Показываем список | ИНТЕРФЕЙС
        itemSelect.innerHTML = Object.entries(items[cat]).map(([k,v]) => `<option value="${k}">${v}</option>`).join(''); // Заполняем его | ИНТЕРФЕЙС
    } else { itemSelect.classList.add('hidden'); } // Иначе прячем (например, для ГСМ список не нужен) | ИНТЕРФЕЙС
}

// Отправка данных о приходе товара на склад
async function addStock() {
    const p = { // Пакет данных прихода | ДАННЫЕ
        category: document.getElementById('st-cat').value, // Категория | СКЛАД
        item: document.getElementById('st-item').value, // Конкретный товар | СКЛАД
        amount: document.getElementById('st-amount').value // Сколько привезли | СКЛАД
    };
    await fetch(`${API}/api/stock-up`, { // Шлем на сервер | СЕТЬ
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(p) 
    });
    refresh(); // Сразу обновляем экран, чтобы увидеть новые цифры | ИНТЕРФЕЙС
}

// Рисование экрана Админа
function renderWorker(data) {
    const my = data.fields.filter(f => f.assignedTo === user.id); // Ищем только те поля, что закреплены за этим админом | ЛОГИКА
    document.getElementById('w-jobs').innerHTML = my.map(f => `
        <div class="bg-white p-6 rounded-[2rem] shadow-sm border-l-8 border-orange-400">
            <h3 class="font-black text-xl mb-3">${f.name}</h3>
            ${getBtn(f)}
        </div>
    `).join(''); // Показываем админу только его участки | ИНТЕРФЕЙС
    const stat = data.workers[user.id] || {bonus:0}; // Берем его премию из базы | ДАННЫЕ
    document.getElementById('worker-stats-card').innerHTML = `
        <p class="font-black text-emerald-600 text-2xl">${stat.bonus} ₸</p>
        <p class="text-[10px] uppercase font-bold text-slate-300">Твоя премия</p>`; // Показываем админу его заработок | ИНТЕРФЕЙС
}

// Выбор кнопки для админа в зависимости от того, что сейчас на поле
function getBtn(f) {
    if(f.stage === 'Ожидание') return `<button onclick="setStatus(${f.id}, 'Пахота')" class="btn-primary">Начать пахоту</button>`; // Если еще не начали | ЛОГИКА
    if(['Пахота', 'Боронование', 'Посев'].includes(f.stage)) { // Если работа в процессе: | ЛОГИКА
        let next = f.stage === 'Пахота' ? 'Боронование' : (f.stage === 'Боронование' ? 'Посев' : 'Завершено'); // Решаем, что будет следующим этапом | ЛОГИКА
        return `<button onclick="openFinish(${f.id}, '${f.stage}', '${next}')" class="btn-dark">Завершить ${f.stage}</button>`; // Даем кнопку завершения | ИНТЕРФЕЙС
    }
    return `<div class="text-emerald-500 font-black uppercase text-xs">Участок готов</div>`; // Если всё закончили | ИНТЕРФЕЙС
}

// Сохранение нового участка (Только для Boss)
async function saveField() {
    const p = { // Пакет нового поля | ДАННЫЕ
        name: document.getElementById('fn-name').value, // Название поля | ПОЛЯ
        area: document.getElementById('fn-area').value, // Площадь | ПОЛЯ
        workerId: document.getElementById('fn-worker').value, // Кому поручаем | ПОЛЯ
        ownerId: user.id // Твой ID для проверки прав на сервере | ПРАВА
    };
    const res = await fetch(`${API}/api/assign-field`, { // Шлем на сервер | СЕТЬ
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(p) 
    });
    if(res.ok) { closeModals(); refresh(); } else alert("Ошибка: только Boss может создавать!"); // Если всё ок — закрываем окно | ИНТЕРФЕЙС
}

// Открытие модалки завершения этапа
function openFinish(id, stage, next) {
    activeJob = { id, stage, next }; // Запоминаем, какое поле закрываем | СИСТЕМА
    document.getElementById('finish-title').innerText = stage; // Пишем название этапа в заголовке окна | ИНТЕРФЕЙС
    document.getElementById('seed-box').classList.toggle('hidden', stage !== 'Посев'); // Если сеем — показываем поле для ввода семян | ЛОГИКА
    document.getElementById('finish-modal').classList.remove('hidden'); // Показываем само окно | ИНТЕРФЕЙС
}

// Отправка финального отчета по этапу (списание ресурсов)
async function submitFinish() {
    const p = { // Пакет отчета | ДАННЫЕ
        fieldId: activeJob.id, // Какое поле | ОТЧЕТЫ
        stageName: activeJob.stage, // Какой этап закрыли | ОТЧЕТЫ
        nextStage: activeJob.next, // К какому переходим | ОТЧЕТЫ
        fuel: document.getElementById('in-fuel').value, // Солярка | ОТЧЕТЫ
        money: document.getElementById('in-money').value, // Прочие траты | ОТЧЕТЫ
        techMoney: document.getElementById('in-tech').value, // Траты на технику | ОТЧЕТЫ
        comment: document.getElementById('in-comment').value, // Комментарий админа | ОТЧЕТЫ
        seeds: document.getElementById('in-seeds').value // Семена (если были) | ОТЧЕТЫ
    };
    await fetch(`${API}/api/finish-stage`, { // Шлем на сервер | СЕТЬ
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(p) 
    });
    closeModals(); refresh(); // Закрываем окна и обновляем данные | ИНТЕРФЕЙС
}

// Просто смена статуса (без отчетов)
async function setStatus(fieldId, newStage) { 
    await fetch(`${API}/api/field-status`, { // Шлем смену статуса | СЕТЬ
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({fieldId, newStage}) 
    }); 
    refresh(); // Обновляем экран | ИНТЕРФЕЙС
}

// Прием веса на весовой (от тебя)
async function acceptWeight() {
    const w = document.getElementById('netto').value; // Берем чистый вес из поля | ВЕСЫ
    await fetch(`${API}/api/accept-weight`, { // Шлем подтверждение на сервер | СЕТЬ
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({weight:w}) 
    }); 
    refresh(); // Обновляем экран | ИНТЕРФЕЙС
}

// Отправка машины админом
async function sendTruck() {
    const p = { // Данные машины | ДАННЫЕ
        model: document.getElementById('t-model').value, // Марка | ВЕСЫ
        plate: document.getElementById('t-plate').value, // Номер | ВЕСЫ
        workerId: user.id // Кто отправил | ВЕСЫ
    };
    await fetch(`${API}/api/send-truck`, { // Шлем на сервер | СЕТЬ
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(p) 
    });
    closeModals(); refresh(); // Закрываем окно | ИНТЕРФЕЙС
}

// Обработка всплывающих уведомлений
function handleLogs(logs) {
    if(logs.length > lastLogsCount) { // Если в базе появились новые записи: | ЛОГИКА
        const last = logs[logs.length-1]; // Берем самую свежую | ДАННЫЕ
        if(!last.target || last.target === user.id) showNotif(last.text); // Показываем её тебе, если она общая или лично тебе | УВЕДОМЛЕНИЯ
        lastLogsCount = logs.length; // Обновляем счетчик, чтобы не показывать это еще раз | СИСТЕМА
    }
}

// Создание черного окошка уведомления вверху
function showNotif(txt) {
    const c = document.getElementById('notif-container'); // Находим контейнер уведомлений | ИНТЕРФЕЙС
    const d = document.createElement('div'); // Создаем новый элемент-плашку | ИНТЕРФЕЙС
    d.className = "bg-slate-900 text-white p-4 rounded-2xl shadow-2xl notif-anim font-black text-[10px] uppercase text-center border-l-4 border-emerald-500 pointer-events-auto"; // Стили плашки | СТИЛИ
    d.innerText = txt; // Пишем текст события | ДАННЫЕ
    c.appendChild(d); // Добавляем на экран | ИНТЕРФЕЙС
    setTimeout(() => d.remove(), 5000); // Через 5 секунд удаляем уведомление | СИСТЕМА
}

// Переключение вкладок меню
function tab(id, btn) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden')); // Прячем все вкладки | ИНТЕРФЕЙС
    document.getElementById(id).classList.remove('hidden'); // Показываем выбранную | ИНТЕРФЕЙС
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab')); // Снимаем подсветку со всех кнопок | ИНТЕРФЕЙС
    btn.classList.add('active-tab'); // Подсвечиваем нажатую кнопку | ИНТЕРФЕЙС
}

// Закрытие всех модальных окон
function closeModals() { 
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); // Прячем все темные фоны с окнами | ИНТЕРФЕЙС
}

// Открытие модалки весовой для админа
function openTruckModal() { 
    document.getElementById('truck-modal').classList.remove('hidden'); // Показываем окно ввода данных машины | ИНТЕРФЕЙС
}

// Открытие модалки создания поля (подгружаем список админов)
async function openFieldModal() {
    document.getElementById('field-modal').classList.remove('hidden'); // Открываем окно | ИНТЕРФЕЙС
    const res = await fetch(`${API}/api/state`); // Запрашиваем актуальный список людей | СЕТЬ
    const data = await res.json(); // Декодируем | ДАННЫЕ
    document.getElementById('fn-worker').innerHTML = data.users.filter(u => u.role === 'worker').map(w => `<option value="${w.id}">${w.name}</option>`).join(''); // Наполняем список выбора админами | ИНТЕРФЕЙС
}

// АВТО-ВХОД: Если юзер уже заходил раньше, сразу пускаем его внутрь
if(user) startApp(); // Запуск приложения при открытии страницы | ЛОГИКА
