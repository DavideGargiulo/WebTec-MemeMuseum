import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from "./routes/authRoutes.js";
import memeRoutes from "./routes/memeRoutes.js";
import { initDatabase } from './data/remote/Database.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.disable('x-powered-by');

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], 
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:3000"], 
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:4200', 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'MemeMuseum API' 
  });
});

app.use("/api/auth", authRouter);

app.use("/api/memes", memeRoutes);

app.all(/(.*)/, (req, res) => { 
  res.status(404).json({
    status: 'fail',
    message: `Impossibile trovare ${req.originalUrl} su questo server!`
  });
});

const startServer = async () => {
  try {
    await initDatabase(); 

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Server avviato su porta ${PORT}`);
      console.log(`📡 CORS abilitato per: ${process.env.CLIENT_URL || 'http://localhost:4200'}`);
      console.log(`🗄️  Database connesso\n`);
    });
  } catch (error) {
    console.error('❌ Impossibile avviare il server:', error);
    process.exit(1);
  }
};

startServer();