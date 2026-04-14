const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Подключение к твоей базе PostgreSQL
const pool = new Pool({
    connectionString: "postgresql://agro_db_6wkt_user:LivwzaxIUI16z9Cu5CKe51FfOGkYs3ro@dpg-d7f788rbc2fs73bedof0-a/agro_db_6wkt",
    ssl: { rejectUnauthorized: false } // Нужно для работы с Render
});

// Инициализация базы данных (создаем таблицы, если их нет)
const initDB = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS system_state (id SERIAL PRIMARY KEY, fuel DECIMAL, total_weight DECIMAL, truck_in_way BOOLEAN);
        CREATE TABLE IF NOT EXISTS workers (id VARCHAR(10) PRIMARY KEY, name TEXT, bonus DECIMAL);
        CREATE TABLE IF NOT EXISTS tasks (id SERIAL PRIMARY KEY, title TEXT, is_active BOOLEAN);
        
        -- Вставляем начальные данные, если таблица пуста
        INSERT INTO system_state (id, fuel, total_weight, truck_in_way) SELECT 1, 5000, 0, false WHERE NOT EXISTS (SELECT 1 FROM system_state WHERE id = 1);
        INSERT INTO workers (id, name, bonus) VALUES ('M1', 'Админ 1', 0), ('M2', 'Админ 2', 0), ('M3', 'Админ 3', 0) ON CONFLICT DO NOTHING;
    `;
    await pool.query(query);
};
initDB();

// ЭНДПОИНТЫ API

// 1. Получить общее состояние
app.get('/api/state', async (req, res) => {
    try {
        const stateRes = await pool.query('SELECT * FROM system_state WHERE id = 1');
        const workersRes = await pool.query('SELECT * FROM workers ORDER BY id');
        const taskRes = await pool.query('SELECT * FROM tasks WHERE is_active = true LIMIT 1');
        
        const state = stateRes.rows[0];
        const workers = {};
        workersRes.rows.forEach(w => { workers[w.id] = { name: w.name, bonus: parseFloat(w.bonus) }; });

        res.json({
            fuel: parseFloat(state.fuel),
            totalWeight: parseFloat(state.total_weight),
            truckInWay: state.truck_in_way,
            activeCycle: taskRes.rows[0] ? { culture: taskRes.rows[0].title } : null,
            workers
        });
    } catch (err) { res.status(500).send(err.message); }
});

// 2. Запуск техкарты
app.post('/api/start-cycle', async (req, res) => {
    const { culture } = req.body;
    await pool.query('UPDATE tasks SET is_active = false'); // Деактивируем старые
    await pool.query('INSERT INTO tasks (title, is_active) VALUES ($1, true)', [culture]);
    res.json({ success: true });
});

// 3. Отчет сотрудника
app.post('/api/finish-task', async (req, res) => {
    const { fuelSpent } = req.body;
    await pool.query('UPDATE system_state SET fuel = fuel - $1, truck_in_way = true WHERE id = 1', [fuelSpent]);
    res.json({ success: true });
});

// 4. Приемка весовой
app.post('/api/accept-weight', async (req, res) => {
    const { weight, workerId } = req.body;
    const K = 1.1; // Твой коэффициент сложности
    const bonus = weight * K * 0.5;

    await pool.query('UPDATE system_state SET total_weight = total_weight + $1, truck_in_way = false WHERE id = 1', [weight]);
    await pool.query('UPDATE workers SET bonus = bonus + $1 WHERE id = $2', [bonus, workerId]);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер с БД запущен на порту ${PORT}`));
