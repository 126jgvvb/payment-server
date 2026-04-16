import { Repository } from 'typeorm';
import { WalletEntity, WalletOwnerType } from '../entities/wallet.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class WalletRepository extends Repository<WalletEntity> {
  constructor(
    @InjectRepository(WalletEntity)
    private walletRepository: Repository<WalletEntity>,
  ) {
    super(
      walletRepository.target,
      walletRepository.manager,
      walletRepository.queryRunner,
    );
  }

  async findByUserId(userId: string): Promise<WalletEntity | null> {
    return this.walletRepository.findOne({ where: { userId, ownerType: WalletOwnerType.USER } });
  }

  async createWallet(userId: string, currency: string = 'UGX', initialBalance: number = 0, phone?: string): Promise<WalletEntity> {
    const wallet = this.walletRepository.create({
      userId,
      phone,
      currency,
      balance: initialBalance,
      ownerType: WalletOwnerType.USER,
    });
    return this.walletRepository.save(wallet);
  }

  async createGroupWallet(groupId: string, currency: string = 'UGX', initialBalance: number = 0): Promise<WalletEntity> {
    const wallet = this.walletRepository.create({
      groupId,
      currency,
      balance: initialBalance,
      ownerType: WalletOwnerType.GROUP,
    });
    return this.walletRepository.save(wallet);
  }

  async findByGroupId(groupId: string): Promise<WalletEntity | null> {
    return this.walletRepository.findOne({ where: { groupId, ownerType: WalletOwnerType.GROUP } });
  }

  async findByUserIdAndCurrency(userId: string, currency: string): Promise<WalletEntity | null> {
    return this.walletRepository.findOne({ 
      where: { 
        userId, 
        currency,
        ownerType: WalletOwnerType.USER,
      } 
    });
  }

  async findByPhone(phone: string): Promise<WalletEntity | null> {
    return this.walletRepository.findOne({ where: { phone, ownerType: WalletOwnerType.USER } });
  }
}
