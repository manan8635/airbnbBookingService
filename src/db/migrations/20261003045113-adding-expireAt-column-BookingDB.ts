import { DATE, QueryInterface } from "sequelize";

 
module.exports = {
  async up (queryInterface : QueryInterface) {
     
    queryInterface.addColumn('bookingData' , 'expiresAt' , {
      type : DATE,
      allowNull : false
    })
  },

  async down (queryInterface : QueryInterface) {
     queryInterface.removeColumn('bookingData' , 'expiresAt') 
  }
};
