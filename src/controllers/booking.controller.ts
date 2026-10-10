import {Request, Response, NextFunction } from "express";
import {  idempoDBCallConfirmed, idempoDBCallFailure, idempoService } from "../service/idempotency.service";
import { hotelService } from "../service/hotel.service";
import { responseObject } from "../db/models/idempotencyKey.model";
import { bookingDataDTO } from "../dtos/bookingdata.dto";
import { bookingService, bookingServiceUpdate, findBookingById } from "../service/booking.service";
import { paymentService } from "../service/payment.booking.service";
import { markAsConfirmed, markAsFailed } from "../repositories/markBoth.repo";
import { AppError } from "../utils/errors/app.error";

export const bookingController = async (req : Request, res: Response , next : NextFunction) =>{
    

    try{
        const IdempoResult = await idempoService(req.body.bookingData.idempokey)

        if(IdempoResult == undefined) throw new Error("Something went wrong..")
            
            if(!IdempoResult.success){
                // we must return the response directly , because hamne all 3 cases ko handle krlia h that will occur in the case of success = false 
                res.send(IdempoResult.response) 
                return ;
            }

          res.send("yahatk toh pahuch chuka hu") ;
          return 
    
    }
    catch(err){
            next(err) ; 
    }
    
    // as per sep 25 , idempo ka idea is looking perfect for now , and well made , Now kuch naya idea krna hoga toh dekhte h ,
    // abhi tk toh , ek sng 2 req aana handle hogya h by the help of findOrCreate Atomic operation 
    // ruk ruk ke 10 req aana bhi handled hi h agr ek sng wala hi krdia , toh ruk ruk ke wala kaha hi issue krne wala tha khair .. 

    // so i guess it's done for idempoKey for now . It is na ? 


    
   
     // let's go for hotel handling now .. 
   
        
        let amount ; // ye m pura hotel response ka try catch likhne k baad aake bna rha hu , coz bad me hame amount chahiyega in booking dto .. 
     try{
            const hotelResponse = await hotelService(req.body.bookingData) ; // getting hotel ka response in try catch ab se .. 

            if(hotelResponse === undefined) throw new Error()

       

        // now db me kuch changes krne se pehle mera ek chhota sa dbt tho rhta hi rhta h .. 
        // what if yaha pe server crash hogya toh ? 

        // toh ham kya krenge aisa ki niche ki dono chije db me update honi chahiye thi but hui hi nahi .. 
        // vaise agr update nhi bhi hui y tho kya issue h itna bda ? 
        // no issues , because vaise bhi failed hone wali thi ,
        // ab expire hokr fail hona pdega bas ye issue h .. 

        // iske liye kuch transaction lgana mujhe toh smjh aa nhi rha h 
        // let suppose maine transaction lga bhi dia h ki hotel response find kro , if natak nahi hua h toh ye kro , and if success false hogya h tho update kro
        // if success true hogya h toh booking bnane jao 

        // this is not a very big problme I THINK to change of
        // because hotel nhi mila and server by any means crash hogya toh bhi koi issue nahi h agr idempodb me change nhi kr paye because vo toh 
        // vaise bhi anyhow expire ho hi jaani h 

        // and if hotelid me shi data aaya tha , toh , befaltu me ek user ko rukna hi pdega till expire nhi ho jati because of our side issue 
        // but shyd ye case nahi hona chahiye tha ki user ko hmari vjh se rukna pdeg
        // but ek sec server hi crash hogya h tho usme tho hm bhi kya hi kr skte the na 
        // agr success true aagyi hoti , tho booking k liye jaate hm , db me tho vaise bhi koi change nhi krte idempo ke
        // which means agr server yahi by chance crash ho jata toh success wala path bhi tho crash ho jata , booking toh tb bhi create nhi hoti .. 

        // has bas ye h ki dono cases me success false and true , inme se true wala toh server unexpected ki vjh se bnd hua h , tho isko ham kuch nhai kr skte the
        // but ha success false wale user ko befaltu me idempokey leke wait krrna pd jayega , because his idempoKey must have marked as false ... 

                    if(!hotelResponse.success){
                                                    const responseForIdempoDb : responseObject  ={
                                                        message : hotelResponse.response,
                                                        statusCode : 404,
                                                        success : false 
                                                    }

                                                await idempoDBCallFailure(req.body.bookingData.idempokey, responseForIdempoDb )
                                                
                                                    res.status(404).json({
                                                        message : hotelResponse.response
                                                    })

                                                    return ; // aage chl jayega wrna code agr ye line nhi likhi tho .. 
                            } 

        
                            amount = hotelResponse.response.amount ; 
                                
                        }catch(err){
                                
                                    
                                    next(err) ; // let error handler do the thing .. 
                                    
                                }
       





             // NOW HOTEL KI BHI SAARI HANDLING DONE IN MERI NAJAR TOH 
             // Let's move to booking thing now .. 


                const bookingData  : bookingDataDTO ={
                    hotelID :  req.body.bookingData.hotelId,
                    totalGuests : req.body.bookingData.totalGuests  ,
                    amount :  amount
                }

                 
                // yha bhi try catch chahiyega hi obviously .. ki booking bna di h na dhng se bhai , ya fir khi koi step pe error aagyi 


                let bookingId ;     

                try{

                    const BookingRcvd = await bookingService(bookingData)
                
                    // yha bhi transaction ki koi jrurt nhi h bcoz Booking abhi bni hi nhi h , toh no much problems ... 
                    if(BookingRcvd.bookingId == null ){

                                            const responseForIdempoDbFailure : responseObject  ={
                                                        message : "Booking could not be created , Server error"  ,
                                                        statusCode : 500,
                                                        success : false 
                                                    }

                                            await idempoDBCallFailure(req.body.bookingData.idempokey, responseForIdempoDbFailure )
                                            
                                                            
                                                        // res.status(500).json({
                                                        //     ...responseForIdempoDbFailure
                                                        // })
                                                        // return ; // to avoid code ko aage chlne se

                                            throw new AppError("BookingId is null" , 500) // internal server error , yahi fir response bhi bhej dega using error handler ,
                                            // hame ye code jo maine upr comment kia h , jo maine pehle likh rkha tha vo likhne ki jrurt hi nhi h .. 
                            }


                     else bookingId = BookingRcvd.bookingId  // now if booking id is not null  , tho get that na .. 
                    } 

                        

                catch(err){
                    next(err) ; // ye bas isliye likha h koi aur jgh se error aa rha ho toh handle krle 
                    // and jo hamne throw new AppError("BookingId is null" , 500) bheja h usko bhi directly yahi handle krlega and vo response bhej dega
                    // jo ham explicitly bhejne ka try kr rhe the .. 
                }
                
                
               


                // now payment toh ham alg krne wale the na for any issue  , bhul gya ab m kya issue tha vo , dekhta hu fir btata hu ... 
                 const PaymentRequest = await paymentService(bookingId)
                
                    // If payment fails , send to catch
                    if(!PaymentRequest.success ) throw new Error("Payment Failed")
                        
                
                        const responseForIdempoDbSuccess : responseObject  ={
                                    message : "Booking created successfully"  ,
                                    statusCode : 200,
                                    success : true 
                                }

                // update idempoDB and bookingService .. 
                // ek toh txn yaha lgegi ..  but jb txn lgate h toh vo repoLayer pe hi lg skti h kewal 
                // it can not be done on controller layer


                // already success true hi pass kr rha hu .. 
               const response =  await markAsConfirmed(req.body.bookingData.idempokey, responseForIdempoDbSuccess , bookingId) ;
            

                                res.status(200).json({
                                    response : response ,
                                    success : true 
                                })

                }
                
                
               
                   
 
   

export const getBooking = async(req : Request, res: Response , next : NextFunction) => { 


    // now just send the req to aage .. 

    const booking = findBookingById(req.body.bookingId ) ;

    return booking ;
}   