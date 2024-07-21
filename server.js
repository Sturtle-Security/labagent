require('dotenv').config();
const express = require('express');
var cors = require('cors');
const morgan = require('morgan');
const k8sController = require('./controller');

const PORT = 3000;

// App
const app = express();
app.disable('x-powered-by')
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    optionsSuccessStatus: 200
}))
app.use(morgan("tiny"));

// Middleware
app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
    const token = req.headers['x-token'] || '';
    if (token !== process.env.TOKEN) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
})

// Routes
app.get('/', (req, res) => {
    res.status(200).json({ message: "👋 Hello World" });
})


app.get('/lab/running/:labName', async (req, res) => {
    const labName = req.params.labName;
    const result = await k8sController.isRunning(labName);
    res.status(200).json({
        running: result
    });
})

app.post('/lab/create', async (req, res) => {
    const payload = req.body;
    const result = await k8sController.createLab(payload);
    res.status(200).json({
        result
    });
})

app.delete('/lab/delete/:labName', async (req, res) => {
    const labName = req.params.labName;
    await k8sController.deleteLab(labName);
    res.status(200).json({});
})

app.get('*', (req, res) => {
    res.status(404).json({ error: "Not Found" });
})

// Global error handler
app.use((err, req, res, next) => {
    res.status(500).json({ error: "Unexpected Error" });
})

app.listen(PORT, () => console.log(`🚀 @ http://localhost:${PORT}`));

