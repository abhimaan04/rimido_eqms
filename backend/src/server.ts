import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/connection';
import { errorHandler } from './middleware/errorHandler';
import { auditLogger } from './middleware/auditLogger';

// Routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import documentsRoutes from './routes/documents';
import capaRoutes from './routes/capa';
import changeControlRoutes from './routes/changeControl';
import trainingRoutes from './routes/training';
import auditRoutes from './routes/audit';
import riskRoutes from './routes/risk';
import complaintRoutes from './routes/complaint';
import signatureRoutes from './routes/signature';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Audit logging middleware (must be early to capture all requests)
app.use(auditLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/capa', capaRoutes);
app.use('/api/change-control', changeControlRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/complaint', complaintRoutes);
app.use('/api/signature', signatureRoutes);

// Error handling (must be last)
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('✅ Database connected');
    
    app.listen(PORT, () => {
      console.log(`🚀 eQMS Server running on port ${PORT}`);
      console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
