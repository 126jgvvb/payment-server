/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { JWTService } from '../jwt/jwt.service';
import { NetworkService } from '../network-service/network-service.service';
import { timeStamp } from 'console';



@Injectable()
export class MongodbService {
    constructor(
        private readonly network: NetworkService,
        private readonly jwt:JWTService
    ) { }
    private currentAdminID = '';
    
    async createAdmin(username: string,email: string, password: string,phoneNumber:string): Promise<any>{
        const adminObj = {
            username: username,
            password: password,
            email: email,
            phoneNumber:phoneNumber
        }
        
        const result = this.network.sendPost('/admin/create-admin', adminObj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
              //  throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            this.currentAdminID=(result.adminID);
            //creating admin state object---might be unecessary though
            this.setReduxObject(result.adminID);
            //creating an empty clients array
            this.setCurrentClients([]);
            return result;
        })
  
    }

    getAdminID() {
        return this.currentAdminID;
    }

    async loginAdmin(username: string, password: string): Promise<any> {
        const adminObj = { username: username, password: password }

        const result = this.network.sendPost('/admin/login-admin', adminObj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
                console.error(result.error);
                return false;
            }

            this.currentAdminID = (result.uniqueID);
            const jwtToken = this.jwt.createToken(result.uniqueID);
            result.data.data['token'] = jwtToken;  //adding this field too
            return result;
        })

    }

    async confirmAdminFromJWT(token: string): Promise<any>{
        const jwt_result = this.jwt.verifyToken(token);
       // console.log(jwt_result);
        if (jwt_result == false) {
            return false;
        }
            else {
            console.log('Token authentication successfull...');
            return jwt_result;
        }

    }




    async logoutAdmin(id: string): Promise<any> {
        const adminObj = { id }

        const result = this.network.sendPost('/admin/logout-admin', adminObj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
              //  throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })
   
    }

    async saveTransaction(obj:any): Promise<any> {

        const result = this.network.sendPost('/admin/save-transaction', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
                //  throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })

    }

    async deleteAdmin(id: string): Promise<any>{
        const obj={id}

        const result = this.network.sendDelete('/admin/delete-admin', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
              //  throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })
   
    }


    async getAdminByID(id: string): Promise<any> {
        const obj = { id }

        const result = this.network.sendGet('/admin/get-admin-by-id', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
            //    throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result; 
        })

    }


    async getAdminByEmail(email: string): Promise<any> {
        const obj = { email }

        const result = this.network.sendGet('/admin/get-admin-by-email', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
               // throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })
    
    }


    async getLastLogin(id: string): Promise<any> {
        const obj = { id }

        const result = this.network.sendGet('/admin/get-last-login', obj);
     return   result.then((result) => {
         if (result.status !== 200 && result.status !== 403) {
           //  throw new Error(result.error);
             console.error(result.error);
             return false;
            }

           // console.log('****', data);
            return result;
            })

      
    }


    async getAdminByName(username: string): Promise<any> {
        const obj = { username }

        const result = this.network.sendGet('/admin/get-admin-by-name', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
              //  throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })

    }


    async changeAdminPassword(email:string,newPassword:string): Promise<any> {
        const adminObj = { email: email, newPassword: newPassword };

        const result = this.network.sendPost('/admin/change-password', adminObj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
           //     throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })

    }

    //-----------------state methods------------------------------
    async getReduxObject(adminID: string) {
        const obj = { adminID }

        const result = this.network.sendGet('/admin/get-redux', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
             //   throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })

    }


    async getPhoneNumbers(adminID: string) {
        const obj = { adminID }

        const result = this.network.sendGet('/admin/get-phone-numbers', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
             //   throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })

    }

    async removePhoneNumber(adminID: string, number: string): Promise<any> {
        const adminObj = { adminID: adminID, number: number };

        try {
            const result = this.network.sendPost('/admin/remove-phone-number', adminObj);
            return result.then((result) => {
                if (result.status !== 200 && result.status !== 403) {
                //    throw new Error(result.error);
                    console.error(result.error);
                    return false;
                }

                return result;
            })
        }
        catch (e) {
            console.error(e);
        }

    }


    async getMerchantCode(adminID: string) {
        const obj = { adminID }

        const result = this.network.sendGet('/admin/get-merchant-code', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
            //    throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })

    }

    async removeMerchantCode(adminID: string, merchantCode: string): Promise<any> {
        const adminObj = { adminID: adminID, merchantCode:merchantCode };

        const result = this.network.sendPost('/admin/remove-merchant-code', adminObj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
              //  throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })

    }

    async getPackages(adminID: string) {
        const obj = { adminID }

        const result = this.network.sendGet('/admin/get-packages', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
            //    throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })

    }

    async removePackage(adminID: string, packageX: string): Promise<any> {
        const adminObj = { adminID: adminID, packageX:packageX };

        const result = this.network.sendPost('/admin/remove-package', adminObj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
              //  throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })

    }

    //------set methods--------------
    async setPhoneNumber(newNumber: string, adminID: string) {
        const obj = { newNumber:newNumber , adminID:adminID };

        const result = this.network.sendPost('/admin/add-phone-number', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
             //   throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })
    }


    async setMerchantCode(newMerchantCode: string, adminID: string) {
        const obj = { newMerchantCode:newMerchantCode, adminID:adminID };

        const result = this.network.sendPost('/admin/set-merchant-code', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
             //   throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })
    }


    async setPackage(newPackage: string,price:string,adminID: string) {
        const obj = { newPackage: newPackage,price:price, adminID:adminID };

        const result = this.network.sendPost('/admin/set-package', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
               // throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })
    }


    //this method is called as soon as the admin is created
   private async setReduxObject(adminID: string) {
        const obj = { adminID }

        const result = this.network.sendGet('/admin/set-redux', obj);
        return result.then((result) => {
            if (!result) {
                throw new Error(result.error);
                return false;
            }

            return result;
        })

    }


    //----------------------clients array----------------
     async setCurrentClients(clientsArray: any) {
        const obj = { newArray:clientsArray,adminID:this.currentAdminID }

        const result = this.network.sendPost('/admin/set-current-clients-array', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
             //   throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result;
        })

    }

    async setNewClient(client: any) {
        const obj = {newClient: client};

        const result = this.network.sendPost('/admin/add-client', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
                //   throw new Error(result.error);
                console.log("Problem: " + result.status);
                console.error(result.error);
                return {state:false};
            }

            console.log('client saved successfully.......');
            result.state=true;
            return result;
        })

    }

    


     async getCurrentClients() {
         const obj = { adminID: 'XFMRBEJZCN'};
         
         try{
        const result = this.network.sendGet('/admin/get-all-clients', obj);
        return result.then((result) => {
            if (result.status !== 200 && result.status !== 403) {
              //  throw new Error(result.error);
                console.error(result.error);
                return false;
            }

            return result.data.data;
        });
    }
    catch(e){
        console.error('client error in mongodb service...',e);
        return false;
    }

    }

}

