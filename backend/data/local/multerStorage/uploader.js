import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, uniqueName);
  }
});

const allowedMimeTypes = new Set([
  'image/jpeg', 
  'image/png', 
  'image/webp'
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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