import {Request, Response, NextFunction } from "express";
import {  idempoDBCallConfirmed, idempoDBCallFailure, idempoService } from "../service/idempotency.service";
import { hotelService } from "../service/hotel.service";
import { responseObject } from "../db/models/idempotencyKey.model";
import { bookingDataDTO } from "../dtos/bookingdata.dto";
import { bookingService, bookingServiceUpdate, findBookingById } from "../service/booking.service";
import { paymentService } from "../service/payment.booking.service";

export const bookingController = async (req : Request, res: Response , next : NextFunction) =>{
    // Now ye bookingController kaise work krega , 

    // Hm chahte h vo booking , pehle idempoDB me jake apna kaam kre,naaki yaha 
    // which means , It will go to idempoService for checking if idempoKey is already existing on idempoTable or not.. 
    // Yes , both BookingService and IdempoService will be using same DB , 
    // because we want to generate relationships between them and that can be done if both table are on same db .. 

    // SO let's make our idempoService call , 
    
    const IdempoResult = await idempoService(req.body.bookingData.idempokey)
     
    if(IdempoResult == undefined) throw new Error("Something went wrong..")

    // now idemporesult will get 2 things
    // 1 will be response and 1 will be success 
    // if success nahi h mtlb , already existed , mtlb we can directly send it's response .. 
    if(!IdempoResult.success){
        // we must return the response directly
        res.send(IdempoResult.response) 
    }

    // and if success ho gya toh time h ab usko aage handle krne ka .. 
    
    // so ab vo request body jo contain krti h , hotelId , totalGuests, idempoKey , and ab vo idempoKey bhi db me exist krti h 
    // so ab apna kaam h bas is hotelId ko apne db me save krana bookingservice k liye , 
    // and duplicacy ki ab koi tension nhi rhegi because hm ab same hi response bhejenge fro all the request rcvd
    // because ab idempodb me bookingID me ham Is bookingID ko jo ham bnane wale h attach krdenge and for faster access
    // ham response bhi attach kr hi rhe h , so booking dekhni h toh booking dekhlo , 
    // response dekhna h toh bhej hi dia h 
    
    else{
        
        const hotelResponse = await hotelService(req.body.bookingData) ;

        if(hotelResponse === undefined) throw new Error("Something Unusual went wrong")

            // If booking could not be created .. 
        if(!hotelResponse.success){


            const responseForIdempoDb : responseObject  ={
                message : hotelResponse.response,
                statusCode : 404,
                success : false 
            }

            const resultIdempoDB = await idempoDBCallFailure(req.body.bookingData.idempokey, responseForIdempoDb )
            // Now vaise tho is result ka koi use h nahi because main kaam tha ki us particular key k liye ye response store krana h 
            // That we did though , so we can use this resultIdempoDb for logging purpose if we want or we can just ignore it ..  

            res.status(404).json({
                message : hotelResponse.response
            })
        }

        //  Okk that was part for if booking was not success , But if booking is sucess tb bhi hame lgbhg yahi krna h u kbnow that .. 


            else{

                // now to create booking we will send um , our bookingData dto yr is baar ,

                const bookingData  : bookingDataDTO ={
                    hotelID :  req.body.bookingData.hotelId,
                    totalGuests : req.body.bookingData.totalGuests  ,
                    amount :  hotelResponse.response.amount
                }

                // now we will do ssend this bookingData to our bookingservice .. 
                const BookingRcvd = await bookingService(bookingData)
                // halaki ye bhi db call hi h , but isme hame transaction ki jrurt nhi h 
                // because isme tho ya toh data Booking table me fit ho jayega ya nahi ho payega , That's it ..


                // and BookingRcvd will also have bookingid for sure .. 
                    if(BookingRcvd.bookingId == null ) {
                                    // now yaah responseForIdempoDB me ham hotelResponse nahi bhejenge , we will send response rcvd from bookingService..Omkie
                                const responseForIdempoDbFailure : responseObject  ={
                                    message : "Booking could not be created , Server error"  ,
                                    statusCode : 500,
                                    success : false 
                                }

                                // and then ye response hame idempoKey wale db me bhejna pdega na ki ye booking toh failed hogyi h..
                            await idempoDBCallFailure(req.body.bookingData.idempokey, responseForIdempoDbFailure )
                                // ab ham idempoDB ko failure mark kr rhe h tho hame hamare booking ko bhi failed mark krna pdega 
                                // but ek second , booking toh hi nhi na 
                                // tbhi tho bookingID null h  , smjhe bandhu 

// toh yaha bhi transaction ki jrurt nhi h , because yaha agr bookingId = null aayi , tho IdempoKey me save ho jayega
// ek sec , what if bookingId= null aayi , tb crash ho jaye server, and IdempoKey update hi nhi ho
 // toh hme ye transaction me dalna pdega na ,

// but agr nahi bhi dale toh as such koi issue nhi h  , because idempoKey ko response nhi mila maan lia , toh kya hoga , ye idempoKey aise hi rh jayegi na yr
// so agr booking nhi bn paati h toh we need to make sure ki idempoKey bhi mark kre usko failed , because user toh request krega , tho vo toh PROCESSING me chl jayegi na
// aise toh infinite processing me jaati jaayengi saari idempoKeys and error kabhi pakdau aa hi nahi paayega .. 

// but transaction bhi is issue ko solve nhi kr skti na , because let suppose rollback hua , ki booking bhi nhi bni and then idempoDBCallFailure ko bhi call nhi gya
// tho jb call hi nhi gya tho vo toh bn payegi nahi IdempoKey - FAILED ..
// and booking bhi jo bni thi vo rollback ho gya , usse kya frk pdta h , idempoKey toh abhi bhi db me exist krti h na 

// so we need to do either of the thing i feel 
// either we shud do retries 2 or 3 times OR we shud just rollback and at the time of rollback we will send INTERNALSERVERERROR
// This looks like a plan to me 
                            res.status(500).json({
                                ...responseForIdempoDbFailure
                            })

                                // yaha pe hame kaise bhi krke bookingId bhejni pdegi and ek issue jrur aayega pta h tujhe
                                // bookingId =null wala , so usko m pehle hi hanbdle krlunga
                                //  if (bookingId == null ) throw new Error("Internal server error ") ;
                            
                    }

                    // now if bookingrcvd is not null , toh time h ab usko save krne ka..
                    // now we can do one thing , making payment service now.. 

                    const PaymentRequest = await paymentService(BookingRcvd.bookingId)
                

                        //Now this is very easy to implement , as same hi h bookingID jaisa ..
                        if(!PaymentRequest.success ){
                                    // agr payment success nahi hui toh dubara idempoKey failure lga do .. 

                                    const responseForPaymentFailure : responseObject  ={
                                            message : "Payment Not Recieved"  ,
                                            statusCode : 404,
                                            /*
                                                        But 404 means essentially resource not found.

                                                        Payment fail hua hai, hotel/booking resource missing nahi hai.

                                                        For your current simple architecture, something like 400/402/500 depends on what exactly payment service returns and why it failed.

                                                        So don't blindly use 404.

                                                        More importantly, distinguish:

                                                        Payment declined / insufficient funds
                                                                → business/payment failure

                                                        Payment service crashed / timeout
                                                                → server/service failure

                                                        We can decide exact status when we implement Payment Service properly.
                                         */
                                            success : false 
                                        }

                                        // yha pe hme set krna pdega booking ka status failed .. 


                                // and then ye response hame idempoKey wale db me bhejna pdega na ki ye booking toh failed hogyi h..
                                await idempoDBCallFailure(req.body.bookingData.idempokey, responseForPaymentFailure )
                                await bookingServiceUpdate(BookingRcvd.bookingId , false) ;   // just marking status as failed      
                                res.status(500).json({
                                        ...responseForPaymentFailure
                                    })
                        }
                        
                // now agr payment request success hogyi h toh time h us idempoKey se booking ko ab confirmed mark krne ka
                // because booking is now created successfully I feel .. 

                        const responseForIdempoDbSuccess : responseObject  ={
                                     message : "Booking created successfully"  ,
                                    statusCode : 200,
                                    success : true 
                                }
                            await idempoDBCallConfirmed(req.body.bookingData.idempokey, responseForIdempoDbSuccess , BookingRcvd.bookingId )

                                // and also
                                // bookingModel me booking ko bhi update krna hoga hame Pending to success .. 
                                

                                await bookingServiceUpdate(BookingRcvd.bookingId , true) ;// passing success : true 
                        }

    }
}


export const getBooking = async(req : Request, res: Response , next : NextFunction) => { 


    // now just send the req to aage .. 

    const booking = findBookingById(req.body.bookingId ) ;

    return booking ;
}   