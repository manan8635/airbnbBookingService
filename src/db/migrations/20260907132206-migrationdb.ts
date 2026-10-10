import { DataTypes, QueryInterface } from "sequelize";
import { BookingStatusEnum } from "../models/booking.model";

 module.exports = {
  async up (queryInterface :QueryInterface) {
    queryInterface.createTable('bookingData', {
       
           bookingId : {
              type : DataTypes.INTEGER,
              primaryKey : true,
              autoIncrement  : true,
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
    })
  },

  async down (queryInterface :QueryInterface) {
      queryInterface.dropTable('bookingData')
  }
};
