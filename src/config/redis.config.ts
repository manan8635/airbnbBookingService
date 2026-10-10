import IORedis from "ioredis"
import Redlock from "redlock"
import { ServerConfig } from "./index.config"

const redisClient = new IORedis(ServerConfig.REDIS_URL) 

// now we got our redis client

// now to implement locking mechanism
// we do want some of our implementations acc to you on Redlock thingy .. 

const redlock = new Redlock([redisClient] , {

    // here are some rules for how redis should behave.

    // mtlb kitna drift kr skte ho from time 
    driftFactor : 0.01 ,
    retryCount : 10 ,
    retryDelay : 200,
    retryJitter : 1000
})

export {redlock , redisClient} ;