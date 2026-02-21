import { User, Meme, Tag, MemeTag, MemeVote, Comment, database } from "../data/remote/Database.js";
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { Op } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Crea un nuovo meme. Gestisce il caricamento del file fisico, calcola le dimensioni
 * e l'hash di sicurezza (SHA-256), e associa i tag forniti.
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} req.user - L'oggetto utente (deve contenere `id`).
 * @param {Object} req.body - I dati testuali del form.
 * @param {string} req.body.title - Il titolo del meme.
 * @param {string} req.body.description - La descrizione del meme.
 * @param {string|Array} [req.body.tags] - I tag associati (stringa JSON o array).
 * @param {Object} req.file - Il file immagine gestito dal middleware (es. Multer).
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} JSON con i dati del meme appena creato o messaggio di errore.
 */
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
    if (!req.user || !req.user.id) {
      console.error('req.user non definito o senza ID');
      return res.status(401).json({ status: 'fail', message: 'Utente non autenticato' });
    }

    const userId = req.user.id;
    
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (parseError) {
        console.error('Errore parsing tags:', parseError);
        return res.status(400).json({ status: 'fail', message: 'Formato tags non valido' });
      }
    }

    const absoluteFilePath = path.join(__dirname, '..', 'uploads', imageFile.filename);
    const file_size = fs.statSync(absoluteFilePath).size;

    const fileBuffer = fs.readFileSync(absoluteFilePath);
    const file_hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

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

/**
 * Recupera tutti i meme dal database.
 * Se l'utente è autenticato, include l'informazione sul voto che l'utente ha assegnato a ciascun meme.
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} [req.user] - Opzionale. L'oggetto utente per includere i voti personali.
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} JSON con la lista dei meme e le relative relazioni (autore, tag, voti).
 */
export async function getAllMemes(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
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

/**
 * Elimina un meme specifico e rimuove il file immagine associato dal file system.
 * Solo l'autore originale del meme è autorizzato all'eliminazione.
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} req.params - Parametri della route.
 * @param {string|number} req.params.id - L'ID del meme da eliminare.
 * @param {Object} req.user - L'oggetto utente (deve contenere `id`).
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} JSON di conferma dell'eliminazione o errore.
 */
export async function deleteMeme(req, res) {
  const { id } = req.params;

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ status: 'fail', message: 'Utente non autenticato' });
    }

    const meme = await Meme.findOne({ where: { id } });

    if (!meme) {
      return res.status(404).json({ status: 'fail', message: 'Meme non trovato' });
    }

    if (meme.userId !== req.user.id) {
      return res.status(403).json({ status: 'fail', message: 'Non sei autorizzato a cancellare questo meme' });
    }

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

/**
 * Gestisce il sistema di upvote e downvote di un meme per un utente.
 * Se il voto esiste già ed è dello stesso tipo, viene rimosso (toggle off).
 * Se il voto è diverso, viene aggiornato (switch).
 * Altrimenti viene creato un nuovo voto.
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} req.params - Parametri della route.
 * @param {string|number} req.params.id - L'ID del meme da votare.
 * @param {Object} req.body - Dati inviati nel corpo della richiesta.
 * @param {boolean} req.body.isUpvote - `true` per Upvote, `false` per Downvote.
 * @param {Object} req.user - L'oggetto utente (deve contenere `id`).
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} JSON con il nuovo conteggio dei voti e lo stato del voto dell'utente.
 */
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
    
    let finalUserVote = null;

    if (!existingVote) {
      await MemeVote.create({ userId, memeId, isUpvote });
      finalUserVote = isUpvote;
    } else if (existingVote.isUpvote === isUpvote) {
      await existingVote.destroy();
      finalUserVote = null;
    } else {
      await existingVote.update({ isUpvote });
      finalUserVote = isUpvote;
    }

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

/**
 * Recupera un singolo meme in base al suo ID. Include autore, tag associati,
 * commenti (ordinati dal più recente) e l'eventuale voto dell'utente loggato.
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} req.params - Parametri della route.
 * @param {string|number} req.params.id - L'ID del meme da recuperare.
 * @param {Object} [req.user] - Opzionale. L'oggetto utente per recuperare il suo voto.
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} JSON con i dati completi del singolo meme.
 */
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

/**
 * Calcola e restituisce il "Meme del Giorno".
 * Il meme del giorno è il meme creato nella giornata odierna che ha il 
 * punteggio netto (upvotes - downvotes) più alto.
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} JSON con i dati del meme vincitore, o null se non ci sono meme oggi.
 */
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
      subQuery: false
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

/**
 * Ricerca avanzata e paginata dei meme. Supporta filtri per data, tag multipli,
 * e diverse modalità di ordinamento (voti, score totale, data di pubblicazione).
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} req.query - I parametri passati nell'URL della query.
 * @param {string|number} [req.query.page=1] - La pagina corrente (per la paginazione).
 * @param {string} [req.query.startDate] - Filtro per data di inizio (ISO string).
 * @param {string} [req.query.endDate] - Filtro per data di fine (ISO string).
 * @param {string} [req.query.tags] - Lista di tag separati da virgola (es. 'gatti,divertente').
 * @param {string} [req.query.sortBy] - Criterio di ordinamento ('upvotes', 'downvotes', 'score', 'date').
 * @param {string} [req.query.sortDir] - Direzione dell'ordinamento ('ASC' o 'DESC').
 * @param {Object} [req.user] - Opzionale. L'oggetto utente per includere i voti personali.
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} JSON contenente i risultati della query e le info di paginazione.
 */
export async function searchMemes(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; 
    const offset = (page - 1) * limit;

    const { startDate, endDate, tags, sortBy, sortDir } = req.query;
    const userId = req.user?.id ?? null;

    const memeWhere = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
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

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      
      const memesConTag = await Meme.findAll({
        attributes: ['id'],
        include: [{
          model: Tag,
          as: 'tags',
          attributes: [],
          where: { name: { [Op.in]: tagArray } },
          through: { attributes: [] }
        }]
      });

      const matchingMemeIds = memesConTag.map(m => m.id);

      if (matchingMemeIds.length === 0) {
        return res.status(200).json({
          data: [],
          pagination: { totalItems: 0, totalPages: 0, currentPage: page, itemsPerPage: limit }
        });
      }

      memeWhere.id = { [Op.in]: matchingMemeIds };
    }

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

    if (userId) {
      includeOptions.push({
        model: MemeVote,
        as: 'votes',
        where: { userId },
        required: false,
        attributes: ['isUpvote']
      });
    }

    const { count, rows } = await Meme.findAndCountAll({
      where: memeWhere,
      include: includeOptions,
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

/**
 * Ricerca tag nel database per popolare i suggerimenti (autocomplete) sul frontend.
 * Esegue una ricerca parziale (LIKE) ignorando il case.
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} req.query - I parametri passati nell'URL.
 * @param {string} [req.query.q] - La stringa di testo digitata dall'utente.
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} JSON con un array di stringhe contenente i nomi dei tag che corrispondono.
 */
export async function searchTagsForAutocomplete(req, res) {
  try {
    const query = req.query.q || '';
    
    if (!query.trim()) {
      return res.status(200).json({ data: [] });
    }

    const tags = await Tag.findAll({
      where: {
        name: {
          [Op.like]: `%${query.toLowerCase()}%`
        }
      },
      limit: 10,
      attributes: ['name']
    });

    res.status(200).json({ data: tags.map(t => t.name) });
  } catch (error) {
    console.error("Errore durante la ricerca dei tag per autocomplete:", error);
    res.status(500).json({ message: "Errore durante la ricerca dei tag", error: error.message });
  }
}