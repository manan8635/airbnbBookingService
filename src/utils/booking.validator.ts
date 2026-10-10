import { Request,Response,NextFunction } from "express"
import {z} from 'zod' 
import BookingRequest from "../dtos/BookingRequest.dto";
import { HostNotFoundError } from "sequelize";
import { ZodErrorClass } from "./errors/app.error";

        
// Maine ye format me isliye likha hu kyuki mujhe pta h request chhaiyega mujhe idhr
export const bookingValidator = (req : Request, res: Response , next : NextFunction) => {
    // body in req.body while headers in req.headers.idempokey 
    
    // here we have a small issue regarding our idempokey thingy 
    // because req.body is loosely typed in ts but in headers it needs to pass the checks 

    // so idempoKey can come undefined from our req.headers , that's why we need to handle it separately
    // because ts is warning me here to do so ..

     if (typeof req.headers.idempokey !== "string") {
            res.status(400).send("Invalid idempotency key");
            return;
            }

    const reqObject : BookingRequest = {
        hotelId : req.body.hotelId,
        totalGuests : req.body.totalGuests,
        idempokey : req.headers.idempokey // No , no issues here now after validation there.. 
    }    
    
    const BookingSchema = z.object({
        hotelId : z.number().positive(),
        totalGuests : z.number().positive().max(100),
        idempokey : z.string() // then yaha toh usko uuid hi hona pdega kewal string hone se kaam nhi chlega
        // because idempoKey ts ke hisab se tho string h but actually me tho vo uuid h ..
        
    })

   const result =  BookingSchema.safeParse(reqObject)

   
   if(result.success ){    
    // Now if request shi rcv hui h toh ek kaam kr request object me body ko hi edit krde because this is nearly lookalike js normal objects..
        req.body.bookingData = reqObject ;
        next() ;
        // Now it will send updated request object's body , not old body .. 
   }

   else {
    // console.log(result.error) ;

    // ok so ab ham yaha pe apni ZOD Error class bhi bna hi lete h fir  .. 
    next(new ZodErrorClass( "Validation failed" , result.error)) 
   }

   // okk ab m is error ko handle krne ka code likhu ya aage bhdu , let's go ahead to controller
   // jb error handling ki jrurt pdegi we will move to that again . Okk , right .. 
}






export const bookingIdValidator = (req : Request, res: Response , next : NextFunction) => {


    // i am supposing i am getting it in req.headers .. 

    const bookingId  = req.query.bookingId ;

     const BookingSchema = z.object({
             bookingId: z.coerce.number().positive().max(20).min(5)
    })

   const result = BookingSchema.safeParse(bookingId) ;


   if(result.success) {
    // update the body directly
    req.body = result.data ;
    next() ;
   }else{
    next(new ZodErrorClass("Invalid bookingId" , result.error)) 
        }
}