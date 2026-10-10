import { bookingDataDTO, updatedbookingDataDTO } from "../dtos/bookingdata.dto";
import { bookingRepo, bookingRepoIdFinder, bookingRepoUpdateById } from "../repositories/booking.repository";

export const bookingService = (bookingData : bookingDataDTO)=>{


    // now here ham bookingData ko thoda sa change krenge actually .. 
    const updatedbookingData : updatedbookingDataDTO = {
        ...bookingData,
        totalAmount : (bookingData.amount)*(bookingData.totalGuests)
    } 

    // and now we can send this data to get saved in our bookingRepo , but before that 
    // we need bookingModel and bookingMigrations too 
    // i wrote bookingModel toh and will write bookingMigrations later on .. 
    //let's first write repo layer and then we will come back here .. 

    const booking = bookingRepo(updatedbookingData) 
    return booking

}

export const bookingServiceUpdate = async(id : number, success : boolean) => {

     // we will get bookingID in it to update our db , ki ye bookingId is successFul or not ..
     await bookingRepoUpdateById(id,success)
     
}

export const findBookingById =  async(id : number) => {


    const booking = bookingRepoIdFinder(id) ;
    return booking ;
}