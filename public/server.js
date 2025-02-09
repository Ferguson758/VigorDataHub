// Load Environment Variables
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

// ✅ **CORS Configuration** (Allow Frontend Requests)
const allowedOrigins = [
    "https://vigor-data-hub.vercel.app",  // ✅ Replace with your actual frontend URL
    "http://localhost:5000"  // ✅ Allow local development (Remove this when deploying)
];

app.use(cors({
    origin: allowedOrigins,
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
}));

// ✅ Serve Static Files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Ensure Required Environment Variables Exist
if (!process.env.MONGO_URI || !process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.JWT_SECRET) {
    console.error("❌ Missing required environment variables. Check your .env file.");
    process.exit(1);
}

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1);
    });

// ✅ User Schema
const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    authCode: { type: String },
    authCodeExpiry: { type: Date },
});

const User = mongoose.model('User', UserSchema);

// ✅ Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ✅ **Fix for Render: Serve `index.html`**
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Route: Signup
app.post('/signup', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;
        if (!email || !password || !fullName) return res.status(400).json({ message: 'All fields are required' });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword, fullName });
        await newUser.save();

        res.status(201).json({ message: 'Account created successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ✅ Route: Login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and Password are required' });

        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ✅ 404 Handler (For Invalid Routes)
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

