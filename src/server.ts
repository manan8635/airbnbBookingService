import express from 'express'
import { ServerConfig } from "./config/index.config";
import { sequelize } from './config/db.config';
import v1Router from './Routing/v1Router/index.router';
import Redis from 'ioredis';

const app = express() ;

 
app.use(express.json())
app.use(v1Router)

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connection successful!");
  } catch (error : any) {
    console.error("❌ Connection failed:");
    throw new Error("Database connection Failed") 
  }
}


testConnection()
.then(() => { 
    app.listen(ServerConfig.PORT) ;
})
.catch((error) => {
  console.log("Error occurred " + error) ;
})


