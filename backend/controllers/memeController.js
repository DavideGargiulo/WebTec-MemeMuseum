import { User, Meme, Tag, MemeTag, MemeVote, Comment, database } from "../data/remote/Database.js";
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { Op } from 'sequelize';

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

export async function getMemeById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id ?? null;

    const meme = await Meme.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['name'],
          through: { attributes: [] }
        },
        {
          model: Comment,
          as: 'comments',
          attributes: ['id', 'content', 'createdAt', 'userId'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username']
            }
          ],
          order: [['createdAt', 'DESC']]
        },
        ...(userId ? [{
          model: MemeVote,
          as: 'votes',
          attributes: ['isUpvote'],
          where: { userId },
          required: false
        }] : [])
      ]
    });

    if (!meme) {
      return res.status(404).json({
        success: false,
        message: 'Meme non trovato'
      });
    }

    return res.status(200).json({
      success: true,
      data: meme.toJSON()
    });

  } catch (error) {
    console.error('Errore in getMemeById:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
};

export async function getMemeOfTheDay(req, res) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const memeOfTheDay = await Meme.findOne({
      where: {
        createdAt: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
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
      ],
      order: [
        [database.literal('("Meme"."upvotes_number" - "Meme"."downvotes_number")'), 'DESC'],
        ['createdAt', 'DESC']
      ],
      subQuery: false  // 👈 this prevents the wrapping subquery
    });

    if (!memeOfTheDay) {
      return res.status(200).json({ data: null, message: "Nessun meme pubblicato oggi." });
    }

    res.status(200).json({ data: memeOfTheDay });

  } catch (error) {
    console.error("Errore nel recupero del meme del giorno:", error);
    res.status(500).json({ message: "Impossibile recuperare il meme del giorno.", error: error.message });
  }
}

export async function searchMemes(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; 
    const offset = (page - 1) * limit;

    const { startDate, endDate, tags, sortBy, sortDir } = req.query;

    const memeWhere = {};

    // 1. Filtri per Data
    if (startDate && endDate) {
      // Imposta l'inizio alle 00:00:00
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      // Imposta la fine alle 23:59:59
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      memeWhere.createdAt = { [Op.between]: [start, end] };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      memeWhere.createdAt = { [Op.gte]: start };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      memeWhere.createdAt = { [Op.lte]: end };
    }

    // 2. CORREZIONE TAG: Estrazione preventiva degli ID
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      
      // Cerchiamo in anticipo SOLO gli ID dei meme che possiedono i tag richiesti
      const memesConTag = await Meme.findAll({
        attributes: ['id'], // Chiediamo solo l'ID per essere velocissimi
        include: [{
          model: Tag,
          as: 'tags',
          attributes: [],
          where: { name: { [Op.in]: tagArray } },
          through: { attributes: [] }
        }]
      });

      const matchingMemeIds = memesConTag.map(m => m.id);

      // Se nessun meme ha questi tag, restituiamo subito un array vuoto (risparmia lavoro al server!)
      if (matchingMemeIds.length === 0) {
        return res.status(200).json({
          data: [],
          pagination: { totalItems: 0, totalPages: 0, currentPage: page, itemsPerPage: limit }
        });
      }

      // Aggiungiamo gli ID trovati al filtro principale
      memeWhere.id = { [Op.in]: matchingMemeIds };
    }

    // 3. Costruzione dell'ordinamento
    let orderClause = [['createdAt', 'DESC']]; 
    const direction = sortDir === 'ASC' ? 'ASC' : 'DESC';

    if (sortBy === 'upvotes') {
      orderClause = [['upvotesNumber', direction]];
    } else if (sortBy === 'downvotes') {
      orderClause = [['downvotesNumber', direction]];
    } else if (sortBy === 'score') {
      orderClause = [[database.literal('("Meme"."upvotesNumber" - "Meme"."downvotesNumber")'), direction]];
    } else if (sortBy === 'date') {
      orderClause = [['createdAt', direction]];
    }

    // 4. Esecuzione della query principale (ORA PULITA DA FILTRI SUI TAG!)
    const { count, rows } = await Meme.findAndCountAll({
      where: memeWhere,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        },
        {
          model: Tag,
          as: 'tags', // Poiché non c'è il blocco 'where' qui, estrarrà TUTTI i tag del meme!
          attributes: ['id', 'name'],
          through: { attributes: [] }
        }
      ],
      order: orderClause,
      limit: limit,
      offset: offset,
      distinct: true 
    });

    res.status(200).json({
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error("Errore nella ricerca dei meme:", error);
    res.status(500).json({ message: "Errore durante la ricerca", error: error.message });
  }
}