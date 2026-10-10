import {Request, Response, NextFunction } from "express";
import { ZodErrorClass } from "../utils/errors/app.error";



export const errorHandler =  async (err : any ,req : Request, res: Response , next : NextFunction) => { 


        // yaha apne pas error aagya , toh ab usko just handle krna h ,. 
        // if isme toh koi status code nhi aay h which means it is just a server error 
        // so we will just send status code as 500 

        const statusCode = err.statusCode || 500 
        const message = err.message || "Internal server error" 

        if(err.errorOccured){
            // which means ye zod error ayi h , so isko ham apne hisab se bhejenge .. 
            res.status(statusCode).json({
            message : message,
            success : false ,
            errorOcc : err.errorOccured
        }); 
        return ;
        }

        console.log(message)

        res.status(statusCode).json({
            message : message,
            success : false 
        }); 
}
 
 