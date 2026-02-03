/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import config from '../../config/config';


@Injectable()
export class NetworkService {
     MONGO_SERVER_URL = config.mongodb_server;
     MAIN_SERVER_URL=config.main_server_url;
    async sendPost(route: string, obj: any): Promise<any>{
        console.log('FULL URL:'+this.MONGO_SERVER_URL + route);

        try {
            return await axios.post(this.MONGO_SERVER_URL + route, obj)
                .then((result) => {
                    console.log(">>>>>", result.data);
                    return { data:result.data,status:result.status };
                })
                .catch((err) => {
                    return { status: 500,error:err }
                })
        }
        catch (e) {
            console.error(e);
        }
        
    }

    async sendGet(route: string, obj: any): Promise<any>{
        try {
            return await axios.post(this.MONGO_SERVER_URL + route, obj)
                .then((result) => {
                    console.log(">>>>>", result.data.data);
                    return { data: result.data, status: result.status };;
                })
                .catch((err) => {
                    return {status:500,error:err}
                });
        }
        catch (e) {
            console.log(e);
        }

    }

    async sendVoucherGet(route: string, obj: any): Promise<any>{
        try {
            return await axios.post(this.MAIN_SERVER_URL + route, obj)
                .then((result) => {
                    console.log(">>>>>", result.data.data);
                    return { data: result.data, status: result.status };;
                })
                .catch((err) => {
                    return {status:500,error:err}
                });
        }
        catch (e) {
            console.log(e);
        }

    }

    async sendDelete(route: string, obj: any): Promise<any> {
        try {
            return await axios.post(this.MONGO_SERVER_URL + route, obj)
                .then((result) => {
                    console.log(">>>>>", result.data.data);
                    return result.data.data;
                })
                .catch((err) => {
                    throw new Error(err);
                })
        }
        catch (e) {
            console.log(e);
        }
    }
 


}
