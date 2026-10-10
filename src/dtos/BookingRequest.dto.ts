
export default interface BookingRequest {
    hotelId: number;
    totalGuests: number;
    // idempokey: UUIDTypes; Ye krne ki jrurt nhi h , idempoKey aati toh string hi h 
    // At TS level , any UUID is just a string .. 
    idempokey : string
        }
        