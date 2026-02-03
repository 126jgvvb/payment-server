/* eslint-disable prettier/prettier */
import { Injectable,HttpException,Logger, HttpStatus } from '@nestjs/common';
import { MongodbService } from './mongodb-service/mongodb-service.service';
//import { resolveSoa } from 'dns';
import * as https from 'https';
import { AxiosError } from 'axios';
import axios from 'axios';
import config from '../config/config';
import * as crypto from 'crypto';
import Oauth from 'oauth-1.0a';
import { OtpService } from './otp-service/otp2.service';

const globalObj = {phoneNumber:'',obj1:{},obj2:{}};

@Injectable()
export  class PesaService {
    private readonly consumerKey: string;
    private readonly consumerSecret: string;
    private readonly baseUrl: string;
    private readonly smsURL: string;
    private readonly paymentCallback: string;
    private readonly logger = new Logger(PesaService.name);
  //  private oauth: Oauth;

    constructor(
        private readonly database: MongodbService,
        private readonly smsService: OtpService
    ) {
        this.consumerKey = config.consumerKey;
        this.consumerSecret = config.consumerSecret;
        this.baseUrl = config.baseUrl;
        this.smsURL = config.smsUrl;
        this.paymentCallback=config.payment_callback;
        //https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest'--for live account

        /*
        this.oauth = new Oauth({
            consumer: { key: this.consumerKey, secret: this.consumerSecret },
            signature_method: 'HMAC-SHA1',
            hash_function(baseString, key) {
                return crypto.createHmac('sha1', key).update(baseString).digest('base64');
            }
        });*/
    }

 private async makeRequest(options: https.RequestOptions,postData?:string):Promise<any>{
    return new Promise((resolve,reject)=>{
try{
    this.logger.log('Making request with data:',postData);
        const req=https.request(options,(res)=>{
            let data='';

            res.on('data',(chunk)=>{
                data+=chunk;
                this.logger.log('Payment response recieved');
            })


            res.on('end',(res)=>{
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('response revieved: ' + data);
                    resolve(JSON.parse(data));
                }
                else {
                    console.log('Error: ' + res);
                    reject(new HttpException(data,res.statusCode));
                }
            });


            req.on('error',(error)=>{
                this.logger.log('Payment response failed');
                reject(new HttpException(error.message,500));
            });

            if(postData){
                req.write(postData);
            }

            req.end();

        });
        //here
}
catch (error) {
    console.log('Error occured while connecting to the given address');

    if(error.isAxiosError){
        const axiosError=error as AxiosError;
        if(axiosError.code==='ECONNABORTED'){
            throw new HttpException('Request timeout,please try again later',408);
        }
        else if(axiosError.message==='socket hang up'){
            throw new HttpException('Network,please try again later',503);
        }
        else{
            throw new HttpException(axiosError.message,axiosError.response?.status|| 500)
        }
    }
    else{
        throw new HttpException('An unexpected error occurred',500)
    }
    }
}
 )}
    
    //alternative to the above method
  private  async makePayment(url: any, paymentData: any,token:any): Promise<any>{
        try {
            const response = await axios.post(
                url,
                paymentData,
                { headers: { 'Content-Type': 'application/json',Authorization:`Bearer ${token}` } });

            return response.data;
        }
        catch(e){
            throw new HttpException(
                e.response?.data || 'payment initiation failed',
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    async getToken(): Promise<any> {
        console.log('retrieving token..' + config.consumerKey + ":" + config.consumerSecret);

       //  const authHeader=Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

        try {
            const response = await axios.post(
                `${this.baseUrl}/api/Auth/RequestToken`,{
                    consumer_key:config.consumerKey,
                    consumer_secret:config.consumerSecret
                },
                {
                    headers: {
                        //   'Authorization': `Basic ${authHeader}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
});

            return response.data;
        }
        catch (e) {
            throw new HttpException(
                e.response?.data || 'payment initiation failed',
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

   

   async registerIPN(token:any):Promise<any>{
    const url=`${this.baseUrl}/api/URLSetup/RegisterIPN`;

       console.log('Registering IPN...');
       
       try {
           const response = await axios.post(url,
               {
                   url: config.IPN_url,
                   ipnNotificationType: 'POST',
               },
               {
                   headers: {
                       'Content-Type': 'application/json',
                       'Accept': 'application/json',
                       'Authorization': `Bearer ${token}`
                   }
               });
           
           console.log('Registered IPN result: ' + JSON.stringify(response.data));
           return response.data.ipn_id;
       }
       catch (e) {
           console.log('Error while registering IPN url: ' + e);
           return false;
       }
       
        

}

    
    async getIPNs(token: any): Promise<any> {
        const url = `${this.baseUrl}/api/URLSetup/GetIpnList`;

        console.log('Getting IPN list...');
        try {
            const response = await axios.get(url,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

            console.log('Registered IPNs: ' + JSON.stringify(response.data));
            return response.data;
        }
        catch (e) {
            console.log('Error while retrieving IPN urls: ' + e);
            return false;
        }

    }
    
    //submit order request
    async initiateMobileMoneyPayment(paymentDetails:any,originalObj:any):Promise<any>{
        const token = this.getToken();

       return token.then(async(token) => {
           console.log('Token retrieval successfull..' + token.status);
           const isIPN_available =await this.getIPNs(token.token);
           let temp =null;

               if (isIPN_available.length > 0) {
                   console.log('IPNS found, iterating through...');
                   for (const ipn of isIPN_available) {
                       if (ipn.url == config.IPN_url) {
                           console.log('A match was found...proceeding...');
                           temp = ipn.ipn_id;
                       }
                   }
           }

         //  await this.registerIPN(token.token);
          
          if(temp==null) console.log('IPN matching the current one does not exist...proceeding');
           const ipn_registration_id = temp!=null ? temp : await this.registerIPN(token.token);
         
           if (ipn_registration_id != undefined || ipn_registration_id != null) {
               return processPayment(this.baseUrl,this,ipn_registration_id,token.token);
           }  
           else{
               console.log('Failed to process payment due to IPN registration issue..please review it');
               return false;
           }       
           });

                function processPayment(baseURL: string,obj: any, ipn_id: any,token: any): Promise < any > {
            const url = `${baseURL}/api/Transactions/SubmitOrderRequest`;

            console.log('initiating payment request...');
            paymentDetails={}

            paymentDetails['id'] = (new Date().toISOString());
            paymentDetails['redirect_mode'] = "";
            paymentDetails['notification_id'] = ipn_id;
            paymentDetails['billing_address'] = { 
                phone_number:originalObj.phoneNumber

             }
            paymentDetails['currency']='UGX';
            paymentDetails['amount']=originalObj.selectedPrice;
            paymentDetails['description']="A new payment initiation by a client";
            paymentDetails['callback_url']=obj.paymentCallback;


    //to save later in db
            globalObj.obj1 = paymentDetails;
            globalObj.obj2 = originalObj;
            globalObj.phoneNumber = originalObj.phoneNumber;

            const postData = JSON.stringify(paymentDetails);
                    console.log('--->' + postData);
                    
            return obj.makePayment(url, postData, token);
            //  return this.makeRequest(options,postData);
        }
        };
    
    private async getExpiryFromOrderID(obj: any) {
            const { message, sender, timestamp } = obj;
            let expiry=0;
            let paymentReference = null;
            let paymentAmount = null;
    
            console.log('recieved Data: ' + JSON.stringify(obj));
    
            if (message.includes('CASH DEPOSIT')) {
                paymentReference = message.match(/Reference: (\d+)/)[1];
                paymentAmount = message.match(/Amount: (\d+)/)[1];
    
                console.log(`New payment recieved from: ${sender} with reference: ${paymentReference}  with a due amount of: ${Number(paymentAmount)} at: ${timestamp}`);
            }
    
            //accepting only these payments
            if (Number(paymentAmount) != 1000 &&
                Number(paymentAmount) != 2500 &&
                Number(paymentAmount) != 5000 &&
                Number(paymentAmount) != 9000 &&
                Number(paymentAmount) != 18000
            ) {
                console.log('An Amount not in the specifications obtained!!!');
              return {sender,expiry};
            }
    
            //time in seconds
            switch (Number(paymentAmount)) {
                case 1000:
                    expiry = 8640 * 24  //8640s==24hrs==1 day
                    break;
    
                case 2500:
                    expiry = (8640 * (24 * 3)) //3 days
                    break;
    
                case 5000:
                    expiry = (8640 * (24 * 7))  //7 days
                    break;
    
                case 9000:
                    expiry = (8640 * (24 * 14))  //21 days
                    break;
    
                case 20000:
                    expiry = (8640 * (24 * 30))  //30 days
                    break;
            }
    
            console.log('Customer validity has been set to: ' + ((expiry / 8640) / 24) + ' day(s)');
            return {expiry:expiry,sender:sender};
        }





    async paymentConfirmation(transID: string): Promise<any>{
        console.log(`Confirming payment for order with id:${transID}`);

        const result = this.getPaymentStatus(transID);
        return result.then(async(result) => {

            const result2 = this.database.saveTransaction(result);
               return   result2.then(async (resultN: any) => {
                if (resultN != false) {
                    if (result.payment_status_description == 'COMPLETED') { 
                   const {sender,expiry}=await this.getExpiryFromOrderID(result);  //getting voucher expiry and its recipient
                        this.sendSMS(sender,expiry);  //proceeding to voucher creation and sedning
                }
                }
                else {
                    console.log('failed to save client into the database due to database error');
                    return false;
                }

           
            })
        })
    }

    async getPaymentStatus(transactionID: any): Promise<any> {
        const token = this.getToken();
      return  token.then(async(result) => {
            const url = `${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${transactionID}`;
            const response = await axios.get(url, { headers: { Authorization: `Bearer:${result.token}`,Accept:'application/json','Content-Type':'application/json' } });
            return response;//.data;
        });
    }



   private async sendSMS(to: string, expiry:number):Promise<any> {
        try {
            console.log('Sending sms to: ' + to);

            const accessGranted=this.getToken();
            accessGranted.then(async (result) => {
                if (result!= undefined) {
                    this.smsService.sendSmsVoucher(to,expiry);
                }
            })
        }
        catch (e) {
            console.log('Error: ' + e);
        }
    }

/*
    async sendSMSToAdmin(to: string, message: string): Promise<any> {
        try {
            const payload = {
                phone_number: to,
                message: message,
                consumer_key: this.consumerKey,
                consumer_secret: this.consumerSecret
            }

            console.log('Sending sms to admin ');

            const response = axios.post(this.smsURL, payload);
            return response.then((result) => {
             
            })

        }
        catch (e) {
            console.log('Error: ' + e);
        }
    }
*/

    async getAccessToken(): Promise<string> {
        const url = new URL(`${this.baseUrl}/api/Auth/RequestToken`);
        const authHeader = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
        console.log('+++++++++++:' + url);

        const options: https.RequestOptions = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            timeout: 30000,
            headers: {
                authorization: `Basic ${authHeader}`,
                'Content-Type': 'application/json',
            },
        };

        const response = await this.makeRequest(options);
        return response.token || false;
    }
}
