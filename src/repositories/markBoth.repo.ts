import { sequelize } from "../config/db.config"
import bookingModel, { BookingStatusEnum } from "../db/models/booking.model"
import idempotencyKeyModel, { IdempotencyKeyEnum, responseObject } from "../db/models/idempotencyKey.model"

// export const markAsConfirmed = async (key : string , respo : responseObject , bookingId : number ) =>{

 

//     // sbse pehle idempotencyKey Model ko update krde .. 
//                 await idempotencyKeyModel.update(

//                     {
//                         status : IdempotencyKeyEnum.CONFIRMED,
//                         bookingId : bookingId,
//                         response : respo
//                     },
                    
//                     {
//                         where : {key : key}
//                     }
//                 )
//     // AB booking Id ko update krde .. 

//                 await bookingModel.update(
//                     {
//                         status : BookingStatusEnum.SUCCESS
//                     },
//                     {
//                         where : {bookingId : bookingId}
//                     }
//                 )

                
//           // now this result only returns a integer array telling kitni rows update hui , bas .. That's it .. 
//             // so return result will just return [1] 
//             // so we have to return apne hisab se hi toh hm udhr hi dekh lenge response object hi krlenge  .. 
// }


export const markAsConfirmed = async (key : string , respo : responseObject , bookingId : any ) => {


    await sequelize.transaction(  async (t) => { 


        //sbse pehle idempotencyKey Model ko update krde .. 
                await idempotencyKeyModel.update(

                    {
                        status : IdempotencyKeyEnum.CONFIRMED,
                        bookingId : bookingId,
                        response : respo
                    },
                    
                    {
                        where : {key : key},
                        transaction : t // we have to pass transaction object ( Yes , t is an object - transaction object to be precise .. )
                    }
                )
        // ab booking Id ko update krde .. 

                await bookingModel.update(
                    {
                        status : BookingStatusEnum.SUCCESS
                    },
                    {
                        where : {bookingId : bookingId},
                        transaction : t
                    }
                )


    })
}

export const markAsFailed = async (key : string , respo : responseObject , bookingId : number ) =>{

    
        await sequelize.transaction(  async (t) => { 


    // sbse pehle idempotencyKey Model ko update krde .. 
                await idempotencyKeyModel.update(

                    {
                        status : IdempotencyKeyEnum.FAILED,
                        bookingId : bookingId,
                        response : respo
                    },
                    
                    {
                        where : {key : key},
                        transaction : t
                    }
                )
    // AB booking Id ko update krde .. 

                await bookingModel.update(
                    {
                        status : BookingStatusEnum.FAILED
                    },
                    {
                        where : {bookingId : bookingId},
                        transaction : t
                    }
                )

                 
            })

}
