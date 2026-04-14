const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors()); // Позволяет интерфейсу общаться с сервером
app.use(express.json());

// Имитация базы данных (в будущем подключим PostgreSQL)
let state = {
    fuel: 5000,
    totalWeight: 0,
    truckInWay: false,
    activeCycle: null,
    workers: {
        "M1": { name: "Админ 1", bonus: 0, lastTask: "" },
        "M2": { name: "Админ 2", bonus: 0, lastTask: "" },
        "M3": { name: "Админ 3", bonus: 0, lastTask: "" }
    }
};

// Получить текущее состояние системы
app.get('/api/state', (req, res) => res.json(state));

// Запуск техкарты (Владелец)
app.post('/api/start-cycle', (req, res) => {
    const { field, culture, date } = req.body;
    state.activeCycle = { field, culture, startDate: date, day: 1 };
    res.json({ message: "Техкарта запущена", state });
});

// Отчет сотрудника (Завершение задачи)
app.post('/api/finish-task', (req, res) => {
    const { workerId, fuelSpent, miscCost, coords } = req.body;
    
    if (state.fuel < fuelSpent) return res.status(400).json({ error: "Недостаточно ГСМ на складе" });

    state.fuel -= fuelSpent;
    state.truckInWay = true;
    state.workers[workerId].lastTask = "Работа на " + state.activeCycle.field + " завершена";
    
    res.json({ message: "Данные приняты, машина отправлена", state });
});

// Приемка на весовой (Владелец)
app.post('/api/accept-weight', (req, res) => {
    const { weight, workerId } = req.body;
    const K = 1.1; // Коэффициент сложности (можно сделать динамическим)
    
    state.totalWeight += parseFloat(weight);
    state.workers[workerId].bonus += (weight * K * 0.5); // Формула премии
    state.truckInWay = false;
    
    res.json({ message: "Вес учтен, KPI обновлен", state });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
