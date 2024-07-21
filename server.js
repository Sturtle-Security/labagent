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
    try {
        const labName = req.params.labName;
        const result = await k8sController.isRunning(labName);
        res.status(200).json({
            running: result
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({
            running: false
        });
    }
})

app.post('/lab/create', async (req, res) => {
    const payload = req.body;
    try {
        await k8sController.createLab(payload);
        res.status(200).json({
            created: true
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            created: false,
            error: error.message
        });
    }
})

app.delete('/lab/delete/:labName', async (req, res) => {
    try {
        const labName = req.params.labName;
        await k8sController.deleteLab(labName);
        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(500).json({});
    }
})

app.get('*', (req, res) => {
    res.status(404).json({ error: "Not Found" });
})

app.listen(PORT, () => console.log(`🚀 @ http://localhost:${PORT}`));

