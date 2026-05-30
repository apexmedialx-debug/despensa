require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');
const webPush = require('./utils/webPush');
const { migrate } = require('./db');

const authRoutes = require('./routes/auth.routes');
const householdRoutes = require('./routes/household.routes');
const itemsRoutes = require('./routes/items.routes');
const requestsRoutes = require('./routes/requests.routes');
const spendingRoutes = require('./routes/spending.routes');

const app = express();

webPush.init();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/household', householdRoutes);
app.use('/api/v1/items', itemsRoutes);
app.use('/api/v1/requests', requestsRoutes);
app.use('/api/v1/spending', spendingRoutes);

app.get('/api/v1/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

// Run migrations on startup
migrate().catch(e => { console.error('[db] Migration error:', e); process.exit(1); });

module.exports = app;
