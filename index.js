const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// База данных в памяти
let systemState = {
    fuel: 1000,
    totalWeight: 0,
    truckInWay: null,
    lastAccepted: null,
    fields: [
        { id: 1, name: "Участок №1", culture: "Сахарная свекла", stage: "Уборка", area: "12га" },
        { id: 2, name: "Участок №2", culture: "Кукуруза", stage: "Вегетация", area: "50га" }
    ],
    workers: {
        'M1': { name: 'Алексей (Админ)', bonus: 0, fuelSpent: 0, totalBrought: 0, moneySpent: 0 },
        'M2': { name: 'Иван (Админ)', bonus: 0, fuelSpent: 0, totalBrought: 0, moneySpent: 0 }
    }
};

app.get('/api/state', (req, res) => res.json(systemState));

// Пополнение склада (Boss)
app.post('/api/stock-up', (req, res) => {
    const { amount } = req.body;
    if (amount) systemState.fuel += parseFloat(amount);
    res.json({ success: true });
});

// Списание ресурсов (Админ)
app.post('/api/spend-resources', (req, res) => {
    const { fuel, money, workerId } = req.body;
    const worker = systemState.workers[workerId];
    if (worker) {
        if (fuel) {
            const f = parseFloat(fuel);
            systemState.fuel -= f;
            worker.fuelSpent += f;
        }
        if (money) worker.moneySpent += parseFloat(money);
    }
    res.json({ success: true });
});

// Отправка машины (Админ)
app.post('/api/send-truck', (req, res) => {
    const { model, plate, workerId } = req.body;
    systemState.truckInWay = { model, plate, workerId, time: Date.now() };
    res.json({ success: true });
});

// Приемка веса (Boss)
app.post('/api/accept-weight', (req, res) => {
    const { weight } = req.body;
    const w = parseFloat(weight);
    if (!isNaN(w)) {
        systemState.totalWeight += w;
        const workerId = systemState.truckInWay ? systemState.truckInWay.workerId : 'M1';
        if (systemState.workers[workerId]) {
            systemState.workers[workerId].totalBrought += w;
            systemState.workers[workerId].bonus += (w * 0.5);
        }
        systemState.lastAccepted = { workerId, weight: w, time: Date.now() };
        systemState.truckInWay = null;
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
