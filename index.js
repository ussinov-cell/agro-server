const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Состояние системы в оперативной памяти
let systemState = {
    fuel: 1000,
    totalWeight: 0,
    truckInWay: null,
    activeCycle: { culture: "Сахарная свекла (BTS 980)" },
    workers: {
        'M1': { name: 'Алексей (Админ)', bonus: 0, fuelSpent: 0, totalBrought: 0, moneySpent: 0 },
        'M2': { name: 'Иван (Админ)', bonus: 0, fuelSpent: 0, totalBrought: 0, moneySpent: 0 }
    }
};

// Получение данных
app.get('/api/state', (req, res) => res.json(systemState));

// Пополнение склада (Boss)
app.post('/api/stock-up', (req, res) => {
    const { amount } = req.body;
    if (amount) systemState.fuel += parseFloat(amount);
    res.json({ success: true });
});

// Списание ГСМ и Трат (Админ)
app.post('/api/spend-resources', (req, res) => {
    const { fuel, money, workerId } = req.body;
    const worker = systemState.workers[workerId] || systemState.workers['M1'];
    if (fuel) {
        systemState.fuel -= parseFloat(fuel);
        worker.fuelSpent += parseFloat(fuel);
    }
    if (money) worker.moneySpent += parseFloat(money);
    res.json({ success: true });
});

// Отправка машины (Админ)
app.post('/api/send-truck', (req, res) => {
    const { model, plate, workerId } = req.body;
    systemState.truckInWay = { model, plate, workerId };
    res.json({ success: true });
});

// Прием веса (Boss)
app.post('/api/accept-weight', (req, res) => {
    const { weight, workerId } = req.body;
    const w = parseFloat(weight);
    systemState.totalWeight += w;
    const targetId = systemState.truckInWay ? systemState.truckInWay.workerId : workerId;
    if (systemState.workers[targetId]) {
        systemState.workers[targetId].totalBrought += w;
        systemState.workers[targetId].bonus += (w * 0.5); 
    }
    systemState.truckInWay = null;
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
