import { Comment, User } from "../data/remote/Database.js";

/**
 * Recupera tutti i commenti associati a un meme specifico.
 * I commenti sono ordinati in modo decrescente per data di creazione (dal più recente al più vecchio)
 * e includono le informazioni di base dell'autore (ID e username).
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} req.params - I parametri dell'URL.
 * @param {string|number} req.params.memeId - L'ID del meme per cui recuperare i commenti.
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} Una Promise che risolve con un array JSON contenente i commenti, oppure un messaggio di errore.
 */
export async function getCommentsByMeme(req, res) {
  try {
    const { memeId } = req.params;

    const comments = await Comment.findAll({
      where: { 
        memeId: memeId,
        parentId: null
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(comments);
  } catch (error) {
    console.error("Errore nel recupero dei commenti:", error);
    res.status(500).json({ message: "Impossibile recuperare i commenti.", error: error.message });
  }
}

/**
 * Crea un nuovo commento per un meme specifico.
 * Richiede che l'utente sia autenticato (presenza di req.user) e che il contenuto non sia vuoto.
 * Restituisce il commento appena creato popolato con i dati dell'autore.
 * @param {Object} req - L'oggetto di richiesta di Express.
 * @param {Object} req.params - I parametri dell'URL.
 * @param {string|number} req.params.memeId - L'ID del meme che si sta commentando.
 * @param {Object} req.body - Il corpo della richiesta.
 * @param {string} req.body.content - Il testo del commento.
 * @param {string|number} [req.body.parentId] - (Opzionale) L'ID del commento genitore, se si tratta di una risposta.
 * @param {Object} req.user - L'oggetto utente popolato dal middleware di autenticazione.
 * @param {string|number} req.user.id - L'ID dell'utente autore del commento.
 * @param {Object} res - L'oggetto di risposta di Express.
 * @returns {Promise<Object>} Una Promise che risolve con l'oggetto JSON del commento creato, o un messaggio di errore.
 */
export async function createComment(req, res) {
  try {
    const { memeId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: "Il contenuto del commento non può essere vuoto." });
    }

    const newComment = await Comment.create({
      memeId,
      userId,
      content,
      parentId: parentId || null
    });

    const commentWithUser = await Comment.findByPk(newComment.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username']
      }]
    });

    res.status(201).json(commentWithUser);
  } catch (error) {
    console.error("Errore nella creazione del commento:", error);
    res.status(500).json({ message: "Impossibile creare il commento.", error: error.message });
  }
};