import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { MtnService } from './mtn/mtn.service';
import { WalletService } from 'src/services/wallet.service';

@Injectable()
export class AirtelService {
  private readonly logger = new Logger(AirtelService.name);
  private redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  private accessToken: string;
  private tokenExpiry: number;
  private readonly walletService: WalletService;

  constructor(
    private readonly http: HttpService,
    private readonly mtnService: MtnService,
  ) {}

  // 🔐 Token Management
  private async getAccessToken(): Promise<string> {
    // In-memory cache
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
  
    const body = new URLSearchParams({
      client_id: process.env.AIRTEL_CLIENT_ID!,
      client_secret: process.env.AIRTEL_CLIENT_SECRET!,
      grant_type: 'client_credentials',
    });
  
    const response = await firstValueFrom(
      this.http.post(
        `${process.env.AIRTEL_BASE_URL}/auth/oauth2/token`,
        body.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        },
      ),
    );
  
    const { access_token, expires_in } = response.data;
  
    this.accessToken = access_token;
    this.tokenExpiry = Date.now() + expires_in * 1000;
  
    // Redis cache (slightly shorter TTL for safety)
    await this.redis.set(
      'airtel_access_token',
      access_token,
      'EX',
      expires_in - 60,
    );
  
    return access_token;
  }

  //airtel->mtn fallback
  async collectFunds(dto: {
    phone: string;
    amount: number;
    reference: string;
    reSellerPhoneNumber?: string;
  }) {
    try {
      return await this.collectMoney(dto);
    } catch (e) {
      return this.mtnService.collect(dto);
    }
  }

  // 💰 COLLECTION
  async collectMoney(dto: {
    phoneNumber: string;
    selectedPrice: number;
    reference?: string;
    reSellerPhoneNumber: string;
  }) {
    
    await this.redis.set(`cached-voucher:`,'zero'); 
    const token = await this.getAccessToken();

    // Store reSellerPhoneNumber in Redis cache with transaction reference as key
    if (dto.reSellerPhoneNumber) {
      await this.redis.set(`transaction:${dto.reference}:phone`, dto.reSellerPhoneNumber, 'EX', 86400); // 24 hour expiry
    }

    const result1= firstValueFrom(
      this.http.post(
        `${process.env.AIRTEL_BASE_URL}/merchant/v2/payments/`,
        {
          reference: dto.reference,
          subscriber: {
            country: process.env.AIRTEL_COUNTRY,
            currency: process.env.AIRTEL_CURRENCY,
            msisdn: dto.phone,
          },
          transaction: {
            amount: dto.amount,
            country: process.env.AIRTEL_COUNTRY,
            currency: process.env.AIRTEL_CURRENCY,
            id: dto.reference,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Country': process.env.AIRTEL_COUNTRY,
            'X-Currency': process.env.AIRTEL_CURRENCY,
            'X-signature':'',
            'X-key':'',
            'Accept':'*/*'
          },
        },
      ),
    );

//waiting for a value to be dropped in cache
while(await this.redis.get(`cached-voucher`)=='zero'){
console.log('waiting for a vocuher...');
}

console.log('voucher obtained...continuing');
const result2=await this.redis.get('cached-voucher');
await this.redis.set(`cached-voucher`,'zero'); 

return {result:result1,code:result2};
  }

  // 💸 DISBURSEMENT
  async disburseMoney(dto: {
    phone: string;
    amount: number;
    reference: string;
  }) {

    const userWallet = await this.walletService.findByPhone(dto.phone);
    if (!userWallet) {
      throw new Error('User wallet not found');
    }

    const token = await this.getAccessToken();

    return firstValueFrom(
      this.http.post(
        `${process.env.AIRTEL_BASE_URL}/standard/v2/disbursements/`,
        {
          reference: dto.reference,
          payee: {
            msisdn: dto.phone,
          },
          transaction: {
            amount: dto.amount,
            country: process.env.AIRTEL_COUNTRY,
            currency: process.env.AIRTEL_CURRENCY,
            id: dto.reference,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Country': process.env.AIRTEL_COUNTRY,
            'X-Currency': process.env.AIRTEL_CURRENCY,
            "Content-Type":"application/json",
            "Accept":"*/*",
            'X-signature':'',
            'X-key':''
          },
        },
      ),
    );
  }

  // 🔍 STATUS CHECK
  async checkStatus(transactionId: string) {
    const token = await this.getAccessToken();

    return firstValueFrom(
      this.http.get(
        `${process.env.AIRTEL_BASE_URL}/standard/v2/payments/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Country': process.env.AIRTEL_COUNTRY,
            'X-Currency': process.env.AIRTEL_CURRENCY,
           'X-signature':'',
            'X-key':''
          },
        },
      ),
    );
  }



  // Method to retrieve all transactions
  public async getAllTransactions(params?: {
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const token = await this.getAccessToken();

    const response = await firstValueFrom(
      this.http.get(`${process.env.AIRTEL_BASE_URL}/merchant/v1/transactions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          limit: params?.limit || 100, // optional, depends on the API
          offset: params?.offset || 0,  // pagination if supported
        },
      }),
    );

    if (response.data && response.data.transactions) {
      return response.data.transactions;
    }

    return [];
  }
}
