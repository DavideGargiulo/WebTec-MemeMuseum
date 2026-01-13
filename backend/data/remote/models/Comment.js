import { DataTypes } from 'sequelize';

export function createCommentModel(database) {
  return database.define('Comment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    memeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'meme_id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_id'
    },
    upvotesNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'upvotes_number',
      validate: {
        min: 0
      }
    },
    downvotesNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'downvotes_number',
      validate: {
        min: 0
      }
    },
    commentsNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'comments_number',
      validate: {
        min: 0
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'comment',
    timestamps: false,
    underscored: true
  });
};