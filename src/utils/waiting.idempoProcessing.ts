// const sleep = (ms : number) => new Promise(resolve => setTimeout(resolve, ms));

// async function waitForCompletion(jobId) {
//   while (true) {
//     const status = await checkJobStatus(jobId);

//     if (status === "completed") {
//       return true;
//     }

//     if (status === "failed") {
//       throw new Error("Job failed");
//     }

//     // Wait 5 seconds without blocking CPU
//     await sleep(5000);
//   }
// }

/*


 dekh vaise bhi we will recieve result.response toh usme id and key dono avlbl honge okk .. 
const waiter = (result :  resultRcvd)

*/


type resultRcvd = {
    id : number,
    key : string
}


export const sleeper = (timer : number , result :  resultRcvd) => {
           
    const waiter = async(result :  resultRcvd) => { 

            
            await sleeper (1000,result) ;

                }
}
