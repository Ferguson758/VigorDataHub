// ✅ Load Environment Variables
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());

// ✅ Define Allowed Origins
const allowedOrigins = [
    "https://vigor-data-hub.vercel.app",
    "https://vigor-data-hub-bay.vercel.app",
    "https://vigordatahub.onrender.com",
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

// ✅ **MongoDB Connection**
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://fergusonemmanuel758:tP0NyuP7HVrAZC5e@vigordatacluster.5rvhu.mongodb.net/VigorDataHub?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ Define User Model
const User = mongoose.model("User", new mongoose.Schema({
    email: String,
    password: String
}));

// ✅ Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));
console.log("✅ Static files are being served from:", path.join(__dirname, 'public'));

// ✅ Serve Homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ **Login Route**
app.post('/login', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
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

// ✅ **Dashboard Route**
app.get('/dashboard', (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ message: `Welcome, ${decoded.email}!` });
    } catch (error) {
        res.status(403).json({ message: "Invalid token" });
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
