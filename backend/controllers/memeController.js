import { User, Meme, Tag, MemeTag, MemeVote } from "../data/remote/Database.js";
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

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

    // Percorso assoluto: multer diskStorage non garantisce che imageFile.path
    // sia risolvibile dal CWD del processo, costruiamolo manualmente
    const absoluteFilePath = path.join(__dirname, '..', 'uploads', imageFile.filename);

    // file_size: multer diskStorage NON popola imageFile.size, va letto da fs
    const file_size = fs.statSync(absoluteFilePath).size;

    // Calcolo file_hash SHA-256
    const fileBuffer = fs.readFileSync(absoluteFilePath);
    const file_hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Calcolo width e height tramite sharp
    let width = null;
    let height = null;
    try {
      const metadata = await sharp(absoluteFilePath).metadata();
      width = metadata.width ?? null;
      height = metadata.height ?? null;
    } catch (sharpError) {
      console.error('Errore lettura dimensioni immagine:', sharpError);
    }

    const newMeme = await Meme.create({
      title,
      description,
      fileName: imageFile.filename,
      filePath: `/uploads/${imageFile.filename}`,
      file_size,
      mime_type: imageFile.mimetype,
      file_hash,
      width,
      height,
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
    // Verifica se c'è un utente loggato (popolato dal middleware di auth, se presente)
    const userId = req.user ? req.user.id : null;

    // Costruiamo le opzioni di include dinamicamente
    const includeOptions = [
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
    ];

    // Se l'utente è loggato, includiamo anche i suoi voti per questi meme
    if (userId) {
      includeOptions.push({
        model: MemeVote,
        as: 'votes',
        where: { userId },
        required: false,
        attributes: ['isUpvote']
      });
    }

    const memes = await Meme.findAll({
      order: [['createdAt', 'DESC']],
      include: includeOptions
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

export async function deleteMeme(req, res) {
  const { id } = req.params;

  try {
    // Verifica User
    if (!req.user || !req.user.id) {
      return res.status(401).json({ status: 'fail', message: 'Utente non autenticato' });
    }

    const meme = await Meme.findOne({ where: { id } });

    if (!meme) {
      return res.status(404).json({ status: 'fail', message: 'Meme non trovato' });
    }

    // Solo il proprietario può cancellare il proprio meme
    if (meme.userId !== req.user.id) {
      return res.status(403).json({ status: 'fail', message: 'Non sei autorizzato a cancellare questo meme' });
    }

    // Cancella il file fisico da uploads/
    const absoluteFilePath = path.join(__dirname, '..', 'uploads', meme.fileName);
    if (fs.existsSync(absoluteFilePath)) {
      fs.unlinkSync(absoluteFilePath);
      console.log('File eliminato:', absoluteFilePath);
    } else {
      console.warn('File non trovato su disco (già eliminato?):', absoluteFilePath);
    }

    await meme.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Meme eliminato con successo'
    });

  } catch (error) {
    console.error('Errore durante la cancellazione del meme:', error);
    res.status(500).json({
      status: 'error',
      message: 'Si è verificato un errore durante la cancellazione del meme',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export async function voteMeme(req, res) {
  const { id: memeId } = req.params;
  const { isUpvote } = req.body;

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ status: 'fail', message: 'Utente non autenticato' });
    }

    if (typeof isUpvote !== 'boolean') {
      return res.status(400).json({ status: 'fail', message: 'Il campo isUpvote deve essere un booleano' });
    }

    const userId = req.user.id;

    const meme = await Meme.findOne({ where: { id: memeId } });
    if (!meme) {
      return res.status(404).json({ status: 'fail', message: 'Meme non trovato' });
    }

    const existingVote = await MemeVote.findOne({ where: { userId, memeId } });
    
    // Variabile per tracciare lo stato finale del voto dell'utente da restituire al client
    let finalUserVote = null;

    if (!existingVote) {
      // Nessun voto precedente -> crea
      // I trigger nel Database.js incrementeranno i contatori automaticamente
      await MemeVote.create({ userId, memeId, isUpvote });
      finalUserVote = isUpvote;

    } else if (existingVote.isUpvote === isUpvote) {
      // Stesso voto -> toggle off (rimuovi)
      // I trigger nel Database.js decrementeranno i contatori automaticamente
      await existingVote.destroy();
      finalUserVote = null;

    } else {
      // Voto diverso -> switch (es. upvote -> downvote)
      // I trigger nel Database.js gestiranno lo scambio dei contatori automaticamente
      await existingVote.update({ isUpvote });
      finalUserVote = isUpvote;
    }

    // Rilegge i contatori aggiornati dal DB (poiché i trigger li hanno modificati asincronamente)
    await meme.reload();

    res.status(200).json({
      status: 'success',
      data: {
        memeId,
        upvotesNumber: meme.upvotesNumber,
        downvotesNumber: meme.downvotesNumber,
        userVote: finalUserVote
      }
    });

  } catch (error) {
    console.error('Errore durante il voto:', error);
    res.status(500).json({
      status: 'error',
      message: 'Si è verificato un errore durante il voto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}