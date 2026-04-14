const express = require('express'); // Подключаем движок сервера
const cors = require('cors'); // Разрешаем браузеру делать запросы к серверу
const app = express(); // Создаем экземпляр приложения

app.use(cors()); // Активируем разрешение на перекрестные запросы
app.use(express.json()); // Учим сервер понимать формат JSON (данные от кнопок)

// ГЛАВНАЯ БАЗА ДАННЫХ ПРИЛОЖЕНИЯ (в оперативной памяти)
let systemState = {
    users: [], // Список всех: ты и твои админы (хранит логины, пароли, роли)
    fields: [], // Список твоих 12га свеклы, кукурузы и т.д. (статусы, площади)
    reports: [], // История всех затрат: кто, сколько ГСМ сжег и на какую сумму
    logs: [], // Лента уведомлений (кто приехал на весы, кто закончил пахоту)
    truckInWay: null, // Сюда попадает машина, когда админ нажал «На весы»
    fuel: 0, // Общий остаток солярки на базе
    // ТВОЙ НОВЫЙ РАСШИРЕННЫЙ СКЛАД
    stock: {
        seeds: { corn: 0, soy: 0, beet: 0 }, // Склад семян по культурам
        fertilizers: { ammos: 0, diammos: 0, nitram: 0, selitra: 0, carbamid: 0 }, // Виды удобрений
        glyphosate: 0 // Глифосад (Ураган) для хим. прополки
    },
    workers: {} // Личная статистика админов: их накопленные премии и расходы
};

// РЕГИСТРАЦИЯ: Создание нового профиля
app.post('/api/register', (req, res) => {
    systemState.users.push(req.body); // Берем данные из формы и кладем в список юзеров
    res.json({ success: true }); // Отвечаем браузеру, что всё прошло успешно
});

// СОСТОЯНИЕ: Отдает все данные в браузер каждые 5 секунд
app.get('/api/state', (req, res) => {
    res.json(systemState); // Просто выгружаем всё содержимое базы для отрисовки
});

// СОЗДАНИЕ УЧАСТКА (Только для тебя)
app.post('/api/assign-field', (req, res) => {
    const { name, area, workerId, ownerId } = req.body; // Получаем данные нового поля
    const user = systemState.users.find(u => u.id === ownerId); // Ищем, кто делает запрос
    
    if (!user || user.role !== 'owner') { // Если это не Boss — запрещаем
        return res.status(403).json({ error: "Доступ запрещен! Только владелец." });
    }

    const newField = { 
        id: Date.now(), // Уникальный номер участка по времени создания
        name, // Название (например, "Свекла 12га")
        area: parseFloat(area), // Площадь для расчетов затрат на 1 га
        assignedTo: workerId, // ID админа, который будет за это отвечать
        stage: "Ожидание" // Начальный статус любого поля
    };
    systemState.fields.push(newField); // Добавляем в список полей
    res.json({ success: true }); // Подтверждаем создание
});

// ИЗМЕНЕНИЕ СТАТУСА: Когда админ нажал «Начать работу»
app.post('/api/field-status', (req, res) => {
    const { fieldId, newStage } = req.body; // Получаем ID поля и новый статус
    const field = systemState.fields.find(f => f.id === fieldId); // Ищем это поле в базе
    if (field) {
        field.stage = newStage; // Меняем, например, с "Ожидание" на "Пахота"
        systemState.logs.push({ text: `Поле ${field.name}: статус ${newStage}` }); // Пишем в ленту событий
    }
    res.json({ success: true }); // Отвечаем "Ок"
});

// ЗАВЕРШЕНИЕ ЭТАПА: Списание ресурсов и расчет денег
app.post('/api/finish-stage', (req, res) => {
    const { fieldId, stageName, fuel, money, techMoney, comment, seeds } = req.body; // Данные из модалки админа
    const field = systemState.fields.find(f => f.id === fieldId); // Находим участок
    
    if (field) {
        const cost = parseFloat(money) + parseFloat(techMoney); // Считаем общие затраты за этап
        const perHa = (cost / field.area).toFixed(0); // Считаем себестоимость на 1 гектар
        
        systemState.reports.push({ // Сохраняем подробный отчет для тебя
            field: field.name, // Название поля
            worker: field.assignedTo, // Кто работал
            work: stageName, // Что делали (напр. "Боронование")
            totalCost: cost, // Сколько всего денег ушло
            techCost: techMoney, // Сколько из них на ремонт/запчасти
            perHa: perHa, // Нагрузка на 1 гектар
            comment: comment // Заметки админа (напр. "Сломался лемех")
        });

        systemState.fuel -= parseFloat(fuel || 0); // Вычитаем солярку из общего бака
        if (!systemState.workers[field.assignedTo]) systemState.workers[field.assignedTo] = { bonus: 0 }; // Если админ новый — создаем ему кошелек
        systemState.workers[field.assignedTo].bonus += 5000; // Начисляем премию за закрытый этап (напр. 5000)
        
        field.stage = req.body.nextStage; // Переводим поле на следующий этап (напр. к Посеву)
    }
    res.json({ success: true }); // Готово
});

// ПОПОЛНЕНИЕ СКЛАДА (Твоя панель управления)
app.post('/api/stock-up', (req, res) => {
    const { category, item, amount } = req.body; // Что привезли и сколько
    const val = parseFloat(amount) || 0; // Превращаем текст в число

    if (category === 'fuel') systemState.fuel += val; // Если солярка — льем в бак
    else if (category === 'glyphosate') systemState.stock.glyphosate += val; // Если яд — на склад химии
    else if (category === 'seeds') systemState.stock.seeds[item] += val; // Если семена — в нужный мешок
    else if (category === 'fertilizers') systemState.stock.fertilizers[item] += val; // Удобрения — по видам
    
    res.json({ success: true }); // Подтверждаем приход
});

// ВЕСОВАЯ: Отправка машины с поля
app.post('/api/send-truck', (req, res) => {
    systemState.truckInWay = req.body; // Записываем госномер и марку машины в статус "В пути"
    systemState.logs.push({ text: `🚚 Машина ${req.body.plate} едет на весы!`, target: 'owner' }); // Шлем тебе уведомление
    res.json({ success: true }); // Ок
});

// ВЕСОВАЯ: Твое подтверждение веса
app.post('/api/accept-weight', (req, res) => {
    const weight = req.body.weight; // Вес, который ты ввел в весовую форму
    systemState.logs.push({ text: `✅ Принято: ${weight} кг от ${systemState.truckInWay.plate}` }); // Пишем в историю
    systemState.truckInWay = null; // Освобождаем весы для следующей машины
    res.json({ success: true }); // Ок
});

// ЗАПУСК: Сервер начинает слушать запросы
const PORT = process.env.PORT || 3000; // Берем порт из настроек хостинга или 3000
app.listen(PORT, () => console.log(`Система АГРО запущена на порту ${PORT}`)); // Сообщение в консоль при старте
