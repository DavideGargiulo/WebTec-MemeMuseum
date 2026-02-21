import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from "./routes/authRoutes.js";
import memeRoutes from "./routes/memeRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import { initDatabase } from './data/remote/Database.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Inizializzazione dell'applicazione Express.
 * @type {express.Application}
 */
const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Parsing del body della richiesta.
 * Limita la dimensione del payload a 10kb per prevenire attacchi DoS (Denial of Service).
 */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

/**
 * Sicurezza: rimuove l'header "X-Powered-By: Express" per non esporre 
 * informazioni sulla tecnologia del server a potenziali attaccanti.
 */
app.disable('x-powered-by');

/**
 * Sicurezza: Helmet imposta vari header HTTP di sicurezza.
 * Configurato per permettere il caricamento delle immagini locali 
 * ed evitare blocchi CORS troppo stringenti per le risorse statiche.
 */
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

/**
 * Configurazione CORS (Cross-Origin Resource Sharing).
 * Permette al frontend (es. localhost:4200) di comunicare con questo backend,
 * consentendo l'invio delle credenziali (cookie JWT).
 */
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

app.use("/api/comments", commentRoutes);

/**
 * Gestore globale per le rotte non trovate (Catch-All 404).
 * Se una richiesta arriva qui, significa che nessuna rotta precedente l'ha gestita.
 */
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
      console.log(`\nServer avviato su porta ${PORT}`);
      console.log(`CORS abilitato per: ${process.env.CLIENT_URL || 'http://localhost:4200'}`);
      console.log(`Database connesso\n`);
    });
  } catch (error) {
    console.error('Impossibile avviare il server:', error);
    process.exit(1);
  }
};

startServer();