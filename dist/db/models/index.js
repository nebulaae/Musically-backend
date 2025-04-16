"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.models = exports.PlaylistTrack = exports.Playlist = exports.LikedSong = exports.Track = exports.User = void 0;
const config_1 = __importDefault(require("../config"));
exports.db = config_1.default;
const bcrypt_1 = __importDefault(require("bcrypt"));
const sequelize_1 = require("sequelize");
class User extends sequelize_1.Model {
    comparePassword(candidatePassword) {
        return __awaiter(this, void 0, void 0, function* () {
            return bcrypt_1.default.compare(candidatePassword, this.password);
        });
    }
}
exports.User = User;
User.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    username: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize: config_1.default,
    modelName: 'User',
    tableName: 'users',
    hooks: {
        beforeCreate: (user) => __awaiter(void 0, void 0, void 0, function* () {
            const salt = yield bcrypt_1.default.genSalt(10);
            user.password = yield bcrypt_1.default.hash(user.password, salt);
        }),
        beforeUpdate: (user) => __awaiter(void 0, void 0, void 0, function* () {
            if (user.changed('password')) {
                const salt = yield bcrypt_1.default.genSalt(10);
                user.password = yield bcrypt_1.default.hash(user.password, salt);
            }
        }),
    },
});
class Track extends sequelize_1.Model {
}
exports.Track = Track;
Track.init({
    id: {
        type: sequelize_1.DataTypes.STRING,
        primaryKey: true,
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    author: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    album: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    src: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    cover: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    type: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize: config_1.default,
    modelName: 'Track',
    tableName: 'tracks',
});
// --- LikedSong Model (Junction table) ---
class LikedSong extends sequelize_1.Model {
}
exports.LikedSong = LikedSong;
LikedSong.init({
    userId: {
        type: sequelize_1.DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id',
        },
        primaryKey: true,
    },
    trackId: {
        type: sequelize_1.DataTypes.STRING,
        references: {
            model: 'tracks',
            key: 'id',
        },
        primaryKey: true,
    },
}, {
    sequelize: config_1.default,
    modelName: 'LikedSong',
    tableName: 'liked_songs',
});
class Playlist extends sequelize_1.Model {
}
exports.Playlist = Playlist;
Playlist.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id',
        },
        allowNull: false,
    },
}, {
    sequelize: config_1.default,
    modelName: 'Playlist',
    tableName: 'playlists',
});
// --- PlaylistTrack Model (Junction table) ---
class PlaylistTrack extends sequelize_1.Model {
}
exports.PlaylistTrack = PlaylistTrack;
PlaylistTrack.init({
    playlistId: {
        type: sequelize_1.DataTypes.UUID,
        references: {
            model: 'playlists',
            key: 'id',
        },
        primaryKey: true,
    },
    trackId: {
        type: sequelize_1.DataTypes.STRING,
        references: {
            model: 'tracks',
            key: 'id',
        },
        primaryKey: true,
    },
}, {
    sequelize: config_1.default,
    modelName: 'PlaylistTrack',
    tableName: 'playlist_tracks',
});
// --- Define relationships ---
User.hasMany(Playlist, { foreignKey: 'userId', as: 'playlists' });
Playlist.belongsTo(User, { foreignKey: 'userId' });
User.belongsToMany(Track, { through: LikedSong, foreignKey: 'userId', otherKey: 'trackId', as: 'likedSongs' });
Track.belongsToMany(User, { through: LikedSong, foreignKey: 'trackId', otherKey: 'userId', as: 'likedByUsers' });
Playlist.belongsToMany(Track, { through: PlaylistTrack, foreignKey: 'playlistId', otherKey: 'trackId', as: 'tracks' });
Track.belongsToMany(Playlist, { through: PlaylistTrack, foreignKey: 'trackId', otherKey: 'playlistId', as: 'playlists' });
// Export models via a models object - this is the correct pattern
exports.models = {
    User,
    Track,
    LikedSong,
    Playlist,
    PlaylistTrack
};
//# sourceMappingURL=index.js.map