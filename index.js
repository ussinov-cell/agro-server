const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let systemState = {
    fuel: 1000,
    users: [
        { id: 'Boss', pass: '12345', role: 'owner', name: 'Владелец' }
    ],
    fields: [],
    workers: {},
    reports: [],
    // История уведомлений для синхронизации
    logs: [] 
};

app.get('/api/state', (req, res) => res.json(systemState));

// РЕГИСТРАЦИЯ
app.post('/api/register', (req, res) => {
    const { id, pass, name, role } = req.body;
    if (systemState.users.find(u => u.id === id)) return res.status(400).json({error: "ID занят"});
    
    const newUser = { id, pass, name, role: role || 'worker' };
    systemState.users.push(newUser);
    if (newUser.role === 'worker') {
        systemState.workers[id] = { name, bonus: 0, fuelSpent: 0, totalBrought: 0 };
    }
    systemState.logs.push({ text: `Новый пользователь: ${name}`, time: Date.now() });
    res.json({ success: true });
});

// ЗАВЕРШЕНИЕ ЭТАПА С РАСХОДАМИ НА ТЕХНИКУ
app.post('/api/finish-stage', (req, res) => {
    const { fieldId, stageName, fuel, money, techMoney, comment, seeds, nextStage } = req.body;
    const field = systemState.fields.find(f => f.id == fieldId);
    
    if (field) {
        const area = parseFloat(field.area) || 1;
        const totalExp = (parseFloat(money) || 0) + (parseFloat(techMoney) || 0);

        const entry = {
            date: new Date().toLocaleString('ru-RU'),
            field: field.name,
            work: stageName,
            fuel: fuel || 0,
            techCost: techMoney || 0,
            otherCost: money || 0,
            totalCost: totalExp,
            perHa: (totalExp / area).toFixed(0),
            seeds: seeds || 0,
            comment: comment || "-"
        };

        systemState.reports.unshift(entry);
        systemState.fuel -= (parseFloat(fuel) || 0);
        field.stage = nextStage;
        
        systemState.logs.push({ 
            text: `Поле ${field.name}: этап ${stageName} завершен`, 
            time: Date.now() 
        });
        
        res.json({ success: true });
    }
});

app.post('/api/assign-field', (req, res) => {
    const { fieldId, workerId, name, address, area } = req.body;
    systemState.fields.push({ id: fieldId || Date.now(), name, address, area, assignedTo: workerId, stage: "Ожидание" });
    systemState.logs.push({ text: `Назначено новое поле: ${name}`, target: workerId, time: Date.now() });
    res.json({ success: true });
});

// Остальные эндпоинты (весовая и т.д.) остаются прежними
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
