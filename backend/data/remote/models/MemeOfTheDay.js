import { DataTypes } from 'sequelize';

export function createMemeOfTheDayModel(database) {
  return database.define('MemeOfTheDay', {
    day: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      primaryKey: true
    },
    memeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'meme_id'
    }
  }, {
    tableName: 'meme_of_the_day',
    timestamps: false,
    underscored: true
  });
};