import { Controller, HttpCode, UnauthorizedException, Req, Headers, Post, Body, Get, Logger, Param } from '@nestjs/common';
import { IotecService } from 'src/services/iotec.service';
import { WalletTransferDto } from 'src/dtos/ioTecWalletTransfer.dto';
import { MobileMoneyTransferDto } from 'src/dtos/mobile-money-transfer.dto';
import { BankTransferDto } from 'src/dtos/bank-transfer.dto';
import { IotecWebhookService } from 'src/services/iotec.webhook.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { TransactionEntity } from '../entities/transaction.entity';
import { WalletService } from '../services/wallet.service';
import { LedgerService } from '../airtel/ledger.service';
import { WithdrawalService } from '../services/withdrawal.service';
import { WithdrawalStatus } from '../entities/withdrawal.entity';
import { PLATFORM_WALLET } from '../airtel/airtel.queue';
import Redis from 'ioredis';
import { OtpService } from 'src/services/otp-service/otp2.service';

@Controller('iotec')
export class IotecController {
  private readonly logger = new Logger(IotecController.name);
  private readonly redis: Redis;
  private readonly transactionRepository: TransactionRepository;
  private readonly walletService: WalletService;
  private readonly ledger: LedgerService;
  private readonly withdrawalService: WithdrawalService;
  private readonly smsService:OtpService;
  private readonly userWallet:WalletService;

  constructor(
    private readonly iotecService: IotecService,
    private readonly webhookService: IotecWebhookService,
    transactionRepository: TransactionRepository,
    walletService: WalletService,
    ledger: LedgerService,
    withdrawalService: WithdrawalService,
    smsService: OtpService,
  ) {
    this.transactionRepository = transactionRepository;
    this.walletService = walletService;
    this.ledger = ledger;
    this.withdrawalService = withdrawalService;
    this.smsService = smsService;
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }


  @Post('collection/webhoook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request & { rawBody: string },
    @Headers('x-signature-header') signature: string,
    @Body() body: any,
  ) {
    this.logger.log(`Received webhook: ${JSON.stringify(body)}`);
    this.logger.log(`Received signature: ${signature}`);

    /* Idempotency check - prevent replay attacks
    if (await this.redis.get(`webhook:${body.id}`)) {
      throw new UnauthorizedException('Replay detected');
    }
    await this.redis.set(`webhook:${body.id}`, '1', 'EX', 600);
    */

    //Verify Signature
   // this.webhookService.verifySignature(req.rawBody, signature);

    console.log('proceeding to data processing....');

    // 2️ Process Event
 //   const eventType = body.event;
    const transactionId = body.id;
    const status = body.status;
    const amount = body.amount;
    const phone = body.payeeNote;
    const clientPhoneNumber=body.payer;
    const reference = body.reference;

    // Check if transaction already exists (idempotency check)
    let transaction = await this.transactionRepository.findByReference(transactionId);
    
    if (!transaction) {
      // Create new transaction
      transaction = new TransactionEntity();
      transaction.reference = transactionId;
      transaction.phone = phone;
      transaction.clientPhoneNumber=clientPhoneNumber;
      transaction.amount = amount;
      transaction.currency = body.data?.currency || 'UGX';
      transaction.paymentMethod = 'iotec';
      transaction.status = status;
      transaction.metadata = body;
    } else {
      // Update existing transaction
      transaction.status = status;
      transaction.metadata = body;
    }

    await this.transactionRepository.save(transaction);

    console.log('TXN status:',status);

    // Handle successful transaction
    if ( status === 'Success') {
      // Retrieve phone number from Redis cache
      const cachedPhone = await this.redis.get(`transaction:${transactionId}:phone`);
      const phoneToUse = phone || cachedPhone;
      
      if (phoneToUse) {
        // Find wallet by phone number
        const userWallet = await this.walletService.findByPhone(phoneToUse);
        
        if (userWallet) {
          const paymentAmount = body.amount;
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
    
          const valueObj=await this.smsService.sendSmsVoucher(clientPhoneNumber, expiry);
          
          await this.redis.set(`cached-voucher`, 'zero'); 
          await this.redis.set(`cached-voucher`,valueObj.code, 'EX', 30); 

          // Transfer funds to the user's wallet
          await this.ledger.transfer(
            PLATFORM_WALLET,
            userWallet.id,
            amount,
            transactionId,
          );

          
          this.logger.log(`Transferred ${amount} to wallet ${userWallet.id} for transaction ${transactionId}`);
        
          console.log('sms results:',valueObj);
          return { status: 'ok',smsResult:valueObj.smsResults,code:valueObj.code };
      
        } else {
          this.logger.warn(`Wallet not found for phone number: ${phoneToUse}`);
        }

      } else {
        this.logger.warn(`Phone number not found in cache for transaction: ${transactionId}`);
      } 
    }

    // Handle failed transaction
    if (status === 'Failed') {
      this.logger.warn(`Transaction ${transactionId} failed with status: ${status}`);
      // Additional failure handling logic can be added here
    }

    return { received: false };
  }


  @Post('disbursement/webhook')
  @HttpCode(200)
  async disbursementwebhook(
    @Req() req: Request & { rawBody: string },
    @Headers('x-signature-header') signature: string,
    @Body() body: any,
  ) {
    this.logger.log(`Received disbursement webhook: ${JSON.stringify(body)}`);

    // Idempotency check - prevent replay attacks
    const webhookId = body.id || body.data?.transactionId;
    if (webhookId && await this.redis.get(`disbursement_webhook:${webhookId}`)) {
      throw new UnauthorizedException('Replay detected');
    }
    if (webhookId) {
      await this.redis.set(`disbursement_webhook:${webhookId}`, '1', 'EX', 600);
    }

    // Verify Signature
    this.webhookService.verifySignature(req.rawBody, signature);

    // Extract disbursement details from webhook payload
    const eventType = body.event;
    const transactionId = body.data?.transactionId;
    const status = body.data?.status;
    const amount = body.data?.amount;
    const phone = body.data?.phone;
    const reference = body.data?.reference;
    const destination = body.data?.destination || body.data?.accountNumber || phone;
    const userId = body.data?.userId;

    // Create or update transaction record
    let transaction = await this.transactionRepository.findByReference(transactionId);
    
    if (!transaction) {
      transaction = new TransactionEntity();
      transaction.reference = transactionId;
      transaction.phone = phone;
      transaction.amount = amount;
      transaction.currency = body.data?.currency || 'UGX';
      transaction.paymentMethod = 'iotec-disbursement';
      transaction.status = status;
      transaction.metadata = body;
    } else {
      transaction.status = status;
      transaction.metadata = body;
    }

    await this.transactionRepository.save(transaction);

    // Map status to WithdrawalStatus
    const mapStatusToWithdrawalStatus = (webhookStatus: string): WithdrawalStatus => {
      switch (webhookStatus?.toUpperCase()) {
        case 'SUCCESSFUL':
        case 'COMPLETED':
          return WithdrawalStatus.PAID;
        case 'PENDING':
        case 'PROCESSING':
          return WithdrawalStatus.APPROVED;
        case 'FAILED':
        case 'REJECTED':
          return WithdrawalStatus.REJECTED;
        default:
          return WithdrawalStatus.REQUESTED;
      }
    };

    // Create or update withdrawal record
    if (userId && amount && destination) {
      const withdrawalStatus = mapStatusToWithdrawalStatus(status);
      
      // Check if withdrawal already exists for this transaction
      const existingWithdrawal = await this.withdrawalService.findById(transactionId);
      
      if (existingWithdrawal) {
        await this.withdrawalService.updateStatus(existingWithdrawal.id, withdrawalStatus);
        this.logger.log(`Updated withdrawal ${existingWithdrawal.id} status to ${withdrawalStatus}`);
      } else {
        const withdrawal = await this.withdrawalService.createWithdrawal(
          userId,
          amount,
          destination,
          withdrawalStatus,
        );
        this.logger.log(`Created withdrawal ${withdrawal.id} for user ${userId}`);
      }
    }

    // Handle successful disbursement
    if (eventType === 'disbursement.completed' || status === 'SUCCESSFUL') {
      this.logger.log(`Disbursement ${transactionId} completed successfully`);
      
      // Retrieve cached metadata
      const cachedUserId = await this.redis.get(`transaction:${transactionId}:userId`);
      const userWallet = cachedUserId ? await this.walletService.findByUserId(cachedUserId) : null;
      
      if (userWallet) {
        this.logger.log(`Disbursement of ${amount} to ${destination} completed for wallet ${userWallet.id}`);
      }
    }

    // Handle failed disbursement
    if (eventType === 'disbursement.failed' || status === 'FAILED') {
      this.logger.warn(`Disbursement ${transactionId} failed with status: ${status}`);
      
      // Optionally reverse the ledger entry if funds were already deducted
      const cachedUserId = await this.redis.get(`transaction:${transactionId}:userId`);
      if (cachedUserId) {
        this.logger.warn(`Disbursement failed for user ${cachedUserId}, amount: ${amount}`);
      }
    }

    return { received: true, transactionId, status };
  }


  /**
   * Collect funds from client via IOTEC collections API
   * Response structure includes: id, status, statusCode, statusMessage, transactions[], etc.
   */
  @Post('collect')
  async collectClientFunds(@Body() dto: {
    amount: number;
    payer: string;
    externalId?: string;
    payerNote?: string;
    payeeNote?: string;
    currency?: string;
    category?: string;
    walletId:string;
    transactionChargesCategory?: string;
  }) {
    const externalId = dto.externalId || `collect-${Date.now()}`;
    
    // Store reference in Redis for tracking
    await this.redis.set(`transaction:${externalId}:type`, 'collection', 'EX', 86400);
    await this.redis.set(`transaction:${externalId}:payer`, dto.payer, 'EX', 86400);
    
    const result = await this.iotecService.collectClientFunds({
      ...dto,
      externalId,
    });
    
    // Create transaction record using the comprehensive response structure
    const transaction = new TransactionEntity();
    transaction.reference = externalId;
    transaction.phone = dto.payer;
    transaction.amount = result.amount || dto.amount;
    transaction.currency = result.currency || dto.currency || 'UGX';
    transaction.paymentMethod = 'iotec-collection';
    transaction.status = result.status || 'Pending';
    transaction.metadata = { 
      ...dto, 
      result: result.result,
      // Core fields
      transactionId: result.transactionId,
      statusCode: result.statusCode,
      statusMessage: result.statusMessage,
      voucherCode: result.code,
      // Charges
      transactionCharge: result.transactionCharge,
      vendorCharge: result.vendorCharge,
      totalTransactionCharge: result.totalTransactionCharge,
      // Vendor info
      vendor: result.vendor,
      vendorTransactionId: result.vendorTransactionId,
      // Payee info
      payee: result.payee,
      payeeName: result.payeeName,
      payeeUploadName: result.payeeUploadName,
      nameStatus: result.nameStatus,
      // Timestamps
      createdAt: result.createdAt,
      processedAt: result.processedAt,
      lastUpdated: result.lastUpdated,
      sendAt: result.sendAt,
      // Bank details
      bankId: result.bankId,
      bank: result.bank,
      bankTransferType: result.bankTransferType,
      // Approval info
      approvalDecision: result.approvalDecision,
      decisionMadeBy: result.decisionMadeBy,
      decisionMadeByData: result.decisionMadeByData,
      decisionMadeAt: result.decisionMadeAt,
      decisionRemarks: result.decisionRemarks,
      decisions: result.decisions,
      // Wallet info
      wallet: result.wallet,
      // Bulk processing
      bulkId: result.bulkId,
      internalRequestId: result.internalRequestId,
      // Transactions array
      transactions: result.transactions,
    };
    await this.transactionRepository.save(transaction);
    
    return result;
  }

  //
  @Post('mobile-money')
  async mobileMoneyTransfer(@Body() dto: MobileMoneyTransferDto & {
    externalId?: string;
    payeeName?: string;
    payeeEmail?: string;
    payerNote?: string;
    payeeNote?: string;
    payee:string;
    currency?: string;
    bankId?: string;
    bankIdentificationCode?: string;
    bankTransferType?: string;
    sendAt?: string;
  }) {
    // Store phone and reference in Redis for tracking
    const reference = dto.reference || dto.externalId || `momo-${Date.now()}`;
    if (dto.phoneNumber) {
      await this.redis.set(`transaction:${reference}:phone`, dto.phoneNumber, 'EX', 86400);
    }
    await this.redis.set(`transaction:${reference}:type`, 'mobile-money', 'EX', 86400);
    
    const result = await this.iotecService.walletToMobileMoney({
      ...dto,
      reference,
    });
    
    // Create transaction record using the response structure
    // Statuses: Pending, SentToVendor, Success, Failed, AwaitingApproval, RolledBack, Scheduled, Cancelled, Rejected
    const transaction = new TransactionEntity();
    transaction.reference = reference;
    transaction.phone = dto.phoneNumber;
    transaction.amount = result.amount || dto.amount;
    transaction.currency = result.currency || dto.currency || 'UGX';
    transaction.paymentMethod = 'iotec';
    transaction.status = result.status || 'Pending';
    transaction.metadata = { 
      ...dto, 
      result: result.result,
      transactionId: result.transactionId,
      statusCode: result.statusCode,
      statusMessage: result.statusMessage,
      vendorTransactionId: result.vendorTransactionId,
      // Include approval info if auto-approved
      approvalDecision: result.approvalDecision,
      decisionRemarks: result.decisionRemarks,
    };
    await this.transactionRepository.save(transaction);
    
    this.logger.log(`Mobile money transfer saved: ${reference}, status: ${result.status}, transactionId: ${result.transactionId}`);
    
    return result;
  }

  @Post('bank-transfer')
  async bankTransfer(@Body() dto: BankTransferDto) {
    // Store reference in Redis for tracking
    const reference = dto.reference || `bank-${Date.now()}`;
    await this.redis.set(`transaction:${reference}:type`, 'bank-transfer', 'EX', 86400);
    
    const result = await this.iotecService.walletToBank(dto);
    
    // Create transaction record
    const transaction = new TransactionEntity();
    transaction.reference = reference;
    transaction.amount = dto.amount;
    transaction.currency = 'UGX';
    transaction.paymentMethod = 'iotec';
    transaction.status = 'PENDING';
    transaction.metadata = { ...dto, result };
    await this.transactionRepository.save(transaction);
    
    return result;
  }

  /**
   * Approve or reject a disbursement
   * Statuses: Pending, SentToVendor, Success, Failed, AwaitingApproval, RolledBack, Scheduled, Cancelled, Rejected
   */
  @Post('disbursement/approve')
  async approveDisbursement(@Body() dto: {
    disbursementId: string;
    decision: boolean;
    remarks?: string;
  }) {
    const result = await this.iotecService.approveOrRejectDisbursement(dto);
    
    // Create or update transaction record with approval result
    const transaction = new TransactionEntity();
    transaction.reference = dto.disbursementId;
    transaction.amount = result.amount;
    transaction.currency = result.currency || 'UGX';
    transaction.paymentMethod = 'iotec-disbursement';
    transaction.status = result.status || 'Pending';
    transaction.metadata = { 
      disbursementId: dto.disbursementId,
      decision: dto.decision,
      remarks: dto.remarks,
      result: result.result,
      transactionId: result.transactionId,
      statusCode: result.statusCode,
      statusMessage: result.statusMessage,
      vendorTransactionId: result.vendorTransactionId,
      approvalDecision: result.approvalDecision,
      decisionMadeBy: result.decisionMadeBy,
      decisionMadeAt: result.decisionMadeAt,
      decisionRemarks: result.decisionRemarks,
    };
    await this.transactionRepository.save(transaction);
    
    this.logger.log(`Disbursement ${dto.disbursementId} ${dto.decision ? 'approved' : 'rejected'}, status: ${result.status}`);
    
    return result;
  }

  /**
   * Get all disbursements with optional filtering
   */
  @Get('disbursements')
  async getAllDisbursements(@Body() params?: {
    limit?: number;
    offset?: number;
    status?: string;
    category?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const disbursements = await this.iotecService.getAllDisbursements(params);
    return disbursements;
  }

  /**
   * Get transaction status by transactionId
   */
  @Get('transaction/:transactionId/status')
  async getTransactionStatus(@Param('transactionId') transactionId: string) {
    const result = await this.iotecService.getTransactionStatus(transactionId);
    return result;
  }

  /**
   * Get wallet balance
   */
  @Get('wallet/balance')
  async getWalletBalance() {
    const result = await this.iotecService.getWalletBalance();
    return result;
  }

  /**
   * Get wallet balance by walletId
   */
  @Get('wallet/:walletId/balance')
  async getWalletBalanceById(@Param('walletId') walletId: string) {
    const result = await this.iotecService.getWalletBalance(walletId);
    return result;
  }

  /**
   * Cancel a pending disbursement
   */
  @Post('disbursement/cancel')
  async cancelDisbursement(@Body() dto: {
    disbursementId: string;
    decision: boolean;
    remarks?: string;
  }) {
    const result = await this.iotecService.cancelPendingDisbursement(dto);
    
    this.logger.log(`Disbursement ${dto.disbursementId} cancellation requested, success: ${result.success}`);
    
    return result;
  }

  /**
   * Get paged disbursement request history
   */
  @Get('disbursements/history')
  async getPagedRequestHistory(@Body() params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    category?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const history = await this.iotecService.getPagedRequestHistory(params);
    return history;
  }

  @Get('transactions')
  getTransactions() {
    return this.iotecService.getTransactions();
  }
}
