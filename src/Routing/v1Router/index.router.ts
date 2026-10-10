import express from 'express' 
import bookingRoute from '../booking.router'
import { errorHandler } from '../../middlewares/error.middleware'
import { errorcheckingcontroller } from '../..'

const v1Router = express.Router()

v1Router.use(bookingRoute)

// v1Router.get('/' , errorcheckingcontroller) ; 

v1Router.use(errorHandler)
 export default v1Router