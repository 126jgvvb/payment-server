import { Repository } from 'typeorm';
import { WalletEntity } from '../entities/wallet.entity';
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
    return this.walletRepository.findOne({ where: { userId } });
  }

  async createWallet(userId: string, currency: string = 'USD', initialBalance: number = 0, phone?: string): Promise<WalletEntity> {
    const wallet = this.walletRepository.create({
      userId,
      phone,
      currency,
      balance: initialBalance,
    });
    return this.walletRepository.save(wallet);
  }

  async findByUserIdAndCurrency(userId: string, currency: string): Promise<WalletEntity | null> {
    return this.walletRepository.findOne({ 
      where: { 
        userId, 
        currency 
      } 
    });
  }

  async findByPhone(phone: string): Promise<WalletEntity | null> {
    return this.walletRepository.findOne({ where: { phone } });
  }
}
