import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import { sequelize } from "../../config/db.config";
class bookingModel extends Model <InferAttributes<bookingModel> , InferCreationAttributes<bookingModel> >{
    
    
   
    declare bookingId : CreationOptional<number>
    declare hotelId : number
    declare bookingAmount : number
    declare totalGuests : number
    declare status: CreationOptional<BookingStatusEnum> 
    declare createdAt: CreationOptional<Date>
    declare updatedAt: CreationOptional<Date>
}


export enum BookingStatusEnum {

        PENDING = 'PENDING',
        FAILED =  'FAILED',
        SUCCESS = 'SUCCESS' 
}

 

bookingModel.init({
    bookingId : {
        type : DataTypes.INTEGER,
        primaryKey : true,
        autoIncrement  : true,
        allowNull : true
     },
     hotelId : {
        type : DataTypes.INTEGER,
        allowNull : false ,
     },
    bookingAmount : {
        allowNull : false ,
        type : DataTypes.INTEGER
    } ,
    totalGuests : {
        allowNull : false ,
        type : DataTypes.INTEGER
    } ,
    status : {
       allowNull: true,
      defaultValue: BookingStatusEnum.PENDING,
        type : DataTypes.ENUM(...Object.values(BookingStatusEnum))
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
    tableName : 'bookingData'
})

export default bookingModel