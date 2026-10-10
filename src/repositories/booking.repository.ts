import bookingModel, { BookingStatusEnum } from "../db/models/booking.model";
import { updatedbookingDataDTO } from "../dtos/bookingdata.dto";

export const bookingRepo = async(bookingData : updatedbookingDataDTO) =>{


    // now it has do booking , okk ..
    // and for that , what we'll do is ,


    // now yaha pe booking create krne se pehle we was thinking to apply a redis lock ,, 
    const booking  = await bookingModel.create({
        hotelId : bookingData.hotelID,
        bookingAmount : bookingData.totalAmount,
        totalGuests:bookingData.totalGuests
    })
    // this will create the booking and return the booking instance 
    // now what if there exist already a booking with these things
    // this is not psbl , because we were handling this thing in idempKey thingy 
   
    // so we will just return booking from here 

    return booking
}

export const bookingRepoUpdateById = async (id : number, success : boolean) => {


        // here we have got the thingy 

        if(success)
            { await bookingModel.update(
                
                {
                    status : BookingStatusEnum.SUCCESS
                },
                {
                where : {
                    bookingId : id 
                }
                 }
            )}

            else{
                 await bookingModel.update(
                
                {
                    status : BookingStatusEnum.FAILED
                },
                {
                where : {
                    bookingId : id 
                }
                 }
                )
            }
}

export const bookingRepoIdFinder = async(id : number) => {


    const booking = await bookingModel.findByPk(id) ;

    if(booking == null) {
        throw new Error("Booking Not found") ;
    }

    return booking ;
}