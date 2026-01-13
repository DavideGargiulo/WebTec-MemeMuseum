import { DataTypes } from 'sequelize';

export function createMemeTagModel(database) {
  return database.define('MemeTag', {
    memeId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'meme_id'
    },
    tagId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'tag_id'
    }
  }, {
    tableName: 'meme_tag',
    timestamps: false,
    underscored: true
  });
};