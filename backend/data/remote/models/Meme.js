import { DataTypes, literal } from 'sequelize';

export function createMemeModel(database) {
  return database.define('Meme', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    fileName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'file_name'
    },
    filePath: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'file_path'
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'file_size',
      validate: {
        min: 1
      }
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'mime_type',
      validate: {
        is: /^image\//i
      }
    },
    fileHash: {
      type: DataTypes.CHAR(64),
      allowNull: true,
      unique: true,
      field: 'file_hash'
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
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
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  }, {
    tableName: 'meme',
    timestamps: false,
    underscored: true,
    paranoid: false,
    defaultScope: {
      where: {
        deletedAt: null
      }
    },
    scopes: {
      withDeleted: {
        where: {}
      },
      popular: {
        where: { deletedAt: null },
        order: [[literal('(upvotes_number - downvotes_number)'), 'DESC']]
      }
    }
  });
};