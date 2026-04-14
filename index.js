const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

let systemState = {
    fuel: 1000,
    totalWeight: 0,
    truckInWay: null,
    lastAcceptedTruck: null, // Для уведомления админу
    fields: [
        { id: 1, name: "Участок 1", culture: "Свекла", stage: "Уборка", area: "12га" }
    ],
    workers: {
        'M1': { name: 'Алексей', bonus: 0, fuelSpent: 0, totalBrought: 0 },
        'M2': { name: 'Иван', bonus: 0, fuelSpent: 0, totalBrought: 0 }
    }
};

app.get('/api/state', (req, res) => res.json(systemState));

app.post('/api/send-truck', (req, res) => {
    const { model, plate, workerId } = req.body;
    systemState.truckInWay = { model, plate, workerId, type: 'scales' };
    res.json({ success: true });
});

app.post('/api/accept-weight', (req, res) => {
    const { weight } = req.body;
    const w = parseFloat(weight);
    systemState.totalWeight += w;
    const workerId = systemState.truckInWay?.workerId || 'M1';
    
    if (systemState.workers[workerId]) {
        systemState.workers[workerId].totalBrought += w;
        systemState.workers[workerId].bonus += (w * 0.5);
    }

    // Сохраняем результат для уведомления админу
    systemState.lastAcceptedTruck = { workerId, weight: w, time: Date.now() };
    systemState.truckInWay = null;
    res.json({ success: true });
});

app.post('/api/spend-resources', (req, res) => {
    const { fuel, workerId } = req.body;
    if (fuel) {
        systemState.fuel -= parseFloat(fuel);
        if(systemState.workers[workerId]) systemState.workers[workerId].fuelSpent += parseFloat(fuel);
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Agro-Server Live`));
