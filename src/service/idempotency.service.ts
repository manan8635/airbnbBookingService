// what this have to do is not much , just rcv the idempotency key and just check that out
// if it existing in db or not .. 

import { success } from "zod";
import { idempoIdChecker, idempoKeyRepoEditConfirmed, idempoKeyRepoEditFailure, idempotencyRepo } from "../repositories/idempotency.repository";
import { responseObject } from "../db/models/idempotencyKey.model";


// um here key is number because validator k time hi maine usko number me daldia tha .. 
export const idempoService = async(key : string) => {

    // console.log(key) ;
    
    // now we have to check if key is existing on db or not , Okk ..
    // but before moving to repo layer we have to make the models and migrations for idempo key first na 
    // tbhi toh m Model se call kr paunga from repo layer , So let's move to models .. 
    

    // Ok I am now ready with my Models and migrations both .. 

    const IdempoResult = await idempotencyRepo(key) ;
   
    if(IdempoResult == undefined) throw new Error() // msg bhejne ki jrurt nhi h , apna custom error handler INTERNAL SERVER ERROR Likh deta h by default hi .. 
    // if(IdempoResult == undefined) next(new Error("Something went wrong.."))  // we can't do this  , because we don't have next function ka access here 
    // so gpt said industry practice k hisab se ham baaki layers me throw error hi krte h , and contrller layer m jo hamne try catch lga rkha h 
    // vo try catch saare thrown errors ko hmare custom error handler ke pass bhej deta h , because uske pas toh h next function ka access . 

    // No we will get 2 things in IdempoResult , ek toh respoonse and ek success T/F 

    // if success true which means me made a new booking and we shud return the instance of this booking for sure to our bookingController


    if(IdempoResult.success) {
        // which means we will be sending this result to our controller 
        // but abhi k liye i am just sending the result to make our process let run aaram se , without any issues
        return IdempoResult
    }

    // and if result is not success which means entry already existing there then only three cases will be there with status code ..

    if(!IdempoResult.success)
    {

        // this code need to be changed becasue now this things does not exist atleast result.response things .. 
        if (IdempoResult.response.status == 'PROCESSING') {

                // Removed sleeping logic as Per AI Instructions
                // Just do this up ,

                // Just return status

            return {
                response: {
                    message: "Request is being processed Shanti rkh na thodi",
                    retryAfter: 2
                },
                success: false
            };
        }


        if (IdempoResult.response.status == 'FAILED' || IdempoResult.response.status == 'CONFIRMED') {
            // which means we must assign the request to same failed thingy Or confirmed thingy , or we cna just send the failing response ..
            return {
                response : IdempoResult.response.response ,
                success : false 
            }
        }
    }


}

export const idempoDBCallFailure = async(key : string , respo : responseObject) => {

    const resultIdempoDBCall = idempoKeyRepoEditFailure(key,respo)
    return resultIdempoDBCall
}


export const idempoDBCallConfirmed = async(key : string , respo : responseObject , bookingId : number) => {

    const resultIdempoDBCall = idempoKeyRepoEditConfirmed(key,respo ,bookingId)
    return resultIdempoDBCall
}