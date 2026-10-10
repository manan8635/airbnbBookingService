import idempotencyKeyModel, { IdempotencyKeyEnum, responseObject } from "../db/models/idempotencyKey.model";

export const idempotencyRepo = async(key : string) => {


       
        // console.log(key) ;

    //  const result = await idempotencyKeyModel.findOne({
    //     where : {
    //         key : key 
    //     }
    //   })
    
     
//     if(result == null ){
        
//             try { 
//                     const IdempoEntry = await idempotencyKeyModel.create({
//                         key : key,
//                     }) ;
       
//                         return {
//                         response : IdempoEntry,
//                         success : true 
//                         }
//             }catch(err){

//                 if (err instanceof UniqueConstraintError) {

//                     const FinalResult = await idempotencyKeyModel.findOne({
//                                         where : {
//                                             key : key 
//                                         }
//                                     }) ;

//           if(FinalResult == null ) throw new Error("DB pagla gya h ab bhi null kaise de rha h ")
//             // because definitely DB me entry exist hi krti hogi tbhi yaha pe aake error pahucha h  .. 
                        

//                         // tho hm tho vhi return kr denge jo hm (pehle mil jati thi) tb kia krte the .. 
//                       return{
//                     response : FinalResult,
//                     success : false                                     
//                           }
//                 }
              
//             }
//     }else if (result != null ){

//             // console.log("Finally I am here too .. ")

//             // this means we are not able to do anything with the repo and there exist an entry alrready with this key.. 
//          return {
//             response : result,
//             success : false  
//             }
//     }
// }


// This approach was ok to solve but there is a cleaner approach solve exact same thing
// Because sequelize provide us something like findOrCreate

// How it works atomically is already pasted on our notes , Now let's just write the code .. 


    
             
            const [IdempoEntry , Success ] = await idempotencyKeyModel.findOrCreate({
                where: { key: key }
            })


            // Now if Success is true which mean entry doesn't already exists and NEW Entry Is Being Created ... 
 
            
             return {
                    response : IdempoEntry,
                    success : Success
                }
                // Either success will be true Or False(Entry Not being created and already existed .. )
       
    }

export const idempoIdChecker = (id : number)  => {


        const result = idempotencyKeyModel.findByPk(id) ;

        return result   
}

export const idempoKeyRepoEditFailure = async(key : string , respo : responseObject) => {

    await idempotencyKeyModel.update(

        {
            status : IdempotencyKeyEnum.FAILED,
            bookingId : null,
            response : respo
        },
        
        {
            where : {key : key}
        }
    )
    // now this result only returns a integer array telling kitni rows update hui , bas .. That's it .. 
    // so return result will just return [1] 
   // toh koi jrurt nhi h kuch return krne ki , main apne hisab se wha se , responseObject ko hi send krdunga .. 
}



export const idempoKeyRepoEditConfirmed = async(key : string , respo : responseObject , bookingId : number) => {

    await idempotencyKeyModel.update(

        {
            status : IdempotencyKeyEnum.CONFIRMED,
            bookingId : bookingId,
            response : respo
        },
        
        {
            where : {key : key}
        }
    )
 
          // now this result only returns a integer array telling kitni rows update hui , bas .. That's it .. 
            // so return result will just return [1] 
            // so we have to return apne hisab se hi toh hm udhr hi dekh lenge response object hi krlenge  .. 
}











  // 