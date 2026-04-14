// ... (начало кода с подключением к базе остается прежним)

const initDB = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS users (id VARCHAR(20) PRIMARY KEY, name TEXT, password TEXT, role TEXT, bonus DECIMAL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS fields (id SERIAL PRIMARY KEY, name TEXT, worker_id VARCHAR(20), culture TEXT, status TEXT DEFAULT 'План');
        
        -- РЕГИСТРАЦИЯ ТЕБЯ И СОТРУДНИКОВ (Пароли можешь поменять здесь)
        INSERT INTO users (id, name, password, role) VALUES 
        ('Boss', 'Владелец', '12345', 'owner'),
        ('M1', 'Алексей (Тракторист)', '5555', 'worker'),
        ('M2', 'Иван (Полив)', '6666', 'worker') ON CONFLICT DO NOTHING;
    `;
    await pool.query(query);
};
initDB();

// API для добавления участка
app.post('/api/add-field', async (req, res) => {
    const { name, culture, workerId } = req.body;
    await pool.query('INSERT INTO fields (name, culture, worker_id) VALUES ($1, $2, $3)', [name, culture, workerId]);
    res.json({ success: true });
});
