import { DataTypes } from 'sequelize';

export function createCommentVoteModel(database) {
  return database.define('CommentVote', {
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'user_id'
    },
    commentId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'comment_id'
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
    tableName: 'comment_vote',
    timestamps: false,
    underscored: true
  });
};