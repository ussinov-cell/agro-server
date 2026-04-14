const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// База данных в памяти сервера
let systemState = {
    fuel: 1000,
    truckInWay: null,
    users: [
        { id: 'Boss', pass: '12345', role: 'owner', name: 'Владелец' },
        { id: 'M1', pass: '5555', role: 'worker', name: 'Алексей (Админ)' }
    ],
    fields: [
        { id: 1, name: "Участок №1", address: "Северный край", area: 12, assignedTo: "M1", stage: "Ожидание" }
    ],
    workers: {
        'M1': { name: 'Алексей (Админ)', bonus: 0, fuelSpent: 0, totalBrought: 0 }
    },
    // Глобальный архив всех выполненных работ
    reports: [] 
};

// 1. ПОЛУЧЕНИЕ ДАННЫХ
app.get('/api/state', (req, res) => res.json(systemState));

// 2. РЕГИСТРАЦИЯ
app.post('/api/register', (req, res) => {
    const { id, pass, name, phone } = req.body;
    if (systemState.users.find(u => u.id === id)) return res.status(400).send("ID занят");
    
    systemState.users.push({ id, pass, name, phone, role: 'worker' });
    systemState.workers[id] = { name, bonus: 0, fuelSpent: 0, totalBrought: 0 };
    res.json({ success: true });
});

// 3. УПРАВЛЕНИЕ УЧАСТКАМИ (BOSS)
app.post('/api/assign-field', (req, res) => {
    const { fieldId, workerId, name, address, area } = req.body;
    const existing = systemState.fields.find(f => f.id == fieldId);
    if (existing) {
        Object.assign(existing, { assignedTo: workerId, name, address, area, stage: "Ожидание" });
    } else {
        systemState.fields.push({ id: fieldId || Date.now(), name, address, area, assignedTo: workerId, stage: "Ожидание" });
    }
    res.json({ success: true });
});

// 4. ПРИНЯТИЕ ЭТАПА (WORKER)
app.post('/api/field-status', (req, res) => {
    const { fieldId, newStage } = req.body;
    const field = systemState.fields.find(f => f.id == fieldId);
    if (field) { field.stage = newStage; res.json({ success: true }); }
});

// 5. ЗАВЕРШЕНИЕ ЭТАПА С ОТЧЕТОМ (ГСМ, ТЕНГЕ, ГА)
app.post('/api/finish-stage', (req, res) => {
    const { fieldId, stageName, fuel, money, comment, seeds, nextStage } = req.body;
    const field = systemState.fields.find(f => f.id == fieldId);
    
    if (field) {
        const area = parseFloat(field.area) || 1;
        const fVal = parseFloat(fuel) || 0;
        const mVal = parseFloat(money) || 0;

        const entry = {
            id: Date.now(),
            date: new Date().toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }),
            field: field.name,
            worker: systemState.workers[field.assignedTo]?.name || field.assignedTo,
            work: stageName,
            fuel: fVal,
            cost: mVal,
            comment: comment || "-",
            seeds: seeds || 0,
            perHa: (mVal / area).toFixed(0)
        };

        systemState.reports.unshift(entry); // Добавляем в начало списка
        systemState.fuel -= fVal;
        if(systemState.workers[field.assignedTo]) systemState.workers[field.assignedTo].fuelSpent += fVal;
        
        field.stage = nextStage;
        res.json({ success: true });
    }
});

// 6. ВЕСОВАЯ И СКЛАД
app.post('/api/stock-up', (req, res) => {
    systemState.fuel += parseFloat(req.body.amount || 0);
    res.json({ success: true });
});

app.post('/api/send-truck', (req, res) => {
    systemState.truckInWay = { ...req.body, time: Date.now() };
    res.json({ success: true });
});

app.post('/api/accept-weight', (req, res) => {
    const w = parseFloat(req.body.weight);
    const workerId = systemState.truckInWay?.workerId || 'M1';
    if (systemState.workers[workerId]) {
        systemState.workers[workerId].totalBrought += w;
        systemState.workers[workerId].bonus += Math.floor(w * 0.5);
    }
    systemState.truckInWay = null;
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Agro Server Active on Port ${PORT}`));
