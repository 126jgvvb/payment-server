import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ExternalApiService {
  private readonly baseUrl = 'https://twist2-production.up.railway.app';

  /**
   * Generates a single voucher from external server
   * @param durationInSeconds - Duration of the voucher in seconds
   * @returns Promise with generated voucher
   */
  async generateVoucher(durationInSeconds: number): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/session/generate-voucher`,
        {
          expiryTime: durationInSeconds,
        },
      );
      return response.data;
    } catch (error) {
      console.error('Error generating voucher:', error);
      throw error;
    }
  }

  /**
   * Generates bulk vouchers from external server
   * @param quantity - Number of vouchers to generate
   * @param duration - Duration of each voucher
   * @returns Promise with generated vouchers
   */
  async generateBulkVouchers(quantity: number, durationInSeconds: number): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/session/generate-bulk-vouchers`,
        {
          quantity,
          timeForEach: durationInSeconds,
        },
      );
      return response.data;
    } catch (error) {
      console.error('Error generating bulk vouchers:', error);
      throw error;
    }
  }

  /**
   * Gets all vouchers in memory from external server
   * @returns Promise with vouchers data
   */
  async getAllVouchersInMemory(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/session/get-all-vouchers-in-memory`);
      return response.data;
    } catch (error) {
      console.error('Error getting all vouchers in memory:', error);
      throw error;
    }
  }

  /**
    * Gets all routers from external server
    * @returns Promise with router data
    */
  async getRouters(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/admin/get-routers`);
      const responseData = response?.data?.data;
      return { 
        data: Array.isArray(responseData) ? responseData : [] 
      };
    } catch (error) {
      console.error('Error getting routers:', error);
      return { data: [] };
    }
  }

  /**
    * Gets current voucher codes from external server
    * @returns Promise with current voucher codes
    */
  async getCurrentVoucherCodes(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/session/get-all-vouchers-in-memory`);
      const responseData = response?.data?.data;
      return { 
        data: Array.isArray(responseData) ? responseData : [] 
      };
    } catch (error) {
      console.error('Error getting current voucher codes:', error);
      return { data: [] };
    }
  }

  /**
    * Gets routers for a specific client by phone number from external server
    * @param phoneNumber - Phone number of the client
    * @returns Promise with routers data
    */
  async getRoutersByPhoneNumber(phoneNumber: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/admin/get-routers`);

      console.log('Your result:',response.data.data.data);

      const responseData = response.data.data.data;
      const routers = Array.isArray(responseData) ? responseData.filter((router: any) => 
        router.holderNumber === phoneNumber
      ) : [];
      return { 
        data: routers 
      };
    } catch (error) {
      console.error('Error getting routers for phone number:', error);
      return { data: [] };
    }
  }
}
