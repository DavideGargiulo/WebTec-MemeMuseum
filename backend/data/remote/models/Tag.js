import { DataTypes } from 'sequelize';

export function createTagModel(database) {
  return database.define('Tag', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.CITEXT,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    }
  }, {
    tableName: 'tag',
    timestamps: false,
    underscored: true
  });
};