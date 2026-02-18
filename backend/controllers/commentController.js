import { Comment, User } from "../data/remote/Database.js";

export async function getCommentsByMeme(req, res) {
  try {
    const { memeId } = req.params;

    const comments = await Comment.findAll({
      where: { 
        memeId: memeId,
        parentId: null // Per ora prendiamo solo i commenti principali (no risposte)
      },
      include: [{
        model: User,
        as: 'user', // Usa l'alias definito in Database.js
        attributes: ['id', 'username'] // Non inviare la password o altri dati sensibili!
      }],
      order: [['createdAt', 'DESC']] // I più recenti in alto (o 'ASC' per i più vecchi)
    });

    res.status(200).json(comments);
  } catch (error) {
    console.error("Errore nel recupero dei commenti:", error);
    res.status(500).json({ message: "Impossibile recuperare i commenti.", error: error.message });
  }
}

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