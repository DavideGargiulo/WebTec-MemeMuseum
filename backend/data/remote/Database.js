import { Sequelize } from 'sequelize';
import dbConfig from '../../config/database.config.js';

import { createUserModel } from './models/User.js';
import { createMemeModel } from './models/Meme.js';
import { createTagModel } from './models/Tag.js';
import { createMemeTagModel } from './models/MemeTag.js';
import { createMemeVoteModel } from './models/MemeVote.js';
import { createCommentModel } from './models/Comment.js';
import { createCommentVoteModel } from './models/CommentVote.js';
import { createMemeOfTheDayModel } from './models/MemeOfTheDay.js';

import 'dotenv/config';

export const database = new Sequelize(process.env.DB_CONNECTION_URI, {
  dialect: process.env.DIALECT,
  logging: false,
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

// Inizializza i modelli
createUserModel(database);
createMemeModel(database);
createTagModel(database);
createMemeTagModel(database);
createMemeVoteModel(database);
createCommentModel(database);
createCommentVoteModel(database);
createMemeOfTheDayModel(database);

// Estrai i modelli
export const {
  User,
  Meme,
  Tag,
  MemeTag,
  MemeVote,
  Comment,
  CommentVote,
  MemeOfTheDay
} = database.models;

// ========================================
// ASSOCIATIONS
// ========================================
const createAssociations = () => {
  // User <-> Meme
  User.hasMany(Meme, { 
    foreignKey: 'userId', 
    as: 'memes', 
    onDelete: 'CASCADE' 
  });
  Meme.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
  });

  // Meme <-> Tag (Many-to-Many)
  Meme.belongsToMany(Tag, { 
    through: MemeTag, 
    foreignKey: 'memeId', 
    otherKey: 'tagId',
    as: 'tags'
  });
  Tag.belongsToMany(Meme, { 
    through: MemeTag, 
    foreignKey: 'tagId', 
    otherKey: 'memeId',
    as: 'memes'
  });

  // User <-> MemeVote <-> Meme
  User.hasMany(MemeVote, { 
    foreignKey: 'userId', 
    as: 'memeVotes', 
    onDelete: 'CASCADE' 
  });
  Meme.hasMany(MemeVote, { 
    foreignKey: 'memeId', 
    as: 'votes', 
    onDelete: 'CASCADE' 
  });
  MemeVote.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
  });
  MemeVote.belongsTo(Meme, { 
    foreignKey: 'memeId', 
    as: 'meme' 
  });

  // User <-> Comment
  User.hasMany(Comment, { 
    foreignKey: 'userId', 
    as: 'comments', 
    onDelete: 'CASCADE' 
  });
  Comment.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
  });

  // Meme <-> Comment
  Meme.hasMany(Comment, { 
    foreignKey: 'memeId', 
    as: 'comments', 
    onDelete: 'CASCADE' 
  });
  Comment.belongsTo(Meme, { 
    foreignKey: 'memeId', 
    as: 'meme' 
  });

  // Comment self-reference (thread)
  Comment.hasMany(Comment, { 
    foreignKey: 'parentId', 
    as: 'replies', 
    onDelete: 'CASCADE' 
  });
  Comment.belongsTo(Comment, { 
    foreignKey: 'parentId', 
    as: 'parent' 
  });

  // User <-> CommentVote <-> Comment
  User.hasMany(CommentVote, { 
    foreignKey: 'userId', 
    as: 'commentVotes', 
    onDelete: 'CASCADE' 
  });
  Comment.hasMany(CommentVote, { 
    foreignKey: 'commentId', 
    as: 'votes', 
    onDelete: 'CASCADE' 
  });
  CommentVote.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
  });
  CommentVote.belongsTo(Comment, { 
    foreignKey: 'commentId', 
    as: 'comment' 
  });

  // Meme <-> MemeOfTheDay
  Meme.hasMany(MemeOfTheDay, { 
    foreignKey: 'memeId', 
    as: 'memeOfTheDays', 
    onDelete: 'CASCADE' 
  });
  MemeOfTheDay.belongsTo(Meme, { 
    foreignKey: 'memeId', 
    as: 'meme' 
  });
};

// ========================================
// TRIGGERS (HOOKS)
// ========================================
const setupTriggers = () => {
  // ========================================
  // MEME_VOTE TRIGGERS
  // ========================================
  
  // After insert: increment upvotes/downvotes counter
  MemeVote.addHook('afterCreate', async (vote, options) => {
    const field = vote.isUpvote ? 'upvotesNumber' : 'downvotesNumber';
    await Meme.increment(field, { 
      where: { id: vote.memeId },
      transaction: options.transaction 
    });
  });

  // After update: adjust counters when vote changes
  MemeVote.addHook('afterUpdate', async (vote, options) => {
    if (vote.changed('isUpvote')) {
      const oldField = vote._previousDataValues.isUpvote ? 
        'upvotesNumber' : 'downvotesNumber';
      const newField = vote.isUpvote ? 
        'upvotesNumber' : 'downvotesNumber';
      
      await Meme.decrement(oldField, { 
        where: { id: vote.memeId },
        transaction: options.transaction 
      });
      
      await Meme.increment(newField, { 
        where: { id: vote.memeId },
        transaction: options.transaction 
      });
    }
  });

  // After delete: decrement upvotes/downvotes counter
  MemeVote.addHook('afterDestroy', async (vote, options) => {
    const field = vote.isUpvote ? 'upvotesNumber' : 'downvotesNumber';
    await Meme.decrement(field, { 
      where: { id: vote.memeId },
      transaction: options.transaction 
    });
  });

  // ========================================
  // COMMENT_VOTE TRIGGERS
  // ========================================
  
  // After insert: increment upvotes/downvotes counter
  CommentVote.addHook('afterCreate', async (vote, options) => {
    const field = vote.isUpvote ? 'upvotesNumber' : 'downvotesNumber';
    await Comment.increment(field, { 
      where: { id: vote.commentId },
      transaction: options.transaction 
    });
  });

  // After update: adjust counters when vote changes
  CommentVote.addHook('afterUpdate', async (vote, options) => {
    if (vote.changed('isUpvote')) {
      const oldField = vote._previousDataValues.isUpvote ? 
        'upvotesNumber' : 'downvotesNumber';
      const newField = vote.isUpvote ? 
        'upvotesNumber' : 'downvotesNumber';
      
      await Comment.decrement(oldField, { 
        where: { id: vote.commentId },
        transaction: options.transaction 
      });
      
      await Comment.increment(newField, { 
        where: { id: vote.commentId },
        transaction: options.transaction 
      });
    }
  });

  // After delete: decrement upvotes/downvotes counter
  CommentVote.addHook('afterDestroy', async (vote, options) => {
    const field = vote.isUpvote ? 'upvotesNumber' : 'downvotesNumber';
    await Comment.decrement(field, { 
      where: { id: vote.commentId },
      transaction: options.transaction 
    });
  });

  // ========================================
  // COMMENT TRIGGERS
  // ========================================
  
  // Before create/update: validate parent comment belongs to same meme
  Comment.addHook('beforeSave', async (comment, options) => {
    if (comment.parentId) {
      const parent = await Comment.findByPk(comment.parentId, {
        attributes: ['memeId'],
        transaction: options.transaction
      });
      
      if (!parent) {
        throw new Error(`Parent comment ${comment.parentId} not found`);
      }
      
      if (parent.memeId !== comment.memeId) {
        throw new Error(
          `Parent comment meme_id (${parent.memeId}) differs from child meme_id (${comment.memeId})`
        );
      }
    }
  });

  // After create: increment comments counter
  Comment.addHook('afterCreate', async (comment, options) => {
    if (comment.parentId) {
      // Increment parent comment's replies counter
      await Comment.increment('commentsNumber', { 
        where: { id: comment.parentId },
        transaction: options.transaction 
      });
    } else {
      // Increment meme's comments counter
      await Meme.increment('commentsNumber', { 
        where: { id: comment.memeId },
        transaction: options.transaction 
      });
    }
  });

  // After delete: decrement comments counter
  Comment.addHook('afterDestroy', async (comment, options) => {
    if (comment.parentId) {
      // Decrement parent comment's replies counter
      await Comment.decrement('commentsNumber', { 
        where: { id: comment.parentId },
        transaction: options.transaction 
      });
    } else {
      // Decrement meme's comments counter
      await Meme.decrement('commentsNumber', { 
        where: { id: comment.memeId },
        transaction: options.transaction 
      });
    }
  });
};

// Esegui setup
createAssociations();
// setupTriggers();

// ========================================
// INIZIALIZZAZIONE DATABASE
// ========================================
export const initDatabase = async () => {
  try {
    await database.authenticate();
    console.log('✅ Database connesso con successo');
    
    // ATTENZIONE: sync() solo in development!
    if (process.env.NODE_ENV === 'development') {
      await database.sync({ alter: false });
      console.log('✅ Database sincronizzato');
    }
  } catch (err) {
    console.error('❌ Errore connessione DB:', err);
    throw err;
  }
};

// Auto-init se non in produzione
if (process.env.NODE_ENV !== 'production') {
  initDatabase();
}