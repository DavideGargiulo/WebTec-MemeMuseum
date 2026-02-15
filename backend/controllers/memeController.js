import { User, Meme, Tag, MemeTag } from "../data/remote/Database.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createMeme(req, res) {
  const { title, description, tags } = req.body;
  const imageFile = req.file;

  if (!imageFile) {
    return res.status(400).json({ 
      status: 'fail', 
      message: 'Immagine del meme mancante' 
    });
  }

  try {
    // Verifica User
    if (!req.user || !req.user.id) {
      console.error('req.user non definito o senza ID');
      return res.status(401).json({ status: 'fail', message: 'Utente non autenticato' });
    }

    const userId = req.user.id;
    
    // Parsing tags
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (parseError) {
        console.error('Errore parsing tags:', parseError);
        return res.status(400).json({ status: 'fail', message: 'Formato tags non valido' });
      }
    }

    const newMeme = await Meme.create({
      title,
      description,
      fileName: imageFile.filename,
      filePath: `/uploads/${imageFile.filename}`,
      userId
    });

    console.log('Meme creato:', newMeme.id);

    if (parsedTags && Array.isArray(parsedTags) && parsedTags.length > 0) {
      const tagRecords = await Promise.all(
        parsedTags.map(async (tagName) => {
          const [tag] = await Tag.findOrCreate({
            where: { name: tagName.toLowerCase().trim() }
          });
          return tag;
        })
      );
      await newMeme.addTags(tagRecords);
    }

    // Recupero finale
    const memeWithTags = await Meme.findOne({
      where: { id: newMeme.id },
      include: [
        { 
          model: Tag, 
          as: 'tags',
          through: { attributes: [] },
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({
      status: 'success',
      data: {
        meme: memeWithTags
      }
    });

  } catch (error) {
    console.error('Errore durante la creazione del meme:', error);
    
    if (imageFile) {
      try {
        const filePath = path.join(__dirname, '..', 'uploads', imageFile.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) { console.error('Errore cleanup:', e); }
    }
    
    res.status(500).json({ 
      status: 'error', 
      message: 'Si è verificato un errore durante la creazione del meme',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export async function getAllMemes(req, res) {
  try {
    const memes = await Meme.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name'],
          through: { attributes: [] }
        }
      ]
    });

    res.status(200).json({
      status: 'success',
      results: memes.length,
      data: {
        memes
      }
    });

  } catch (error) {
    console.error('Errore recupero memes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Impossibile recuperare i meme',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}