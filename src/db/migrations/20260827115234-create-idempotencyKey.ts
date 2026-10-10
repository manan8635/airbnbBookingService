import { DataTypes,QueryInterface } from "sequelize";
import { IdempotencyKeyEnum } from "../models/idempotencyKey.model";
module.exports = {
  async up (queryInterface : QueryInterface) {
    
    // isme hame bnana h table ko .. 
    // so us table ka instance hame kahi store krna hota tha ya nahi ? 
    // nhi , vo bas createTable krne ka hoga , ha bas await jrur krdena usko .. 

    await queryInterface.createTable('idempotencyKey',{
      id : { 
        type : DataTypes.INTEGER,
        primaryKey : true,
        autoIncrement :true 
      },
      key : {
        primaryKey : true,
        type : DataTypes.UUID,  // But mujhe aaj bhi ek dbt h isme 
        // hame UUID kaise milegi yr .. 
        // default value hamne ye likhi h toh ye UUID konsi deti h isko .. 
       defaultValue: DataTypes.UUIDV4,
        unique : true
      },
      bookingId : {
        type : DataTypes.INTEGER,
        allowNull : true
      },
      status : {
         type : DataTypes.ENUM(...Object.values(IdempotencyKeyEnum)),
        allowNull : false 
      },
      response : {
        type : DataTypes.JSON,
        allowNull : true
      },
      createdAt : {
        type : DataTypes.DATE
      },
      updatedAt : {
        type : DataTypes.DATE
      }
    })
  },

  async down (queryInterface: QueryInterface) {
    queryInterface.dropTable('idempotencyKey')
  }
};
