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
    "https://vigor-data-hub.vercel.app",
    "https://vigor-data-hub-bay.vercel.app",
    "https://vigordatahub.onrender.com",
    "http://localhost:5000"
];

app.use(cors({
    origin: allowedOrigins,
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
}));

// ✅ Serve Static Files
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

// ✅ **Signup Route (Now Sends Verification Code)**
app.post('/signup', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;
        if (!email || !password || !fullName) return res.status(400).json({ message: 'All fields are required' });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const authCode = crypto.randomInt(100000, 999999).toString();
        const expiry = moment().add(15, 'minutes').toDate();

        const newUser = new User({ email, password: hashedPassword, fullName, authCode, authCodeExpiry: expiry });
        await newUser.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Verification Code',
            text: `Your verification code is: ${authCode}. It expires in 15 minutes.`,
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) return res.status(500).json({ message: 'Error sending verification code' });
            res.status(201).json({ message: 'Account created successfully! Check your email for the verification code.' });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ✅ **Login Route (Now Redirects Correctly)**
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and Password are required' });

        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login successful', token, redirectUrl: "dashboard.html" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ✅ 404 Handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
