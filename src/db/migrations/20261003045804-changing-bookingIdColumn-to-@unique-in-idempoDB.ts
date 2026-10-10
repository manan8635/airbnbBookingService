// import { DataTypes, DATE, QueryInterface } from "sequelize";

 
// module.exports = {
//   async up (queryInterface : QueryInterface) {
     

//     queryInterface.removeColumn('idempotencyKey' , 'bookingId')

//     queryInterface.addColumn('idempotencyKey' , 'bookingId' , {
//       type : DataTypes.INTEGER,
//       allowNull : true,
//       unique : true 
//     })
//   },

//   async down (queryInterface : QueryInterface) {

//     queryInterface.removeColumn('idempotencyKey' , 'bookingId')

//     queryInterface.addColumn('idempotencyKey' , 'bookingId' , {
//              type : DataTypes.INTEGER,
//              allowNull : true
//            }) 


//   }
// };
// THIS WAS VERY VERY UNSAFE APPROACH

// Because isse BookingId ka jo bhi purana data h vo delete ho jata h .. 
// isliye we have changecolumn for ths type of things .. 

import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  async up(queryInterface: QueryInterface) {
    await queryInterface.changeColumn("idempotencyKey", "bookingId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    });
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.changeColumn("idempotencyKey", "bookingId", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  },
};