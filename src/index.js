import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import authRoutes from './routes/auth.js';
import metricsRoutes from './routes/metrics.js';
import bdRoutes from './routes/bd.js';
import assessmentRoutes from './routes/assessment.js';
import prisma from './db.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://ignitebd-frontend.vercel.app'], // Allow frontend origin
  credentials: true // Allow cookies to be sent
}));
app.use(express.json());
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'devdevdev'], // Use a strong secret in production
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  httpOnly: true,
  sameSite: 'lax'
}));

// Routes
app.use('/auth', authRoutes);
app.use('/metrics', metricsRoutes);
app.use('/bd', bdRoutes);
app.use('/assessment', assessmentRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Ignite Activation API is running' });
});

// Test database connection
app.get('/db-test', async (req, res) => {
  try {
    await prisma.$connect();
    res.json({ status: 'ok', message: 'Database connected successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed', error: error?.message || 'Unknown error' });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 Ignite Activation API running on port ${PORT}`);
});
