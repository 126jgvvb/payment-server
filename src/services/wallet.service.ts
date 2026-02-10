import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    currency: string = 'UGX',
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

  /**
   * Deletes a wallet
   * @param walletId - UUID of the wallet to delete
   * @returns Promise<void>
   */
  async deleteWallet(walletId: string): Promise<void> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    await this.walletRepository.remove(wallet);
  }

  /**
   * Freezes a wallet
   * @param walletId - UUID of the wallet to freeze
   * @returns Promise<WalletEntity>
   */
  async freezeWallet(walletId: string): Promise<WalletEntity> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    wallet.isFrozen = true;
    return this.walletRepository.save(wallet);
  }

  /**
   * Unfreezes a wallet
   * @param walletId - UUID of the wallet to unfreeze
   * @returns Promise<WalletEntity>
   */
  async unfreezeWallet(walletId: string): Promise<WalletEntity> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    wallet.isFrozen = false;
    return this.walletRepository.save(wallet);
  }

  /**
   * Transfers funds between wallets
   * @param fromWalletId - UUID of the source wallet
   * @param toWalletId - UUID of the destination wallet
   * @param amount - Amount to transfer
   * @returns Promise<{ fromWallet: WalletEntity; toWallet: WalletEntity }>
   */
  async transferFunds(fromWalletId: string, toWalletId: string, amount: number): Promise<{ fromWallet: WalletEntity; toWallet: WalletEntity }> {
    if (fromWalletId === toWalletId) {
      throw new BadRequestException('Cannot transfer funds to the same wallet');
    }

    if (amount <= 0) {
      throw new BadRequestException('Transfer amount must be positive');
    }

    const [fromWallet, toWallet] = await Promise.all([
      this.walletRepository.findOne({ where: { id: fromWalletId } }),
      this.walletRepository.findOne({ where: { id: toWalletId } }),
    ]);

    if (!fromWallet) {
      throw new NotFoundException(`Source wallet with ID ${fromWalletId} not found`);
    }

    if (!toWallet) {
      throw new NotFoundException(`Destination wallet with ID ${toWalletId} not found`);
    }

    if (fromWallet.isFrozen) {
      throw new BadRequestException('Source wallet is frozen');
    }

    if (toWallet.isFrozen) {
      throw new BadRequestException('Destination wallet is frozen');
    }

    if (Number(fromWallet.balance) < amount) {
      throw new BadRequestException('Insufficient funds');
    }

    if (fromWallet.currency !== toWallet.currency) {
      throw new BadRequestException('Currencies must match');
    }

    // Perform the transfer
    fromWallet.balance = Number(fromWallet.balance) - amount;
    toWallet.balance = Number(toWallet.balance) + amount;

    const [updatedFromWallet, updatedToWallet] = await Promise.all([
      this.walletRepository.save(fromWallet),
      this.walletRepository.save(toWallet),
    ]);

    return { fromWallet: updatedFromWallet, toWallet: updatedToWallet };
  }
}
