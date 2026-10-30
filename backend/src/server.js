const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const donorRoutes = require('./routes/donorRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const requestRoutes = require('./routes/requestRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bloodUnitRoutes = require('./routes/bloodUnitRoutes');
const donationCampRoutes = require('./routes/donationCampRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Make io accessible in routes
app.set('io', io);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/blood-units', bloodUnitRoutes);
app.use('/api/camps', donationCampRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_hospital', (hospitalId) => {
    socket.join(`hospital_${hospitalId}`);
    console.log(`Socket joined hospital room: hospital_${hospitalId}`);
  });

  socket.on('join_donor', (donorId) => {
    socket.join(`donor_${donorId}`);
    console.log(`Socket joined donor room: donor_${donorId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bloodplatform')
  .then(() => {
    console.log('MongoDB connected successfully');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
