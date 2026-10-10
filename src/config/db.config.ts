import { Sequelize } from "sequelize";
import { dbConfig } from "./index.config";


export const sequelize = new Sequelize({
  dialect:  "mysql",
  host:     dbConfig.HOST,
  username: dbConfig.USERNAME,
  password: dbConfig.PASSWORD,
  database: dbConfig.NAME
})
