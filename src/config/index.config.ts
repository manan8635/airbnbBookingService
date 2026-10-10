import dotenv from "dotenv"
dotenv.config() ;

type serverConfiguration = {
    PORT : number,
    REDIS_URL : string
}


type dbConfiguration = { 
    HOST : string,
    USERNAME : string
    PASSWORD : string,
    NAME: string
}

function getPort(key : string) : number {
    if(!process.env[key]) throw new Error ;

    
    if(Number.isNaN(Number(process.env[key]) )) throw new Error 

    return Number(process.env[key]) 
}

function getString(key : string) : string {
    if(!process.env[key]) throw new Error ;

    return (process.env[key]) 
}


export const ServerConfig : serverConfiguration = {
    PORT : Number(getPort("PORT")),
    REDIS_URL : getString("REDIS_URL")
} 


export const dbConfig : dbConfiguration = {
    HOST : getString("DB_HOST"),
    USERNAME : getString("DB_USERNAME"),
    PASSWORD : getString("DB_PASSWORD"),
    NAME : getString("DB_NAME")
}


