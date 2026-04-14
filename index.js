// Добавь эти изменения в index.js
// 1. Обновляем структуру состояния
const initDB = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS trucks_in_transit (id SERIAL PRIMARY KEY, model TEXT, plate TEXT, worker_id TEXT, status TEXT DEFAULT 'в пути');
        CREATE TABLE IF NOT EXISTS warehouse (id SERIAL PRIMARY KEY, item_type TEXT, quantity DECIMAL, unit TEXT);
    `;
    await pool.query(query);
};

// 2. Эндпоинт "Отправить машину"
app.post('/api/send-truck', async (req, res) => {
    const { model, plate, workerId } = req.body;
    await pool.query('INSERT INTO trucks_in_transit (model, plate, worker_id) VALUES ($1, $2, $3)', [model, plate, workerId]);
    res.json({ success: true });
});

// 3. Эндпоинт "Приход на склад"
app.post('/api/warehouse-add', async (req, res) => {
    const { type, amount } = req.body;
    // Логика добавления в таблицу warehouse или обновления system_state
    await pool.query('UPDATE system_state SET fuel = fuel + $1 WHERE id = 1', [amount]); // Для ГСМ
    res.json({ success: true });
});
