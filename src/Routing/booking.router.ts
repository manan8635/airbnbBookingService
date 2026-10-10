import express from "express";
import { bookingIdValidator, bookingValidator } from "../utils/booking.validator";
import { bookingController, getBooking } from "../controllers/booking.controller";

const bookingRoute = express.Router() ;


bookingRoute.post('/booking' , bookingValidator , bookingController)
bookingRoute.get('/booking' , bookingIdValidator , getBooking)

export default bookingRoute
