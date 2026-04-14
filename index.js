const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Глобальное состояние системы (в реальном проекте лучше использовать БД, но для теста храним в памяти)
let systemState = {
    fuel: 1000,         // Общий запас ГСМ на складе
    totalWeight: 0,    // Весь собранный урожай
    truckInWay: null,  // Текущая машина в пути {model, plate, workerId}
    activeCycle: { culture: "Сахарная свекла (BTS 980)" }, // Текущая задача
    
    // Детальная статистика по сотрудникам
    workers: {
        'M1': { 
            name: 'Алексей (Админ)', 
            bonus: 0, 
            fuelSpent: 0, 
            totalBrought: 0, 
            moneySpent: 0 
        },
        'M2': { 
            name: 'Иван (Админ)', 
            bonus: 0, 
            fuelSpent: 0, 
            totalBrought: 0, 
            moneySpent: 0 
        }
    }
};

// 1. Получение состояния (Фронтенд запрашивает это каждые 4 секунды)
app.get('/api/state', (req, res) => {
    res.json(systemState);
});

// 2. Пополнение склада (Кнопка "Добавить на баланс" у Boss)
app.post('/api/stock-up', (req, res) => {
    const { amount } = req.body;
    if (amount) {
        systemState.fuel += parseFloat(amount);
    }
    res.json({ success: true, fuel: systemState.fuel });
});

// 3. Списание расходов (Кнопка "Сохранить расходы" у Админа)
app.post('/api/spend-resources', (req, res) => {
    const { fuel, money, workerId } = req.body;
    const worker = systemState.workers[workerId || 'M1'];

    if (fuel) {
        const f = parseFloat(fuel);
        systemState.fuel -= f; // Вычитаем из общего склада
        worker.fuelSpent += f; // Добавляем в личный отчет админа
    }
    if (money) {
        worker.moneySpent += parseFloat(money); // Записываем траты на еду/запчасти
    }
    res.json({ success: true });
});

// 4. Отправка машины (Кнопка "Отправить машину" у Админа)
app.post('/api/send-truck', (req, res) => {
    const { model, plate, workerId } = req.body;
    systemState.truckInWay = { model, plate, workerId };
    res.json({ success: true });
});

// 5. Приемка веса (Кнопка "Принять вес" у Boss в Весовой)
app.post('/api/accept-weight', (req, res) => {
    const { weight, workerId } = req.body;
    const w = parseFloat(weight);
    
    systemState.totalWeight += w; // В общий котел
    
    // Находим сотрудника, который отправил эту машину
    const targetWorkerId = workerId || (systemState.truckInWay ? systemState.truckInWay.workerId : 'M1');
    const worker = systemState.workers[targetWorkerId];

    if (worker) {
        worker.totalBrought += w;        // В личный отчет по урожаю
        worker.bonus += (w * 0.5);       // Начисляем премию (0.5 тг за кг)
    }

    systemState.truckInWay = null; // Очищаем путь (машина приехала)
    res.json({ success: true });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Agro-Server started on port ${PORT}`);
});
