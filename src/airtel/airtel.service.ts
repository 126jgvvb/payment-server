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
            'Content-Type': 'application/json',
            Accept: '*/*',
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
    phone: string;
    amount: number;
    reference: string;
    reSellerPhoneNumber?: string;
  }) {
    const token = await this.getAccessToken();

    // Store reSellerPhoneNumber in Redis cache with transaction reference as key
    if (dto.reSellerPhoneNumber) {
      await this.redis.set(`transaction:${dto.reference}:phone`, dto.reSellerPhoneNumber, 'EX', 86400); // 24 hour expiry
    }

    return firstValueFrom(
      this.http.post(
        `${process.env.AIRTEL_BASE_URL}/merchant/v1/payments/`,
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
          },
        },
      ),
    );
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
        `${process.env.AIRTEL_BASE_URL}/standard/v1/disbursements/`,
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
        `${process.env.AIRTEL_BASE_URL}/standard/v1/payments/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Country': process.env.AIRTEL_COUNTRY,
            'X-Currency': process.env.AIRTEL_CURRENCY,
          },
        },
      ),
    );
  }
}
