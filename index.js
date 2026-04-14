const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Глобальное состояние системы
let systemState = {
    fuel: 1000,
    totalWeight: 0,
    truckInWay: null,
    lastAccepted: null,
    
    // Список сотрудников (база пользователей)
    users: [
        { id: 'Boss', pass: '12345', role: 'owner', name: 'Владелец', phone: '-' },
        { id: 'M1', pass: '5555', role: 'worker', name: 'Алексей', phone: '87071234567' }
    ],

    // Список участков с привязкой к сотрудникам
    fields: [
        { 
            id: 1, 
            name: "Участок №1 (Свекла)", 
            address: "Северный выезд, заправка", 
            area: "12", 
            assignedTo: "M1", // Кто отвечает
            stage: "Ожидание", // Ожидание -> Принято -> Пахота -> Завершено
            lastUpdate: Date.now() 
        }
    ],

    // Статистика работ и премий
    workers: {
        'M1': { name: 'Алексей', bonus: 0, fuelSpent: 0, totalBrought: 0, moneySpent: 0 }
    }
};

// 1. Получение общего состояния
app.get('/api/state', (req, res) => res.json(systemState));

// 2. Регистрация нового сотрудника
app.post('/api/register', (req, res) => {
    const { id, pass, name, phone, role } = req.body;
    
    // Проверка, существует ли уже такой ID
    if (systemState.users.find(u => u.id === id)) {
        return res.status(400).json({ error: "ID уже занят" });
    }

    const newUser = { id, pass, name, phone, role: role || 'worker' };
    systemState.users.push(newUser);

    // Создаем карточку статистики для нового рабочего
    if (newUser.role === 'worker') {
        systemState.workers[id] = { name, bonus: 0, fuelSpent: 0, totalBrought: 0, moneySpent: 0 };
    }

    console.log(`Зарегистрирован новый пользователь: ${name}`);
    res.json({ success: true });
});

// 3. Назначение участка сотруднику (выполняет Boss)
app.post('/api/assign-field', (req, res) => {
    const { fieldId, workerId, name, address, area } = req.body;
    
    // Если участка нет — создаем, если есть — обновляем
    let field = systemState.fields.find(f => f.id == fieldId);
    
    if (field) {
        field.assignedTo = workerId;
        field.name = name || field.name;
        field.address = address || field.address;
        field.area = area || field.area;
        field.stage = "Ожидание"; // Сбрасываем стадию при переназначении
    } else {
        systemState.fields.push({
            id: fieldId || Date.now(),
            name, address, area, assignedTo: workerId, stage: "Ожидание"
        });
    }
    res.json({ success: true });
});

// 4. Обновление статуса участка (выполняет Админ/Рабочий)
app.post('/api/field-status', (req, res) => {
    const { fieldId, newStage } = req.body;
    const field = systemState.fields.find(f => f.id == fieldId);
    
    if (field) {
        field.stage = newStage;
        field.lastUpdate = Date.now();
        console.log(`Статус участка ${field.name} изменен на: ${newStage}`);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Участок не найден" });
    }
});

// 5. Стандартные функции (ГСМ, Весовая, Машины)
app.post('/api/stock-up', (req, res) => {
    const { amount } = req.body;
    if (amount) systemState.fuel += parseFloat(amount);
    res.json({ success: true });
});

app.post('/api/spend-resources', (req, res) => {
    const { fuel, workerId } = req.body;
    if (systemState.workers[workerId]) {
        const f = parseFloat(fuel);
        systemState.fuel -= f;
        systemState.workers[workerId].fuelSpent += f;
    }
    res.json({ success: true });
});

app.post('/api/send-truck', (req, res) => {
    const { model, plate, workerId } = req.body;
    systemState.truckInWay = { model, plate, workerId, time: Date.now() };
    res.json({ success: true });
});

app.post('/api/accept-weight', (req, res) => {
    const { weight } = req.body;
    const w = parseFloat(weight);
    const workerId = systemState.truckInWay ? systemState.truckInWay.workerId : 'M1';
    
    if (systemState.workers[workerId]) {
        systemState.workers[workerId].totalBrought += w;
        systemState.workers[workerId].bonus += (w * 0.5);
    }
    systemState.lastAccepted = { workerId, weight: w, time: Date.now() };
    systemState.truckInWay = null;
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`-----------------------------------`);
    console.log(`АГРО-СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${PORT}`);
    console.log(`-----------------------------------`);
});
