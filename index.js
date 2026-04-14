const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Основная база данных (в памяти сервера)
let systemState = {
    fuel: 1000,           // Общий остаток ГСМ на складе
    totalWeight: 0,       // Общий принятый вес за всё время
    truckInWay: null,     // Данные о машине, которая сейчас едет на весовую
    lastAccepted: null,   // Данные о последнем подтвержденном взвешивании
    
    // Список всех пользователей системы
    users: [
        { id: 'Boss', pass: '12345', role: 'owner', name: 'Владелец', phone: '-' },
        { id: 'M1', pass: '5555', role: 'worker', name: 'Алексей (Админ)', phone: '87071112233' }
    ],

    // Список участков и их текущее состояние
    fields: [
        { 
            id: 1, 
            name: "Стартовый участок", 
            address: "Центральный сектор", 
            area: "10", 
            assignedTo: "M1", 
            stage: "Ожидание" 
        }
    ],

    // Статистика по каждому сотруднику (бонусы, расходы, приходы)
    workers: {
        'M1': { name: 'Алексей (Админ)', bonus: 0, fuelSpent: 0, totalBrought: 0, moneySpent: 0 }
    }
};

// --- ОСНОВНЫЕ ЗАПРОСЫ ---

// 1. Получение актуального состояния системы
app.get('/api/state', (req, res) => {
    res.json(systemState);
});

// 2. Получение списка только рабочих (для выбора в выпадающем списке у Boss)
app.get('/api/workers', (req, res) => {
    const workerList = systemState.users
        .filter(u => u.role === 'worker')
        .map(u => ({ id: u.id, name: u.name }));
    res.json(workerList);
});

// --- УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ---

// 3. Регистрация нового сотрудника
app.post('/api/register', (req, res) => {
    const { id, pass, name, phone, role } = req.body;
    
    if (systemState.users.find(u => u.id === id)) {
        return res.status(400).json({ error: "Этот ID уже занят" });
    }

    const newUser = { id, pass, name, phone, role: role || 'worker' };
    systemState.users.push(newUser);

    if (newUser.role === 'worker') {
        systemState.workers[id] = { name, bonus: 0, fuelSpent: 0, totalBrought: 0, moneySpent: 0 };
    }

    res.json({ success: true });
});

// --- УПРАВЛЕНИЕ УЧАСТКАМИ ---

// 4. Создание или обновление участка (назначение ответственного)
app.post('/api/assign-field', (req, res) => {
    const { fieldId, workerId, name, address, area } = req.body;
    
    let field = systemState.fields.find(f => f.id == fieldId);
    
    if (field) {
        field.assignedTo = workerId;
        field.name = name;
        field.address = address;
        field.area = area;
        field.stage = "Ожидание"; 
    } else {
        systemState.fields.push({
            id: fieldId || Date.now(),
            name, address, area, assignedTo: workerId, stage: "Ожидание"
        });
    }
    res.json({ success: true });
});

// 5. Обновление статуса работ на участке (Админ нажимает кнопки)
app.post('/api/field-status', (req, res) => {
    const { fieldId, newStage } = req.body;
    const field = systemState.fields.find(f => f.id == fieldId);
    
    if (field) {
        field.stage = newStage;
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Участок не найден" });
    }
});

// 6. Удаление участка
app.post('/api/delete-field', (req, res) => {
    const { fieldId } = req.body;
    systemState.fields = systemState.fields.filter(f => f.id != fieldId);
    res.json({ success: true });
});

// --- ГСМ И СКЛАД ---

// 7. Пополнение склада ГСМ (Boss)
app.post('/api/stock-up', (req, res) => {
    const { amount } = req.body;
    if (amount) systemState.fuel += parseFloat(amount);
    res.json({ success: true });
});

// 8. Списание ГСМ сотрудником
app.post('/api/spend-resources', (req, res) => {
    const { fuel, workerId } = req.body;
    if (systemState.workers[workerId]) {
        const f = parseFloat(fuel);
        systemState.fuel -= f;
        systemState.workers[workerId].fuelSpent += f;
    }
    res.json({ success: true });
});

// --- ВЕСОВАЯ И ЛОГИСТИКА ---

// 9. Отправка машины на весовую (Админ)
app.post('/api/send-truck', (req, res) => {
    const { model, plate, workerId } = req.body;
    systemState.truckInWay = { 
        model, 
        plate, 
        workerId, 
        time: Date.now() 
    };
    res.json({ success: true });
});

// 10. Приемка веса и начисление премии (Boss)
app.post('/api/accept-weight', (req, res) => {
    const { weight } = req.body;
    const w = parseFloat(weight);
    
    // Определяем, чья машина приехала
    const workerId = systemState.truckInWay ? systemState.truckInWay.workerId : 'M1';
    
    if (systemState.workers[workerId]) {
        systemState.workers[workerId].totalBrought += w;
        // Пример расчета премии: 0.5 тенге за 1 кг
        systemState.workers[workerId].bonus += (w * 0.5);
    }

    systemState.totalWeight += w;
    systemState.lastAccepted = { workerId, weight: w, time: Date.now() };
    systemState.truckInWay = null; // Очищаем путь, машина приехала
    
    res.json({ success: true });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`AGRO-SERVER СИСТЕМА УПРАВЛЕНИЯ ЗАПУЩЕНА`);
    console.log(`ПОРТ: ${PORT}`);
    console.log(`=========================================`);
});
