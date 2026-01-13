import { DataTypes } from 'sequelize';

export function createUserModel(database) {
  return database.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.CITEXT,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    email: {
      type: DataTypes.CITEXT,
      unique: true,
      allowNull: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_verified_at'
    },
    passwordHash: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'password_hash'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'app_user',
    timestamps: false,
    underscored: true
  });
};