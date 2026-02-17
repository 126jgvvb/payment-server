import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { request } from 'undici';
import Redis from 'ioredis';

@Injectable()
export class IotecService {
  private readonly logger = new Logger(IotecService.name);
  private baseUrl = process.env.IOTEC_BASE_URL || 'https://pay.iotec.io/api';
  private clientId = process.env.IOTEC_CLIENT_ID || '';
  private clientSecret = process.env.IOTEC_CLIENT_SECRET || '';
  private walletId = process.env.IOTEC_WALLET_ID;
  private redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  private accessToken: string;
  private tokenExpiry: number;

  constructor(private readonly http: HttpService) {}

  /**
   * Get access token from IOTEC identity server
   * Uses client credentials flow with form-urlencoded
   */
  private async getAccessToken(): Promise<string> {
    // In-memory cache check
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Check Redis cache for existing token
    const cachedToken = await this.redis.get('iotec_access_token');
    if (cachedToken) {
      this.accessToken = cachedToken;
      // Set expiry to 1 minute from now (tokens are short-lived)
      this.tokenExpiry = Date.now() + 60 * 1000;
      return cachedToken;
    }
  
    // If no cached token, get new one from IOTEC identity server
    // Using form-urlencoded as required by the API
    const params = new URLSearchParams();
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);
    params.append('grant_type', 'client_credentials');

    const { statusCode, body } = await request('https://id.iotec.io/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const responseBody = await body.json() as any;

    if (statusCode >= 400) {
      this.logger.error(`Failed to get access token: ${JSON.stringify(responseBody)}`);
      throw new HttpException(
        responseBody || 'Failed to get access token',
        statusCode,
      );
    }
  
    const { access_token, expires_in } = responseBody;
  
    this.accessToken = access_token;
    this.tokenExpiry = Date.now() + expires_in * 1000;
  
    // Redis cache (slightly shorter TTL for safety)
    await this.redis.set(
      'iotec_access_token',
      access_token,
      'EX',
      expires_in - 30,
    );
  
    return access_token;
  }

  /**
   * Get headers with valid access token
   */
  private async getHeaders() {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Collect funds from client via IOTEC collections API
   * Uses undici for HTTP requests
   * Response structure includes: id, status, statusCode, statusMessage, transactions[], etc.
   */
  async collectClientFunds(data: {
    amount: number;
    payer: string;
    externalId: string;
    payerNote?: string;
    payeeNote?: string;
    currency?: string;
    category?: string;
    walletId:string;
    transactionChargesCategory?: string;
  }) {
    try {
      const reference = data.externalId || `collect-${Date.now()}`;
      
      // Store reference in Redis for tracking
      await this.redis.set(`transaction:${reference}:type`, 'collection', 'EX', 86400);
      await this.redis.set(`transaction:${reference}:payer`, data.payer, 'EX', 86400);
      await this.redis.set(`cached-voucher:`,'zero'); 

      const payload = {
        category: data.category || 'MobileMoney',
        currency: data.currency || 'ITX',
        walletId:this.walletId,
        externalId: data.externalId,
        payer: data.payer,
        payerNote: data.payerNote || 'Payment collection',
        amount: data.amount,
        payeeNote: data.payeeNote || '',
        channel: null,
        transactionChargesCategory: data.transactionChargesCategory || 'ChargeWallet',
      };

      // Get valid access token
      const headers = await this.getHeaders();

      const { statusCode, body } = await request('https://pay.iotec.io/api/collections/collect', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      const responseBody = await body.json() as any;

      if (statusCode >= 400) {
        this.logger.error(`Collection failed with status ${statusCode}: ${JSON.stringify(responseBody)}`);
        throw new HttpException(
          responseBody || 'Collection request failed',
          statusCode,
        );
      }

      // Cache the transaction result using the response structure
      // Response has: id, status, statusCode, statusMessage, transactions[], etc.
      const transactionId = responseBody?.id;
      if (transactionId) {
        await this.redis.set(
          `transaction:${transactionId}:status`,
          responseBody.status || 'Pending',
          'EX',
          86400,
        );
        await this.redis.set(
          `transaction:${transactionId}:reference`,
          reference,
          'EX',
          86400,
        );
        await this.redis.set(
          `transaction:${transactionId}:payer`,
          data.payer,
          'EX',
          86400,
        );
        // Cache additional useful fields from response
        if (responseBody.statusCode) {
          await this.redis.set(
            `transaction:${transactionId}:statusCode`,
            responseBody.statusCode,
            'EX',
            86400,
          );
        }
        if (responseBody.statusMessage) {
          await this.redis.set(
            `transaction:${transactionId}:statusMessage`,
            responseBody.statusMessage,
            'EX',
            86400,
          );
        }
      }

      this.logger.log(`Collection initiated: ${reference} from ${data.payer}, status: ${responseBody?.status}, statusCode: ${responseBody?.statusCode}`);

      // Waiting for a voucher value to be dropped in cache with proper polling
      const maxWaitTime = 60000; // 60 seconds max wait time
      const pollInterval = 2000; // 2 seconds between checks
      const startTime = Date.now();
      let voucherCode = await this.redis.get('cached-voucher');
      
      while (voucherCode === 'zero' && (Date.now() - startTime) < maxWaitTime) {
        console.log('waiting for a voucher...');
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        voucherCode = await this.redis.get('cached-voucher');
      }
      
      if (voucherCode === 'zero' || !voucherCode) {
        console.log('voucher wait timed out or no voucher available');
        voucherCode = null;
      } else {
        console.log('voucher obtained...continuing');
        voucherCode=await this.redis.get('cached-voucher');
        await this.redis.set(`cached-voucher`, 'zero');
      } 
      
      // Return comprehensive response matching IOTEC API structure
      return { 
        result: responseBody, 
        code: voucherCode,
        // Core transaction fields
        transactionId: responseBody?.id,
        status: responseBody?.status,
        statusCode: responseBody?.statusCode,
        statusMessage: responseBody?.statusMessage,
        // Transaction details
        amount: responseBody?.amount,
        currency: responseBody?.currency,
        externalId: responseBody?.externalId,
        category: responseBody?.category,
        paymentChannel: responseBody?.paymentChannel,
        // Payee/Payer info
        payee: responseBody?.payee,
        payeeName: responseBody?.payeeName,
        payeeUploadName: responseBody?.payeeUploadName,
        nameStatus: responseBody?.nameStatus,
        // Charges
        transactionCharge: responseBody?.transactionCharge,
        vendorCharge: responseBody?.vendorCharge,
        totalTransactionCharge: responseBody?.totalTransactionCharge,
        // Vendor info
        vendor: responseBody?.vendor,
        vendorTransactionId: responseBody?.vendorTransactionId,
        // Timestamps
        createdAt: responseBody?.createdAt,
        processedAt: responseBody?.processedAt,
        lastUpdated: responseBody?.lastUpdated,
        sendAt: responseBody?.sendAt,
        // Bank details (if applicable)
        bankId: responseBody?.bankId,
        bank: responseBody?.bank,
        bankTransferType: responseBody?.bankTransferType,
        // Approval info
        approvalDecision: responseBody?.approvalDecision,
        decisionMadeBy: responseBody?.decisionMadeBy,
        decisionMadeByData: responseBody?.decisionMadeByData,
        decisionMadeAt: responseBody?.decisionMadeAt,
        decisionRemarks: responseBody?.decisionRemarks,
        decisions: responseBody?.decisions,
        // Wallet info
        wallet: responseBody?.wallet,
        // Bulk processing
        bulkId: responseBody?.bulkId,
        internalRequestId: responseBody?.internalRequestId,
        // Transactions array
        transactions: responseBody?.transactions,
      };

    } catch (error) {
      this.logger.error(`Collection failed: ${error.message}`);
      throw new HttpException(
        error.response?.data || error.message || 'Collection failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Disburse funds to mobile money via IOTEC disbursements API
   * Uses undici for HTTP requests
   * Response structure includes: id, status, statusCode, statusMessage, transactions[], etc.
   */
  async walletToMobileMoney(data: {
    amount: number;
    phoneNumber: string;
    provider: 'MTN' | 'AIRTEL';
    reference: string;
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
    try {
      const externalId = data.externalId || data.reference || `momo-${Date.now()}`;
      
      // Store phone and reference in Redis for tracking
      await this.redis.set(`transaction:${externalId}:phone`, data.phoneNumber, 'EX', 86400);
      await this.redis.set(`transaction:${externalId}:type`, 'mobile-money', 'EX', 86400);
      await this.redis.set(`transaction:${externalId}:provider`, data.provider, 'EX', 86400);

      // Build the payload for the disbursements API
      const payload = {
        category: 'MobileMoney',
        currency: data.currency || 'ITX',
        walletId: this.walletId,
        externalId: externalId,
        payeeName: data.payeeName || 'Customer',
        payeeEmail: data.payeeEmail || null,
        payee: data.payee,
        amount: data.amount,
        payerNote: data.payerNote || '',
        payeeNote: data.payeeNote || '',
        channel: null,
        bankId: data.bankId || null,
        bankIdentificationCode: data.bankIdentificationCode || null,
        bankTransferType: data.bankTransferType || 'InternalTransfer',
        sendAt: data.sendAt || new Date().toISOString(),
      };

      // Get valid access token
      const headers = await this.getHeaders();

      const { statusCode, body } = await request('https://pay.iotec.io/api/disbursements/disburse', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      const responseBody = await body.json() as any;

      if (statusCode >= 400) {
        this.logger.error(`Disbursement failed with status ${statusCode}: ${JSON.stringify(responseBody)}`);
        throw new HttpException(
          responseBody || 'Disbursement request failed',
          statusCode,
        );
      }

      // Cache the transaction result using the response structure
      // Response has: id, status, statusCode, statusMessage, transactions[], etc.
      const transactionId = responseBody?.id;
      
      if (transactionId) {
        await this.redis.set(
          `transaction:${transactionId}:status`,
          responseBody.status || 'Pending',
          'EX',
          86400,
        );
        
        // Poll for transaction status until it's Success or Failed
        const maxAttempts = 10;
        const pollInterval = 3000; // 3 seconds
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          // Wait for 3 seconds before checking status (except for first attempt)
          if (attempt > 1) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          }
          
          const statusResult = await this.getTransactionStatus(transactionId);
          const currentStatus = statusResult?.status;
          
          this.logger.log(`Transaction ${transactionId} status check ${attempt}/${maxAttempts}: ${currentStatus}`);
          
          // Check if transaction is complete
          if (currentStatus === 'Success' || currentStatus === 'Failed' || currentStatus === 'Completed' || currentStatus === 'Rejected') {
            // Update the response body with final status from statusResult
            return {
              ...responseBody,
              ...statusResult,
              status: currentStatus,
            };
          }
          
          // If we've reached max attempts, return the last known status
          if (attempt === maxAttempts) {
            this.logger.warn(`Transaction ${transactionId} status polling timed out after ${maxAttempts} attempts`);
            return {
              ...responseBody,
              ...statusResult,
              status: currentStatus,
            };
          }
        }
      }
      
      return responseBody;
    } catch (error) {
      this.logger.error(`Mobile money disbursement failed: ${error.message}`);
      throw new HttpException(
        error.response?.data || error.message || 'Mobile money disbursement failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Approve or reject a disbursement via IOTEC API
   * Uses undici for HTTP requests
   * Response structure includes: id, status, statusCode, statusMessage, approvalDecision, etc.
   * Statuses: Pending, SentToVendor, Success, Failed, AwaitingApproval, RolledBack, Scheduled, Cancelled, Rejected
   */
  async approveOrRejectDisbursement(data: {
    disbursementId: string;
    decision: boolean;
    remarks?: string;
  }) {
    try {
      // Store disbursement ID in Redis for tracking
      await this.redis.set(`disbursement:${data.disbursementId}:type`, 'approval', 'EX', 86400);
      await this.redis.set(`disbursement:${data.disbursementId}:decision`, data.decision ? 'approved' : 'rejected', 'EX', 86400);

      const payload = {
        disbursementId: data.disbursementId,
        decision: data.decision,
        remarks: data.remarks || '',
      };

      // Get valid access token
      const headers = await this.getHeaders();

      const { statusCode, body } = await request('https://pay.iotec.io/api/disbursements/approve', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      const responseBody = await body.json() as any;

      if (statusCode >= 400) {
        this.logger.error(`Disbursement approval failed with status ${statusCode}: ${JSON.stringify(responseBody)}`);
        throw new HttpException(
          responseBody || 'Disbursement approval request failed',
          statusCode,
        );
      }

      // Cache the transaction result using the response structure
      const transactionId = responseBody?.id;
      if (transactionId) {
        await this.redis.set(
          `transaction:${transactionId}:status`,
          responseBody.status || 'Pending',
          'EX',
          86400,
        );
        await this.redis.set(
          `transaction:${transactionId}:statusCode`,
          responseBody.statusCode || '',
          'EX',
          86400,
        );
        if (responseBody.statusMessage) {
          await this.redis.set(
            `transaction:${transactionId}:statusMessage`,
            responseBody.statusMessage,
            'EX',
            86400,
          );
        }
        if (responseBody.vendorTransactionId) {
          await this.redis.set(
            `transaction:${transactionId}:vendorTransactionId`,
            responseBody.vendorTransactionId,
            'EX',
            86400,
          );
        }
        // Cache approval-specific fields
        if (responseBody.approvalDecision !== undefined) {
          await this.redis.set(
            `transaction:${transactionId}:approvalDecision`,
            String(responseBody.approvalDecision),
            'EX',
            86400,
          );
        }
        if (responseBody.decisionRemarks) {
          await this.redis.set(
            `transaction:${transactionId}:decisionRemarks`,
            responseBody.decisionRemarks,
            'EX',
            86400,
          );
        }
      }

      this.logger.log(`Disbursement ${data.disbursementId} ${data.decision ? 'approved' : 'rejected'}, status: ${responseBody?.status}, statusCode: ${responseBody?.statusCode}`);
      
      return {
        result: responseBody,
        // Include key fields from response for convenience
        transactionId: responseBody?.id,
        status: responseBody?.status,
        statusCode: responseBody?.statusCode,
        statusMessage: responseBody?.statusMessage,
        vendorTransactionId: responseBody?.vendorTransactionId,
        amount: responseBody?.amount,
        currency: responseBody?.currency,
        payee: responseBody?.payee,
        payeeName: responseBody?.payeeName,
        approvalDecision: responseBody?.approvalDecision,
        decisionMadeBy: responseBody?.decisionMadeBy,
        decisionMadeByData: responseBody?.decisionMadeByData,
        decisionMadeAt: responseBody?.decisionMadeAt,
        decisionRemarks: responseBody?.decisionRemarks,
        decisions: responseBody?.decisions,
      };
    } catch (error) {
      this.logger.error(`Disbursement approval failed: ${error.message}`);
      throw new HttpException(
        error.response?.data || error.message || 'Disbursement approval failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async walletToBank(data: {
    amount: number;
    accountNumber: string;
    bankCode: string;
    accountName: string;
    reference: string;
  }) {
    try {
      // Store reference in Redis for tracking
      await this.redis.set(`transaction:${data.reference}:type`, 'bank-transfer', 'EX', 86400);
      await this.redis.set(`transaction:${data.reference}:bank`, data.bankCode, 'EX', 86400);
      await this.redis.set(`transaction:${data.reference}:account`, data.accountNumber, 'EX', 86400);

      // Get valid access token
      const headers = await this.getHeaders();

      const response = await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/wallet/bank-transfer`,
          data,
          { headers: headers },
        ),
      );

      // Cache the transaction result
      if (response.data?.transactionId) {
        await this.redis.set(
          `transaction:${response.data.transactionId}:status`,
          response.data.status || 'PENDING',
          'EX',
          86400,
        );
        await this.redis.set(
          `transaction:${response.data.transactionId}:reference`,
          data.reference,
          'EX',
          86400,
        );
      }

      this.logger.log(`Bank transfer initiated: ${data.reference} to ${data.accountNumber}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Bank transfer failed: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Bank transfer failed',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTransactions() {
    try {
      // Check Redis cache first
      const cachedTransactions = await this.redis.get('iotec_transactions_cache');
      if (cachedTransactions) {
        this.logger.log('Returning cached transactions');
        return JSON.parse(cachedTransactions);
      }

      // Get valid access token
      const headers = await this.getHeaders();

      const response = await firstValueFrom(
        this.http.get(
          `${this.baseUrl}/transactions`,
          { headers: headers },
        ),
      );

      // Cache the transactions for 5 minutes
      await this.redis.set(
        'iotec_transactions_cache',
        JSON.stringify(response.data),
        'EX',
        300,
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch transactions: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to fetch transactions',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 🔍 STATUS CHECK - Check disbursement status via IOTEC API
  // Uses undici for HTTP requests
  // Response structure includes: id, status, statusCode, statusMessage, etc.
  async checkTransactionStatus(transactionId: string) {
    try {
      // Check Redis cache first
      const cachedStatus = await this.redis.get(`transaction:${transactionId}:status`);
      if (cachedStatus) {
        this.logger.log(`Returning cached status for transaction: ${transactionId}`);
        const cachedStatusCode = await this.redis.get(`transaction:${transactionId}:statusCode`);
        const cachedStatusMessage = await this.redis.get(`transaction:${transactionId}:statusMessage`);
        return { 
          transactionId, 
          status: cachedStatus, 
          statusCode: cachedStatusCode,
          statusMessage: cachedStatusMessage,
          cached: true 
        };
      }

      // Get valid access token
      const headers = await this.getHeaders();

      const { statusCode, body } = await request(`https://pay.iotec.io/api/disbursements/status/${transactionId}`, {
        method: 'GET',
        headers: headers,
      });

      const responseBody = await body.json() as any;

      if (statusCode >= 400) {
        this.logger.error(`Status check failed with status ${statusCode}: ${JSON.stringify(responseBody)}`);
        throw new HttpException(
          responseBody || 'Status check request failed',
          statusCode,
        );
      }

      // Update cache with latest status from response
      if (responseBody?.status) {
        await this.redis.set(
          `transaction:${transactionId}:status`,
          responseBody.status,
          'EX',
          86400,
        );
      }
      if (responseBody?.statusCode) {
        await this.redis.set(
          `transaction:${transactionId}:statusCode`,
          responseBody.statusCode,
          'EX',
          86400,
        );
      }
      if (responseBody?.statusMessage) {
        await this.redis.set(
          `transaction:${transactionId}:statusMessage`,
          responseBody.statusMessage,
          'EX',
          86400,
        );
      }
      if (responseBody?.vendorTransactionId) {
        await this.redis.set(
          `transaction:${transactionId}:vendorTransactionId`,
          responseBody.vendorTransactionId,
          'EX',
          86400,
        );
      }

      this.logger.log(`Status check for ${transactionId}: status=${responseBody?.status}, statusCode=${responseBody?.statusCode}`);

      return {
        result: responseBody,
        // Include key fields from response for convenience
        transactionId: responseBody?.id,
        status: responseBody?.status,
        statusCode: responseBody?.statusCode,
        statusMessage: responseBody?.statusMessage,
        vendorTransactionId: responseBody?.vendorTransactionId,
        amount: responseBody?.amount,
        currency: responseBody?.currency,
        payee: responseBody?.payee,
        payeeName: responseBody?.payeeName,
        category: responseBody?.category,
        paymentChannel: responseBody?.paymentChannel,
        externalId: responseBody?.externalId,
        approvalDecision: responseBody?.approvalDecision,
        decisionMadeBy: responseBody?.decisionMadeBy,
        decisionMadeAt: responseBody?.decisionMadeAt,
        decisionRemarks: responseBody?.decisionRemarks,
        processedAt: responseBody?.processedAt,
        lastUpdated: responseBody?.lastUpdated,
      };
    } catch (error) {
      this.logger.error(`Failed to check transaction status: ${error.message}`);
      throw new HttpException(
        error.response?.data || error.message || 'Failed to check transaction status',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Method to retrieve all transactions with pagination (similar to airtel.service.ts)
  public async getAllTransactions(params?: {
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      // Check Redis cache first
      const cacheKey = `iotec_all_transactions:${params?.limit || 100}:${params?.offset || 0}`;
      const cachedTransactions = await this.redis.get(cacheKey);
      if (cachedTransactions) {
        this.logger.log('Returning cached all transactions');
        return JSON.parse(cachedTransactions);
      }

      // Get valid access token
      const headers = await this.getHeaders();

      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/transactions`, {
          headers: headers,
          params: {
            limit: params?.limit || 100,
            offset: params?.offset || 0,
          },
        }),
      );

      if (response.data && response.data.transactions) {
        // Cache for 5 minutes
        await this.redis.set(
          cacheKey,
          JSON.stringify(response.data.transactions),
          'EX',
          300,
        );
        return response.data.transactions;
      }

      return [];
    } catch (error) {
      this.logger.error(`Failed to fetch all transactions: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all disbursements via IOTEC API
   * Uses undici for HTTP requests
   * Response is an array of disbursement objects with full details
   */
  async getAllDisbursements(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    category?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    try {
      // Check Redis cache first
      const cacheKey = `iotec_all_disbursements:${params?.limit || 100}:${params?.offset || 0}:${params?.status || 'all'}`;
      const cachedDisbursements = await this.redis.get(cacheKey);
      if (cachedDisbursements) {
        this.logger.log('Returning cached disbursements');
        return JSON.parse(cachedDisbursements);
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', String(params.limit));
      if (params?.offset) queryParams.append('offset', String(params.offset));
      if (params?.status) queryParams.append('status', params.status);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params?.toDate) queryParams.append('toDate', params.toDate);

      const queryString = queryParams.toString();
      const url = `https://pay.iotec.io/api/disbursements${queryString ? `?${queryString}` : ''}`;

      // Get valid access token
      const headers = await this.getHeaders();

      const { statusCode, body } = await request(url, {
        method: 'GET',
        headers: headers,
      });

      const responseBody = await body.json() as any[];

      if (statusCode >= 400) {
        this.logger.error(`Get all disbursements failed with status ${statusCode}: ${JSON.stringify(responseBody)}`);
        throw new HttpException(
          responseBody || 'Get all disbursements request failed',
          statusCode,
        );
      }

      // Cache for 5 minutes
      await this.redis.set(
        cacheKey,
        JSON.stringify(responseBody),
        'EX',
        300,
      );

      this.logger.log(`Retrieved ${Array.isArray(responseBody) ? responseBody.length : 0} disbursements`);
      
      return responseBody;
    } catch (error) {
      this.logger.error(`Failed to fetch all disbursements: ${error.message}`);
      throw new HttpException(
        error.response?.data || error.message || 'Failed to fetch all disbursements',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get transaction status by transactionId
   * Uses undici for HTTP requests
   * Returns full transaction details
   */
  async getTransactionStatus(transactionId: string) {
    try {
      // Get valid access token
      const headers = await this.getHeaders();

      const { statusCode, body } = await request(`https://pay.iotec.io/api/disbursements/status/${transactionId}`, {
        method: 'GET',
        headers: headers,
      });

      const responseBody = await body.json() as any;

      if (statusCode >= 400) {
        this.logger.error(`Get transaction status failed with status ${statusCode}: ${JSON.stringify(responseBody)}`);
        throw new HttpException(
          responseBody || 'Get transaction status request failed',
          statusCode,
        );
      }

      this.logger.log(`Retrieved transaction status for ${transactionId}: status=${responseBody?.status}`);
      
      return responseBody;
    } catch (error) {
      this.logger.error(`Failed to get transaction status: ${error.message}`);
      throw new HttpException(
        error.response?.data || error.message || 'Failed to get transaction status',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get wallet balance by walletId
   * Uses undici for HTTP requests
   * Returns wallet balance details
   */
  async getWalletBalance(walletId?: string) {
    try {
      const targetWalletId = walletId || this.walletId;
      
      // Get valid access token
      const headers = await this.getHeaders();

      const { statusCode, body } = await request(`https://pay.iotec.io/api/wallet-balance/${targetWalletId}`, {
        method: 'GET',
        headers: headers,
      });

      const responseBody = await body.json() as any;

      if (statusCode >= 400) {
        this.logger.error(`Get wallet balance failed with status ${statusCode}: ${JSON.stringify(responseBody)}`);
        throw new HttpException(
          responseBody || 'Get wallet balance request failed',
          statusCode,
        );
      }

      this.logger.log(`Retrieved wallet balance for ${targetWalletId}: balance=${responseBody?.actualBalance}`);
      
      return {
        currency: responseBody?.currency,
        id: responseBody?.id,
        name: responseBody?.name,
        actualBalance: responseBody?.actualBalance,
      };
    } catch (error) {
      this.logger.error(`Failed to get wallet balance: ${error.message}`);
      throw new HttpException(
        error.response?.data || error.message || 'Failed to get wallet balance',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cancel a pending disbursement
   * Uses undici for HTTP requests
   * Returns statusCode indicating success
   */
  async cancelPendingDisbursement(data: {
    disbursementId: string;
    decision: boolean;
    remarks?: string;
  }) {
    try {
      const payload = {
        disbursementId: data.disbursementId,
        decision: data.decision,
        remarks: data.remarks || '',
      };

      // Get valid access token
      const headers = await this.getHeaders();

      const { statusCode, body } = await request('https://pay.iotec.io/api/disbursements/cancel-payment', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      const responseBody = await body.json() as any;

      if (statusCode >= 400) {
        this.logger.error(`Cancel disbursement failed with status ${statusCode}: ${JSON.stringify(responseBody)}`);
        throw new HttpException(
          responseBody || 'Cancel disbursement request failed',
          statusCode,
        );
      }

      this.logger.log(`Cancelled disbursement ${data.disbursementId}, statusCode: ${responseBody?.statusCode}`);
      
      return {
        statusCode: responseBody?.statusCode,
        success: responseBody?.statusCode === 1,
      };
    } catch (error) {
      this.logger.error(`Failed to cancel disbursement: ${error.message}`);
      throw new HttpException(
        error.response?.data || error.message || 'Failed to cancel disbursement',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get paged disbursement request history
   * Uses undici for HTTP requests
   * Returns paginated disbursement history with full details
   */
  async getPagedRequestHistory(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    category?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    try {
      // Check Redis cache first
      const cacheKey = `iotec_paged_history:${params?.page || 1}:${params?.pageSize || 10}:${params?.status || 'all'}`;
      const cachedHistory = await this.redis.get(cacheKey);
      if (cachedHistory) {
        this.logger.log('Returning cached paged history');
        return JSON.parse(cachedHistory);
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', String(params.page));
      if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));
      if (params?.status) queryParams.append('status', params.status);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params?.toDate) queryParams.append('toDate', params.toDate);

      const queryString = queryParams.toString();
      const url = `https://pay.iotec.io/api/disbursements/paged-history${queryString ? `?${queryString}` : ''}`;

      // Get valid access token
      const headers = await this.getHeaders();

      const { statusCode, body } = await request(url, {
        method: 'GET',
        headers: headers,
      });

      const responseBody = await body.json() as any;

      if (statusCode >= 400) {
        this.logger.error(`Get paged history failed with status ${statusCode}: ${JSON.stringify(responseBody)}`);
        throw new HttpException(
          responseBody || 'Get paged history request failed',
          statusCode,
        );
      }

      // Cache for 5 minutes
      await this.redis.set(
        cacheKey,
        JSON.stringify(responseBody),
        'EX',
        300,
      );

      this.logger.log(`Retrieved paged history: page ${responseBody?.page} of ${responseBody?.totalPages}, total ${responseBody?.total} records`);
      
      return {
        page: responseBody?.page,
        totalPages: responseBody?.totalPages,
        total: responseBody?.total,
        data: responseBody?.data,
        hasPreviousPage: responseBody?.hasPreviousPage,
        hasNextPage: responseBody?.hasNextPage,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch paged history: ${error.message}`);
      throw new HttpException(
        error.response?.data || error.message || 'Failed to fetch paged history',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Helper method to get transaction metadata from Redis
  async getTransactionMetadata(transactionId: string): Promise<{
    phone?: string;
    type?: string;
    reference?: string;
    status?: string;
  }> {
    const [phone, type, reference, status] = await Promise.all([
      this.redis.get(`transaction:${transactionId}:phone`),
      this.redis.get(`transaction:${transactionId}:type`),
      this.redis.get(`transaction:${transactionId}:reference`),
      this.redis.get(`transaction:${transactionId}:status`),
    ]);

    return { 
      phone: phone ?? undefined, 
      type: type ?? undefined, 
      reference: reference ?? undefined, 
      status: status ?? undefined 
    };
  }
}
