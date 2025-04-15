"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const sequelize_1 = require("sequelize");
const dbPath = path_1.default.resolve(__dirname, '../../db.sqlite');
const db = new sequelize_1.Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
        freezeTableName: false,
        timestamps: true
    },
});
exports.default = db;
//# sourceMappingURL=config.js.map