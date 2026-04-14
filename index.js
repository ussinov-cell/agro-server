const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Глобальное состояние системы (База данных в оперативной памяти)
let systemState = {
    fuel: 1000,           // Общий запас ГСМ на складе
    totalWeight: 0,       // Общий принятый вес зерна
    truckInWay: null,     // Данные о машине, которая едет на весы
    
    // Список пользователей (Владелец по умолчанию)
    users: [
        { id: 'Boss', pass: '12345', role: 'owner', name: 'Владелец', phone: '87000000000' }
    ],

    // Список всех участков
    fields: [],

    // Статистика по админам (рабочим)
    workers: {},

    // Архив всех выполненных работ (Отчеты)
    reports: [],

    // Логи для системы уведомлений (кто что сделал и когда)
    logs: []
};

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

// Добавление записи в лог уведомлений
function addLog(text, target = null) {
    systemState.logs.push({
        id: Date.now(),
        text: text,
        target: target, // Если null — видят все, если ID — видит конкретный юзер
        time: new Date().toLocaleTimeString('ru-RU')
    });
    // Храним только последние 50 уведомлений
    if (systemState.logs.length > 50) systemState.logs.shift();
}

// --- ЭНДПОИНТЫ (API) ---

// 1. Получение полного состояния системы
app.get('/api/state', (req, res) => {
    res.json(systemState);
});

// 2. Регистрация нового пользователя (с ролью и телефоном)
app.post('/api/register', (req, res) => {
    const { id, pass, name, role, phone } = req.body;

    if (systemState.users.find(u => u.id === id)) {
        return res.status(400).json({ error: "Этот ID уже занят" });
    }

    const newUser = { id, pass, name, role, phone };
    systemState.users.push(newUser);

    // Если зарегистрировался админ (worker), создаем ему профиль статистики
    if (role === 'worker') {
        systemState.workers[id] = { 
            name, 
            phone, 
            bonus: 0, 
            fuelSpent: 0, 
            totalBrought: 0 
        };
    }

    addLog(`Зарегистрирован ${role === 'owner' ? 'Владелец' : 'Админ'}: ${name}`);
    res.json({ success: true });
});

// 3. Создание / Назначение участка (Владелец)
app.post('/api/assign-field', (req, res) => {
    const { name, area, workerId } = req.body;
    
    const newField = {
        id: Date.now(),
        name,
        area: parseFloat(area) || 0,
        assignedTo: workerId,
        stage: "Ожидание"
    };

    systemState.fields.push(newField);
    addLog(`Назначено новое поле "${name}" админу ${workerId}`, workerId);
    res.json({ success: true });
});

// 4. Изменение статуса (Начало работы)
app.post('/api/field-status', (req, res) => {
    const { fieldId, newStage } = req.body;
    const field = systemState.fields.find(f => f.id == fieldId);
    
    if (field) {
        field.stage = newStage;
        addLog(`Поле "${field.name}": статус изменен на "${newStage}"`);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Поле не найдено" });
    }
});

// 5. Завершение этапа с подачей подробного отчета (ГСМ, Техника, Деньги)
app.post('/api/finish-stage', (req, res) => {
    const { fieldId, stageName, fuel, money, techMoney, comment, seeds, nextStage } = req.body;
    const field = systemState.fields.find(f => f.id == fieldId);
    
    if (field) {
        const area = parseFloat(field.area) || 1;
        const fVal = parseFloat(fuel) || 0;
        const mOther = parseFloat(money) || 0;
        const mTech = parseFloat(techMoney) || 0;
        const totalExp = mOther + mTech;

        // Создаем запись в архиве отчетов
        const reportEntry = {
            id: Date.now(),
            date: new Date().toLocaleString('ru-RU'),
            field: field.name,
            worker: systemState.workers[field.assignedTo]?.name || field.assignedTo,
            work: stageName,
            fuel: fVal,
            techCost: mTech,
            otherCost: mOther,
            totalCost: totalExp,
            perHa: (totalExp / area).toFixed(0), // Стоимость 1 Га
            seeds: seeds || 0,
            comment: comment || "-"
        };

        systemState.reports.unshift(reportEntry);
        
        // Списание ресурсов и обновление статистики
        systemState.fuel -= fVal;
        if (systemState.workers[field.assignedTo]) {
            systemState.workers[field.assignedTo].fuelSpent += fVal;
        }

        // Переход на следующий этап
        field.stage = nextStage;
        
        addLog(`Завершен этап "${stageName}" на поле "${field.name}"`);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Поле не найдено" });
    }
});

// 6. Пополнение ГСМ (Владелец)
app.post('/api/stock-up', (req, res) => {
    const amount = parseFloat(req.body.amount) || 0;
    systemState.fuel += amount;
    addLog(`Склад ГСМ пополнен на ${amount} л`);
    res.json({ success: true });
});

// 7. Весовая: Отправка машины (Админ)
app.post('/api/send-truck', (req, res) => {
    const { model, plate, workerId } = req.body;
    systemState.truckInWay = { 
        model, 
        plate, 
        workerId, 
        time: Date.now() 
    };
    addLog(`Машина ${plate} отправлена на весы`, 'Boss');
    res.json({ success: true });
});

// 8. Весовая: Приемка веса (Владелец)
app.post('/api/accept-weight', (req, res) => {
    const weight = parseFloat(req.body.weight) || 0;
    const truck = systemState.truckInWay;
    
    if (truck && systemState.workers[truck.workerId]) {
        systemState.workers[truck.workerId].totalBrought += weight;
        // Начисление премии: например, 0.5 тенге за 1 кг
        systemState.workers[truck.workerId].bonus += Math.floor(weight * 0.5);
    }

    systemState.totalWeight += weight;
    systemState.truckInWay = null;
    
    addLog(`Принято ${weight} кг зерна. Машина разгружена.`);
    res.json({ success: true });
});

// --- ЗАПУСК СЕРВЕРА ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`---------------------------------------`);
    console.log(`AGRO-SYSTEM SERVER v6.0 ЗАПУЩЕН`);
    console.log(`Порт: ${PORT}`);
    console.log(`---------------------------------------`);
});
