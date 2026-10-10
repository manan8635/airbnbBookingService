import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import { sequelize } from "../../config/db.config";
class idempotencyKeyModel extends Model <InferAttributes<idempotencyKeyModel> , InferCreationAttributes<idempotencyKeyModel> >{


    // Now it is saying to 
    declare id : CreationOptional<number> 
    declare key : string
    declare bookingId : number|null
    declare status: CreationOptional<IdempotencyKeyEnum> // because iski default value le skte h ham ab  
        // that's why jruri nhi h server hame de , ham by default value daldenge
        // but uske liye isko creationOptional krna pdega vrna TS will give error ki ,give this value .. 
    declare response : responseObject|null
    declare createdAt: CreationOptional<Date>
    declare updatedAt: CreationOptional<Date>
}


export enum IdempotencyKeyEnum {

        PROCESSING = 'PROCESSING',
        CONFIRMED = 'CONFIRMED' ,
        FAILED =  'FAILED'
}
    
export type responseObject = {
    
    message : string ,
    statusCode : number,
    success : boolean
}

// Now we have defined the model till here . now time for it to do connect to the actual table in the db .. 



// i completely forgot how to write this
// idempotencyKey.init({
//     id : {
        
//     }
// },{
//     sequelize,
//     'idempotency-key'
// })

idempotencyKeyModel.init({

    id :{
        type : DataTypes.INTEGER,
       primaryKey : true,
       autoIncrement : true
    },
    key : {
        type : DataTypes.UUIDV4,
        allowNull  : false ,
        unique  : true,
     },
    bookingId : {
        allowNull : true ,
        type : DataTypes.INTEGER
    } ,
    status : {
        allowNull : true ,
        defaultValue: IdempotencyKeyEnum.PROCESSING,
        type : DataTypes.ENUM(...Object.values(IdempotencyKeyEnum))
    },
    response : {
        allowNull : true ,

        // this is not allowing to do  type : responseObject 

        // Because of a valid reason , This exists only in TypeScript. After TypeScript is compiled, this type doesn't exist at runtime.
        // But Model.init() runs at runtime and Sequelize needs to know:
        // "What actual MySQL datatype should I create?"

        // That's why mysql vaise bhi store that as JSON
        type : DataTypes.JSON
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue : DataTypes.NOW
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue : DataTypes.NOW
    }
},{
    sequelize,
    tableName : 'idempotencyKey'
})

export default idempotencyKeyModel  