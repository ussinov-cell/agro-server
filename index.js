const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let systemState = {
    fuel: 1000,
    users: [
        { id: 'Boss', pass: '12345', role: 'owner', name: 'Владелец' },
        { id: 'M1', pass: '5555', role: 'worker', name: 'Алексей' }
    ],
    fields: [
        { id: 1, name: "Участок №1", address: "Север", area: 12, assignedTo: "M1", stage: "Ожидание" }
    ],
    workers: {
        'M1': { name: 'Алексей', bonus: 0, fuelSpent: 0, totalBrought: 0 }
    },
    // Сюда будут записываться все выполненные работы
    reports: [] 
};

// Получение состояния
app.get('/api/state', (req, res) => res.json(systemState));

// Завершение этапа на участке
app.post('/api/finish-stage', (req, res) => {
    const { fieldId, stageName, fuel, money, comment, seeds, nextStage } = req.body;
    const field = systemState.fields.find(f => f.id == fieldId);
    
    if (field) {
        const area = parseFloat(field.area);
        const fuelVal = parseFloat(fuel) || 0;
        const moneyVal = parseFloat(money) || 0;
        
        const reportEntry = {
            date: new Date().toLocaleString('ru-RU'),
            fieldName: field.name,
            workerName: systemState.workers[field.assignedTo]?.name || field.assignedTo,
            stage: stageName,
            fuel: fuelVal,
            money: moneyVal,
            comment: comment,
            seeds: seeds || 0,
            costPerHa: area > 0 ? (moneyVal / area).toFixed(2) : 0
        };

        // Сохраняем в отчеты
        systemState.reports.push(reportEntry);
        
        // Списываем ресурсы
        systemState.fuel -= fuelVal;
        if(systemState.workers[field.assignedTo]) {
            systemState.workers[field.assignedTo].fuelSpent += fuelVal;
        }

        // Переводим на следующий этап
        field.stage = nextStage;
        
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Поле не найдено" });
    }
});

// Остальные эндпоинты (регистрация, весовая и т.д.) — оставляем из прошлого кода
app.post('/api/register', (req, res) => {
    const { id, pass, name, phone } = req.body;
    if (!systemState.users.find(u => u.id === id)) {
        systemState.users.push({ id, pass, name, phone, role: 'worker' });
        systemState.workers[id] = { name, bonus: 0, fuelSpent: 0, totalBrought: 0 };
        res.json({ success: true });
    } else res.status(400).send("ID занят");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
