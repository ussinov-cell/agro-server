// Замени весь код в index.js на этот
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Состояние системы (в памяти + база)
let systemState = {
    fuel: 1000,
    totalWeight: 0,
    truckInWay: null, // Здесь будет объект {model, plate, workerId}
    activeCycle: null,
    workers: {
        'M1': { name: 'Алексей', bonus: 0 },
        'M2': { name: 'Иван', bonus: 0 }
    }
};

// Эндпоинт получения данных
app.get('/api/state', (req, res) => res.json(systemState));

// 1. Отправка машины (для администратора)
app.post('/api/send-truck', (req, res) => {
    const { model, plate, workerId } = req.body;
    systemState.truckInWay = { model, plate, workerId, time: new Date() };
    res.json({ success: true });
});

// 2. Внесение веса (для тебя в Весовой)
app.post('/api/accept-weight', (req, res) => {
    const { weight, workerId } = req.body;
    systemState.totalWeight += parseFloat(weight);
    if (systemState.workers[workerId]) {
        systemState.workers[workerId].bonus += (weight * 0.5); // 0.5 тенге за кг
    }
    systemState.truckInWay = null; // Машина приехала, убираем из пути
    res.json({ success: true });
});

// 3. Списание ГСМ/Расходов (отдельно)
app.post('/api/spend-resources', (req, res) => {
    const { fuel, money } = req.body;
    if (fuel) systemState.fuel -= parseFloat(fuel);
    res.json({ success: true });
});

// 4. Пополнение склада (для тебя)
app.post('/api/stock-up', (req, res) => {
    const { amount } = req.body;
    systemState.fuel += parseFloat(amount);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
