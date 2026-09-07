const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const teamRoutes = require('./routes/teamRoutes');
const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');
const productRoutes = require('./routes/productRoutes');

// Connect to MongoDB (non-blocking — server still runs, using an
// in-memory fallback store, if the database is unreachable)
connectDB();

const app = express();

// Middleware
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, ''))
  : ['https://randominnovators.vercel.app', 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const cleanOrigin = origin.replace(/\/$/, '');
    const isVercelPreview = cleanOrigin.endsWith('.vercel.app');
    
    if (allowedOrigins.includes(cleanOrigin) || isVercelPreview) {
      callback(null, cleanOrigin); // Reflect the origin back
    } else {
      callback(null, false); // Return false instead of Error to avoid 500 response
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));
app.use(express.json());

// API Routes
app.use('/api/team', teamRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/products', productRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EduPulse API Backend Server is running'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = app;
