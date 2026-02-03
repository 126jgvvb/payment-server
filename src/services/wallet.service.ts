import { Injectable, NotFoundException } from '@nestjs/common';
import { WalletRepository } from '../repositories/wallet.repository';
import { WalletEntity } from '../entities/wallet.entity';

@Injectable()
export class WalletService {
  constructor(private readonly walletRepository: WalletRepository) {}

  /**
   * Creates a new wallet for a user
   * @param userId - UUID of the user
   * @param currency - Currency for the wallet (default: USD)
   * @param initialBalance - Initial balance for the wallet (default: 0)
   * @returns Promise<WalletEntity>
   */
  async createWallet(
    userId: string,
    currency: string = 'USD',
    initialBalance: number = 0,
    phone?: string,
  ): Promise<WalletEntity> {
    // Check if user already has a wallet with this currency
    const existingWallet = await this.walletRepository.findByUserIdAndCurrency(
      userId,
      currency,
    );

    if (existingWallet) {
      return existingWallet;
    }

    // Create new wallet
    const wallet = await this.walletRepository.createWallet(
      userId,
      currency,
      initialBalance,
      phone,
    );

    return wallet;
  }

  /**
   * Finds a wallet by user ID
   * @param userId - UUID of the user
   * @returns Promise<WalletEntity | null>
   */
  async findByUserId(userId: string): Promise<WalletEntity | null> {
    return this.walletRepository.findByUserId(userId);
  }

  /**
   * Finds a wallet by user ID and currency
   * @param userId - UUID of the user
   * @param currency - Currency code
   * @returns Promise<WalletEntity | null>
   */
  async findByUserIdAndCurrency(
    userId: string,
    currency: string,
  ): Promise<WalletEntity | null> {
    return this.walletRepository.findByUserIdAndCurrency(userId, currency);
  }

  /**
   * Finds a wallet by phone number
   * @param phone - Phone number
   * @returns Promise<WalletEntity | null>
   */
  async findByPhone(phone: string): Promise<WalletEntity | null> {
    return this.walletRepository.findByPhone(phone);
  }

  /**
   * Finds a wallet by ID
   * @param id - UUID of the wallet
   * @returns Promise<WalletEntity | null>
   */
  async findById(id: string): Promise<WalletEntity | null> {
    return this.walletRepository.findOne({ where: { id } });
  }

  /**
   * Updates wallet details
   * @param walletId - UUID of the wallet
   * @param updateData - Wallet fields to update
   * @returns Promise<WalletEntity>
   */
  async updateWallet(walletId: string, updateData: Partial<WalletEntity>): Promise<WalletEntity> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    // Update wallet with new data
    Object.assign(wallet, updateData);
    return this.walletRepository.save(wallet);
  }

  /**
   * Updates wallet balance
   * @param walletId - UUID of the wallet
   * @param amount - Amount to add (positive) or subtract (negative)
   * @returns Promise<WalletEntity>
   */
  async updateBalance(walletId: string, amount: number): Promise<WalletEntity> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    wallet.balance = Number(wallet.balance) + amount;
    return this.walletRepository.save(wallet);
  }
}
