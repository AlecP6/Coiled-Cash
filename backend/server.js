require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes         = require('./routes/auth');
const transactionsRoutes = require('./routes/transactions');
const weaponsRoutes      = require('./routes/weapons');
const membersRoutes      = require('./routes/members');
const groupsRoutes       = require('./routes/groups');
const summariesRoutes    = require('./routes/summaries');
const vehiclesRoutes     = require('./routes/vehicles');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Serve frontend statically from parent folder
app.use(express.static(path.join(__dirname, '..')));

// ── API Routes ──
app.use('/api/auth',         authRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/weapons',      weaponsRoutes);
app.use('/api/members',      membersRoutes);
app.use('/api/groups',       groupsRoutes);
app.use('/api/summaries',    summariesRoutes);
app.use('/api/vehicles',     vehiclesRoutes);

// ── Health check ──
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Fallback: serve index.html for any non-API route ──
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  } else {
    res.status(404).json({ error: 'Route introuvable.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Coiled Cash backend démarré sur http://localhost:${PORT}`);
});
