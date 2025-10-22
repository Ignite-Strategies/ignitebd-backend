import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import authRoute from './routes/authRoute.js';
import adminUserAuthRoute from './routes/adminUserAuthRoute.js';
import profileSetupRoute from './routes/profileSetupRoute.js';
import companySetupRoute from './routes/companySetupRoute.js';
import metricsRoute from './routes/metricsRoute.js';
import bdRoute from './routes/bdRoute.js';
import bdPipelineRoute from './routes/bdPipelineRoute.js';
import assessmentRoute from './routes/assessmentRoute.js';
import assessmentSubmissionRoute from './routes/assessmentSubmissionRoute.js';
import assessmentResultsRoute from './routes/assessmentResultsRoute.js';
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
app.use('/auth', authRoute);
app.use('/adminUserAuth', adminUserAuthRoute);
app.use('/profileSetup', profileSetupRoute);
app.use('/companySetup', companySetupRoute);
app.use('/metrics', metricsRoute);
app.use('/bd', bdRoute);
app.use('/bdPipeline', bdPipelineRoute);
app.use('/assessment', assessmentRoute);
app.use('/assessmentSubmission', assessmentSubmissionRoute);
app.use('/assessmentResults', assessmentResultsRoute);

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

// Ensure database is ready before starting server
async function startServer() {
  try {
    // Generate Prisma client
    console.log('🔄 Generating Prisma client...');
    const { execSync } = await import('child_process');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Push schema to database
    console.log('🔄 Pushing database schema...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    console.log('✅ Database ready');
    
    app.listen(PORT, () => {
      console.log(`🔥 Ignite Activation API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to setup database:', error);
    process.exit(1);
  }
}

startServer();
