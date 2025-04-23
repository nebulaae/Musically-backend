import db from '../config';
import bcrypt from 'bcrypt';
import { DataTypes, Model } from 'sequelize';

// --- User Model ---
export interface UserAttributes {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends Model<UserAttributes> implements UserAttributes {
  public id!: string;
  public username!: string;
  public email!: string;
  public password!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: 'User',
    tableName: 'users',
    hooks: {
      beforeCreate: async (user: User) => {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

// --- Track Model ---
export interface TrackAttributes {
  id: string;
  title: string;
  author: string;
  album?: string;
  src: string;
  cover?: string;
  type?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Track extends Model<TrackAttributes> implements TrackAttributes {
  public id!: string;
  public title!: string;
  public author!: string;
  public album?: string;
  public src!: string;
  public cover?: string;
  public type?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Track.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    album: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    src: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cover: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    modelName: 'Track',
    tableName: 'tracks',
  }
);

// --- LikedSong Model (Junction table) ---
export class LikedSong extends Model {
  public userId!: string;
  public trackId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LikedSong.init(
  {
    userId: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id',
      },
      primaryKey: true,
    },
    trackId: {
      type: DataTypes.STRING,
      references: {
        model: 'tracks',
        key: 'id',
      },
      primaryKey: true,
    },
  },
  {
    sequelize: db,
    modelName: 'LikedSong',
    tableName: 'liked_songs',
  }
);

// --- Playlist Model ---
export interface PlaylistAttributes {
  id: string;
  name: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Playlist extends Model<PlaylistAttributes> implements PlaylistAttributes {
  public id!: string;
  public name!: string;
  public userId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Playlist.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      references: {
        model: User,
        key: 'id',
      },
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: 'Playlist',
    tableName: 'playlists',
  }
);

// --- PlaylistTrack Model (Junction table) ---
export class PlaylistTrack extends Model {
  public playlistId!: string;
  public trackId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Add association typings
  public tracks?: Track[];
}

PlaylistTrack.init(
  {
    playlistId: {
      type: DataTypes.UUID,
      references: {
        model: Playlist,
        key: 'id',
      },
      primaryKey: true,
    },
    trackId: {
      type: DataTypes.STRING,
      references: {
        model: Track,
        key: 'id',
      },
      primaryKey: true,
    },
  },
  {
    sequelize: db,
    modelName: 'PlaylistTrack',
    tableName: 'playlist_tracks',
  }
);

// --- Define relationships ---
User.hasMany(Playlist, { foreignKey: 'userId', as: 'playlists', onDelete: 'CASCADE' });
Playlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.belongsToMany(Track, { through: LikedSong, foreignKey: 'userId', otherKey: 'trackId', as: 'likedSongs' });
Track.belongsToMany(User, { through: LikedSong, foreignKey: 'trackId', otherKey: 'userId', as: 'likedByUsers' });

Playlist.belongsToMany(Track, { through: PlaylistTrack, foreignKey: 'playlistId', otherKey: 'trackId', as: 'tracks' });
Track.belongsToMany(Playlist, { through: PlaylistTrack, foreignKey: 'trackId', otherKey: 'playlistId', as: 'playlists' });

// Export models via a models object - this is the correct pattern
export const models = {
  User,
  Track,
  LikedSong,
  Playlist,
  PlaylistTrack
};

// Also export the Sequelize instance
export { db };