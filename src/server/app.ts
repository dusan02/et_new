import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { earningsRoutes } from './routes/earnings';
import { cronRoutes } from './routes/cron';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Routes
app.use('/api/earnings', earningsRoutes);
app.use('/api/cron', cronRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
  
  // Join room for earnings updates
  socket.on('join-earnings', () => {
    socket.join('earnings-updates');
    logger.info(`Client ${socket.id} joined earnings-updates room`);
  });
  
  // Handle earnings updates from queue worker
  socket.on('earnings-updated', (data) => {
    logger.info('Broadcasting earnings update to clients');
    io.to('earnings-updates').emit('earnings-updated', data);
  });
  
  // Handle market data updates from queue worker
  socket.on('market-data-updated', (data) => {
    logger.info('Broadcasting market data update to clients');
    io.to('earnings-updates').emit('market-data-updated', data);
  });
});

// Error handling
app.use(errorHandler);

// Make io available globally for other modules
export { io, prisma };

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`WebSocket server running on port ${PORT}`);
});

export default app;
