import { DataTypes } from 'sequelize';

export function createMemeVoteModel(database) {
  return database.define('MemeVote', {
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'user_id'
    },
    memeId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'meme_id'
    },
    isUpvote: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_upvote'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'meme_vote',
    timestamps: false,
    underscored: true
  });
};