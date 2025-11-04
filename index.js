import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import prisma from './db.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// New organized routes (following architecture pattern)
import userCreateRoute from './routes/Owner/userCreateRoute.js';
import userHydrateRoute from './routes/Owner/userHydrateRoute.js';
import companyRoute from './routes/Company/companyRoute.js';

// Legacy routes (to be refactored into organized structure)
import adminUserAuthRoute from './routes/adminUserAuthRoute.js';
import profileSetupRoute from './routes/profileSetupRoute.js';
import companySetupRoute from './routes/companySetupRoute.js'; // Legacy - will be replaced by Company/companyRoute.js
import metricsRoute from './routes/metricsRoute.js';
import bdRoute from './routes/bdRoute.js';
import bdPipelineRoute from './routes/bdPipelineRoute.js';
import assessmentRoute from './routes/assessmentRoute.js';
import assessmentSubmissionRoute from './routes/assessmentSubmissionRoute.js';
import assessmentResultsRoute from './routes/assessmentResultsRoute.js';
import assessmentDemoRoute from './routes/assessmentDemoRoute.js';
import platformProspectRoute from './routes/platformProspectRoute.js';
import revenueRoute from './routes/revenueRoute.js';
import targetAcquisitionRoute from './routes/targetAcquisitionRoute.js';

const app = express();
const PORT = process.env.PORT || 4000;

// --- Profile Picture Upload Setup ---
// Make sure the persistent upload directory exists
const uploadDir = '/data/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for storing files on Render's persistent disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });
// --- End Upload Setup ---

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://ignitebd-frontend.vercel.app', 'https://ignitestrategies.co'], // Allow frontend origin
  credentials: true // Allow cookies to be sent
}));
app.use(express.json());
// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'devdevdev'], // Use a strong secret in production
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  httpOnly: true,
  sameSite: 'lax'
}));

// Routes - Organized by feature (following IgniteBD_ARCHITECTURE.md)
// NEW organized routes (matching schema)
app.use('/api/user', userCreateRoute);          // User create route (Pattern A)
app.use('/api/user', userHydrateRoute);         // User hydrate route (Pattern B) - includes /me, /companies
app.use('/company', companyRoute);              // Company CRUD routes

// Legacy routes (to be refactored into organized folders)
app.use('/adminUserAuth', adminUserAuthRoute);
app.use('/profileSetup', profileSetupRoute);
app.use('/companySetup', companySetupRoute);    // Legacy - use /company instead
app.use('/metrics', metricsRoute);
app.use('/bd', bdRoute);
app.use('/bdPipeline', bdPipelineRoute);
app.use('/assessment', assessmentRoute);
app.use('/assessmentSubmission', assessmentSubmissionRoute);
app.use('/assessmentResults', assessmentResultsRoute);
app.use('/assessmentDemo', assessmentDemoRoute);
app.use('/platformProspect', platformProspectRoute);
app.use('/revenue', revenueRoute);
app.use('/target-acquisition', targetAcquisitionRoute);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Ignite Activation API is running' });      
});

// POST /api/upload – handles profile picture upload
app.post('/api/upload', upload.single('profilePic'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
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

// Start server - Prisma client is generated during build, schema is pushed during build
// Database connection will be established on first use
app.listen(PORT, () => {
  console.log(`🔥 Ignite Activation API running on port ${PORT}`);
  
  // Test database connection (non-blocking)
  prisma.$connect()
    .then(() => {
      console.log('✅ Database connection ready');
    })
    .catch((error) => {
      console.warn('⚠️ Database connection not immediately available (will retry on first query):', error.message);
    });
});
