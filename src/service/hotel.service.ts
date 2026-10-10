import BookingRequest from "../dtos/BookingRequest.dto";
import { NotFoundErrorClass } from "../utils/errors/app.error";
export const hotelService = async (data : BookingRequest) => {

    
    try{
        const response = await fetch(`http://localhost:7777/api/v1/hotel/getHotelByParam?id=${data.hotelId}`, {
                                    signal: AbortSignal.timeout(5000) // 5000ms = 5 seconds
                                });
                                // ye timeout hame isliye lgana pdta h , jisse agr hotel service down h toh fetch inifinitesimally try na krta rhe , 5 sec baad shanti lele, 
                                // ki nhi maamla gadbad h kuch .. 
        const result = await response.json() ;  


    // ok so we could have done this by making a diff service here but let's just go from here hi .. 
    if(!result.success){
          // which means we could not find the hotel
          // which means we shud mark current booking failed
          return {
            success : false,
            response : 'hotelID not found'
            // because iske alwa tho koi aur error aahi nhi skta
            // jo hotel bnd hone pe error aayega vo toh ham try catch se handle kr hi rhe h vaise bhi .. 
        }
    }

    // which means result is successfully rcvd in our result ..  
    else{
        // so ab hamare pas sb kuch avlbl h data pura to create a booking ..
        // actually now i changed this to hotel service , so ab usi k hisab se manage krenge  omkie.. 

        

        // So now it shud send only the data I was looking for ok ..
        return {
            ...result,
            success : true
        }
    }

    }

    catch(err){
        throw new NotFoundErrorClass("Hotel Not Found")
    }
     
} 