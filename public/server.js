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
app.use(cors());

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

// ✅ Serve the Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Route: List All Available Routes
app.get('/routes', (req, res) => {
    const routes = app._router.stack
        .filter(r => r.route)
        .map(r => r.route.path);
    res.json({ available_routes: routes });
});

// ✅ Route: Send Authentication Code
app.post('/send-auth-code', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const authCode = crypto.randomInt(100000, 999999).toString();
        const expiry = moment().add(15, 'minutes').toDate();

        await User.findOneAndUpdate({ email }, { authCode, authCodeExpiry: expiry }, { upsert: true });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Authentication Code',
            text: `Your authentication code is: ${authCode}. It expires in 15 minutes.`,
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) return res.status(500).json({ message: 'Error sending email' });

            res.status(200).json({ message: 'Auth code sent' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ✅ Route: Verify Authentication Code
app.post('/verify-auth-code', async (req, res) => {
    try {
        const { email, authCode } = req.body;
        if (!email || !authCode) return res.status(400).json({ message: 'Email and Auth Code are required' });

        const user = await User.findOne({ email });

        if (!user || user.authCode !== authCode || new Date() > user.authCodeExpiry) {
            return res.status(400).json({ message: 'Invalid or expired code' });
        }

        res.status(200).json({ message: 'Code verified, proceed to set password' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
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

// ✅ Protected Route: Dashboard
app.get('/dashboard', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ message: `Welcome, ${decoded.email}! This is a protected dashboard.` });
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
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
