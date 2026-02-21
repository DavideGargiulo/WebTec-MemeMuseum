import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Configurazione dello storage su disco per Multer.
 * Definisce la cartella di destinazione e genera un nome file univoco e sicuro
 * utilizzando UUIDv4 per prevenire collisioni e sovrascritture di file con lo stesso nome.
 * @type {multer.StorageEngine}
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, uniqueName);
  }
});

/**
 * Set dei tipi MIME consentiti per l'upload.
 * @type {Set<string>}
 */
const allowedMimeTypes = new Set([
  'image/jpeg', 
  'image/png', 
  'image/webp'
]);

/**
 * Dimensione massima consentita per il file in byte (5 MB).
 * @type {number}
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Middleware di upload preconfigurato pronto per essere usato nelle rotte Express.
 * Gestisce l'upload di un singolo file, applicando limiti di dimensione e
 * un doppio livello di validazione (MIME type + Estensione) per sicurezza.
 * @example
 * Utilizzo in una rotta Express:
 * router.post('/upload', uploader.single('image'), controllerHandler);
 * @type {multer.Multer}
 */
export const uploader = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: function (req, file, cb) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Formato non supportato. Usa JPG, PNG o WebP.'), false);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error('Estensione file non valida.'), false);
    }

    cb(null, true);
  }
});