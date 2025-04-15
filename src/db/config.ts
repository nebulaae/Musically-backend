import path from 'path';
import { Sequelize } from 'sequelize';

const dbPath = path.resolve(__dirname, '../../db.sqlite');

const db = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    freezeTableName: false,
    timestamps: true
  },
});

export default db;