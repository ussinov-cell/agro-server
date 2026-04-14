const express = require('express');
const app = express();
app.use(express.json());

// Имитация базы данных (в реальном проекте здесь будет подключение к PostgreSQL)
let db = {
    fuel: 5000,
    totalWeight: 0,
    fields: [
        { id: 1, name: "Поле №1", culture: "Сахарная свекла", area: 12, K: 1.1, startDate: "2026-04-10" }
    ],
    tasks: [],
    users: [
        { id: 1, name: "Алексей", role: "M1", bonus: 0 }
    ]
};

// 1. ЗАПУСК ЦИКЛА (Только для Тебя)
app.post('/api/start-cycle', (req, res) => {
    const { fieldId, date } = req.body;
    // Логика: Программа автоматически генерирует задачи на основе даты старта
    const field = db.fields.find(f => f.id === fieldId);
    field.startDate = date;
    
    // Пример авто-планирования:
    const tasks = [
        { name: "Пахота", day: 1 },
        { name: "Посев", day: 5 },
        { name: "Первый полив", day: 12 }
    ];
    
    res.json({ message: "Техкарта развернута", schedule: tasks });
});

// 2. ОТЧЕТ СОТРУДНИКА (Списание ресурсов + Гео-контроль)
app.post('/api/finish-task', (req, res) => {
    const { userId, fuelSpent, weight, coords } = req.body;
    
    // Проверка Гео-зоны (упрощенно)
    if (!coords || !coords.lat) {
        return res.status(403).json({ error: "Вы не на участке!" });
    }

    // Списание ГСМ со склада
    db.fuel -= fuelSpent;
    
    // Учет веса и расчет KPI (Бонус = Вес * Коэффициент)
    const user = db.users.find(u => u.id === userId);
    const field = db.fields[0]; // Берем текущее поле
    user.bonus += (weight * field.K);
    
    res.json({ 
        status: "Успешно", 
        remainingFuel: db.fuel,
        yourBonus: user.bonus 
    });
});

// 3. ОТЧЕТ ДЛЯ ВЛАДЕЛЬЦА (Аналитика)
app.get('/api/owner-report', (req, res) => {
    res.json({
        totalFuel: db.fuel,
        totalHarvest: db.totalWeight,
        ranking: db.users.sort((a, b) => b.bonus - a.bonus)
    });
});

app.listen(3000, () => console.log('Сервер Агро-системы запущен на порту 3000'));
