// ✅ Load Environment Variables
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const moment = require('moment');
const cors = require('cors');

const app = express();
app.use(express.json());

const allowedOrigins = [
    "https://vigor-data-hub.vercel.app",
    "https://vigor-data-hub-bay.vercel.app",
    "https://vigordatahub.onrender.com",
    "https://vigor-data-hub-alv2-pouh2767z-vigor-data-hub.vercel.app",
    "http://localhost:5000"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
}));

app.use(cors({
    origin: allowedOrigins,
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
}));

// ✅ **MongoDB Connection**
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://fergusonemmanuel758:tP0NyuP7HVrAZC5e@vigordatacluster.5rvhu.mongodb.net/VigorDataHub?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ **Ensure Static Files Are Served Correctly**
app.use(express.static(path.join(__dirname, 'public')));
console.log("✅ Static files are being served from:", path.join(__dirname, 'public'));

// ✅ Serve Homepage (Fix for Missing UI)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ **Login Route**
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and Password are required' });

        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login successful', token, redirectUrl: "/dashboard.html" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ✅ **Fix 404 Errors**
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// ✅ **Start Server**
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
