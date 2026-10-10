
// we will recieve bookingId in this payment service and ye apna kaam kregi by 
// doing a fetch request to payment Microservice implemented
export const paymentService = (id : any) => {


    // const result = fetch()--
    // return result // jaise hotelId wala implement kia tha vaise hi bilkul isko bhi krenge

    return {
        ...paymentService,
        success : false
    }

}