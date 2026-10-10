// isme bnengi apni Classes ..

export class AppError extends Error {

      statusCode : number


        constructor(message : string , statusCode : number ){
            super(message)

             this.statusCode = Number(statusCode)

            
        }
}

export class NotFoundErrorClass extends AppError { 

    

    constructor(message : string = "NOT FOUND"  ){ // iska mtlb hota h ya toh msg aa jaye toh vo pas krdena 
        // else agr msg na aaye toh message me NOT FOUND dal dena ... 


            super(message,404)

            // ek chhota sa dbt , maine toh yaha pe koi bhi status code naam ka variable is particular class me bnaya hi nahi
            // toh ye kaise 404 ko status code me dal bhi de rha h and then access ho ja rha h error middleware me
            // jab me is class ka object bna rha hu err : NotFoundErrorClass
            // toh how is err.statusCode giving me statusCode , 

            // because of extends , AppError class ki saari properties saari properties is class ko mil gyi h ..

        }
}

export class ZodErrorClass extends Error { 

    statusCode = 400
    errorOccured : any
    constructor(message : string = "Zod Validation Error Occured" , errorOcc : any  ){ 


            super(message)
            this.errorOccured = errorOcc
        }
}