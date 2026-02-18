import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TransactionRepository } from '../repositories/transaction.repository';
import { LedgerRepository } from '../repositories/ledger.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { WebhookLogRepository } from '../repositories/webhook-log.repository';
import { UserRepository } from '../repositories/user.repository';
import { PlatformRevenueRepository } from '../repositories/platform-revenue.repository';
import { TransactionEntity } from '../entities/transaction.entity';
import { LedgerEntity } from '../entities/ledger.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { WithdrawalEntity } from '../entities/withdrawal.entity';
import { WebhookLogEntity } from '../entities/webhook-log.entity';
import { UserEntity } from '../entities/user.entity';
import { PlatformRevenue } from '../entities/platform-revenue.entity';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly walletRepository: WalletRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly withdrawalRepository: WithdrawalRepository,
    private readonly webhookLogRepository: WebhookLogRepository,
    private readonly userRepository: UserRepository,
    private readonly platformRevenueRepository: PlatformRevenueRepository,
  ) {}

  /**
   * Gets all dashboard data
   * @returns Promise<object>
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getDashboardData(): Promise<object> {
    const [
      transactions,
      ledgers,
      wallets,
      payments,
      withdrawals,
      webhookLogs,
    ] = await Promise.all([
      this.transactionRepository.find({
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.ledgerRepository.find({
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.walletRepository.find({
        order: { createdAt: 'DESC' },
      }),
      this.paymentRepository.find({
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.withdrawalRepository.find({
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.webhookLogRepository.find({
        order: { createdAt: 'DESC' },
        take: 50,
      }),
    ]);

    // Get user information for each wallet
    const activeWalletsWithUsers = await Promise.all(
      wallets.map(async (wallet) => {
        let user: UserEntity | null = null;
        
        // Try to find user by ID first
        try {
          user = await this.userRepository.findOne({ where: { id: wallet.userId } });
        } catch (error) {
          console.error('Error finding user by ID:', error);
        }
        
        // If not found, try to find user by phone number
        if (!user) {
          try {
            user = await this.userRepository.findOne({ where: { phoneNumber: wallet.userId } });
          } catch (error) {
            console.error('Error finding user by phone number:', error);
          }
        }
        
        // If still not found, try to find user by phone number from wallet
        if (!user && wallet.phone) {
          try {
            user = await this.userRepository.findOne({ where: { phoneNumber: wallet.phone } });
          } catch (error) {
            console.error('Error finding user by wallet phone:', error);
          }
        }

        return {
          wallet,
          user,
        };
      }),
    );

    // Calculate totals
    const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0);
    const totalTransactions = transactions.length;
    const totalPayments = payments.length;
    const totalWithdrawals = withdrawals.length;
    const pendingWebhooks = webhookLogs.filter(log => !log.processed).length;

    return {
      statistics: {
        totalBalance,
        totalTransactions,
        totalPayments,
        totalWithdrawals,
        pendingWebhooks,
      },
      recentTransactions: transactions,
      recentLedgers: ledgers,
      activeWallets: activeWalletsWithUsers,
      recentPayments: payments,
      recentWithdrawals: withdrawals,
      recentWebhookLogs: webhookLogs,
    };
  }

  /**
   * Gets recent transactions
   * @returns Promise<TransactionEntity[]>
   */
  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  async getRecentTransactions(): Promise<TransactionEntity[]> {
    return this.transactionRepository.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  /**
   * Gets wallet balances with user information
   * @returns Promise<{ wallet: WalletEntity; user: UserEntity | null }[]>
   */
  @Get('wallets')
  @HttpCode(HttpStatus.OK)
  async getWallets(): Promise<{ wallet: WalletEntity; user: UserEntity | null }[]> {
    const wallets = await this.walletRepository.find({
      order: { createdAt: 'DESC' },
    });

    const walletsWithUsers = await Promise.all(
      wallets.map(async (wallet) => {
        let user: UserEntity | null = null;
        
        // Try to find user by ID first
        try {
          user = await this.userRepository.findOne({ where: { id: wallet.userId } });
        } catch (error) {
          console.error('Error finding user by ID:', error);
        }
        
        // If not found, try to find user by phone number
        if (!user) {
          try {
            user = await this.userRepository.findOne({ where: { phoneNumber: wallet.userId } });
          } catch (error) {
            console.error('Error finding user by phone number:', error);
          }
        }
        
        // If still not found, try to find user by phone number from wallet
        if (!user && wallet.phone) {
          try {
            user = await this.userRepository.findOne({ where: { phoneNumber: wallet.phone } });
          } catch (error) {
            console.error('Error finding user by wallet phone:', error);
          }
        }

        return {
          wallet,
          user,
        };
      }),
    );

    return walletsWithUsers;
  }

  /**
   * Gets recent payments
   * @returns Promise<PaymentEntity[]>
   */
  @Get('payments')
  @HttpCode(HttpStatus.OK)
  async getRecentPayments(): Promise<PaymentEntity[]> {
    return this.paymentRepository.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  /**
   * Gets recent withdrawals
   * @returns Promise<WithdrawalEntity[]>
   */
  @Get('withdrawals')
  @HttpCode(HttpStatus.OK)
  async getRecentWithdrawals(): Promise<WithdrawalEntity[]> {
    return this.withdrawalRepository.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  /**
   * Gets webhook logs
   * @returns Promise<WebhookLogEntity[]>
   */
  @Get('webhook-logs')
  @HttpCode(HttpStatus.OK)
  async getWebhookLogs(): Promise<WebhookLogEntity[]> {
    return this.webhookLogRepository.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  /**
   * Gets platform revenue data
   * @returns Promise<object>
   */
  @Get('platform-revenue')
  @HttpCode(HttpStatus.OK)
  async getPlatformRevenue(): Promise<object> {
    const revenue = await this.platformRevenueRepository.getOrCreate();
    const currentRevenue = await this.platformRevenueRepository.getCurrentRevenue();
    
    return {
      currentRevenue,
      lastRevenue: revenue.lastRevenue,
      totalTransactions: revenue.totalTransactions,
      lastUpdated: revenue.lastUpdated,
      createdAt: revenue.createdAt,
    };
  }
}
