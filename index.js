import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import prisma from './db.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Routes (following architecture pattern)
import createOwnerRoute from './routes/Owner/CreateOwnerRoute.js';
import ownerProfileSetupRoute from './routes/Owner/OwnerProfileSetupRoute.js';
import ownerHydrateRoute from './routes/Owner/IgniteUniversalHydrateRoute.js';
import createCompanyHQRoute from './routes/Company/CreateCompanyHQRoute.js';
import proposalRoutes from './routes/Proposal/ProposalRoutes.js';
import pipelineConfigRoute from './routes/pipelineConfigRoute.js';
import contactRoutes from './routes/Contact/ContactRoutes.js';
import personaRoutes from './routes/Persona/PersonaRoutes.js';
import businessIntelligenceRoutes from './routes/BusinessIntelligence/BusinessIntelligenceRoutes.js';

const app = express();
const PORT = process.env.PORT || 4000;

// --- Profile Picture Upload Setup ---
// Use local uploads directory in project folder
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for storing files locally
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),                                                                          
});
const upload = multer({ storage });
// --- End Upload Setup ---

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://ignitebd-frontend.vercel.app', 
    'https://ignitestrategies.co',
    'https://growth.ignitestrategies.co'  // Production frontend subdomain
  ],
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

// Routes - Organized by feature (following IGNITE_ARCHITECTURE.md)
app.use('/api/owner', createOwnerRoute);        // Owner create/upsert route
app.use('/api/owner', ownerProfileSetupRoute);   // Owner profile setup route
app.use('/api/owner', ownerHydrateRoute);        // Owner hydrate route (universal hydration)
app.use('/api/companyhq', createCompanyHQRoute);  // CompanyHQ create route
app.use('/api/proposals', proposalRoutes);      // Proposal CRUD routes
app.use('/api/pipelines', pipelineConfigRoute); // Pipeline config route
app.use('/api/contacts', contactRoutes);        // Contact CRUD routes
app.use('/api/personas', personaRoutes);        // Persona create/update routes
app.use('/api/business-intelligence', businessIntelligenceRoutes); // Business Intelligence scoring routes

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
