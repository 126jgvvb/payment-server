import {
  Controller,
  ForbiddenException,
  Headers,
  Post,
  Body,
  Req
} from '@nestjs/common';
import { OtpService } from 'src/services/otp-service/otp2.service';
import { PLATFORM_WALLET } from './airtel.queue';
import { LedgerService } from './ledger.service';
import * as crypto from 'crypto';
import { TransactionRepository } from '../repositories/transaction.repository';
import { TransactionEntity } from '../entities/transaction.entity';
import { WalletService } from '../services/wallet.service';
import Redis from 'ioredis';



@Controller('webhooks/airtel')
export class AirtelWebhookController {
  private readonly ledger: LedgerService;
  private readonly smsService: OtpService;
  private readonly transactionRepository: TransactionRepository;
  private readonly walletService: WalletService;
  private readonly redis: Redis;

  constructor(
    ledger: LedgerService, 
    smsService: OtpService,
    transactionRepository: TransactionRepository,
    walletService: WalletService,
  ) {
    this.ledger = ledger;
    this.smsService = smsService;
    this.transactionRepository = transactionRepository;
    this.walletService = walletService;
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }


  private verifySignature(rawBody: Buffer, signature: string): boolean {
    if (!signature || !rawBody) return false;
  
    const secret = process.env.AIRTEL_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('AIRTEL_WEBHOOK_SECRET not configured');
    }
  
    // Compute HMAC SHA256
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
  
    // Constant-time comparison (prevents timing attacks)
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(signature),
    );
  }

  @Post()
  async handle(
    @Body() payload: any,
    @Req() req: any,
    @Headers('x-signature') signature: string,
  ) {
    // ✅ Verify signature if provided
    // ✅ Idempotency check
    // ✅ Update transaction status in DB

    if (!this.verifySignature(req.rawBody, signature)) {
      throw new ForbiddenException();
    }

    // Check if transaction already exists (idempotency check)
    let transaction = await this.transactionRepository.findByReference(payload.transaction.id);
    
    if (!transaction) {
      // Create new transaction
      transaction = new TransactionEntity();
      transaction.reference = payload.transaction.id;
      transaction.phone = payload.phone;
      transaction.amount = payload.amount;
      transaction.currency = 'UGX';
      transaction.paymentMethod = 'airtel';
      transaction.status = payload.transaction.status;
      transaction.metadata = payload;
    } else {
      // Update existing transaction
      transaction.status = payload.transaction.status;
      transaction.metadata = payload;
    }

    await this.transactionRepository.save(transaction);

     if (payload.transaction.status === 'SUCCESSFUL') {
      // Retrieve phone number from Redis cache
      const phone = await this.redis.get(`transaction:${payload.transaction.id}:phone`);
      
      if (phone) {
       // const platform_wallet=await this.walletService.findByPhone(PLATFORM_WALLET);
      
       // Find wallet by phone number
        const userWallet = await this.walletService.findByPhone(phone);
        
        if (userWallet) {
          // Transfer funds to the user's wallet
          await this.ledger.transfer(
            PLATFORM_WALLET,
            userWallet.id,
            payload.amount,
            payload.transaction.id,
          );
        } else {
          console.log(`Wallet not found for phone number: ${phone}`);
          return;
        }
      } else {
        console.log(`Phone number not found in cache for transaction: ${payload.transaction.id}`);
        return;
      }

      const paymentAmount = payload.amount;
      let expiry = 0.0;

      //accepting only these payments
      if (
        Number(paymentAmount) != 1000 &&
        Number(paymentAmount) != 2500 &&
        Number(paymentAmount) != 5000 &&
        Number(paymentAmount) != 9000 &&
        Number(paymentAmount) != 18000
      ) {
        console.log('An Amount not in the specifications obtained!!!');
        return;
      }

      //time in seconds
      switch (Number(paymentAmount)) {
        case 1000:
          expiry = 8640 * 24; //8640s==24hrs==1 day
          break;

        case 2500:
          expiry = 8640 * (24 * 3); //3 days
          break;

        case 5000:
          expiry = 8640 * (24 * 7); //7 days
          break;

        case 9000:
          expiry = 8640 * (24 * 14); //21 days
          break;

        case 20000:
          expiry = 8640 * (24 * 30); //30 days
          break;
      }

      console.log(
        'Customer validity has been set to: ' + expiry / 8640 / 24 + ' day(s)',
      );
      this.smsService.sendSmsVoucher(payload.phone, expiry);
      return { status: 'ok' };
    }
  }
}
