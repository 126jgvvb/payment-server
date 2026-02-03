import { Repository } from 'typeorm';
import { WithdrawalEntity, WithdrawalStatus } from '../entities/withdrawal.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class WithdrawalRepository extends Repository<WithdrawalEntity> {
  constructor(
    @InjectRepository(WithdrawalEntity)
    private withdrawalRepository: Repository<WithdrawalEntity>,
  ) {
    super(
      withdrawalRepository.target,
      withdrawalRepository.manager,
      withdrawalRepository.queryRunner,
    );
  }

  async findByUserId(userId: string): Promise<WithdrawalEntity[]> {
    return this.withdrawalRepository.find({ 
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  async findByStatus(status: WithdrawalStatus): Promise<WithdrawalEntity[]> {
    return this.withdrawalRepository.find({ 
      where: { status },
      order: { createdAt: 'DESC' }
    });
  }

  async createWithdrawal(
    userId: string,
    amount: number,
    destination: string,
    status: WithdrawalStatus = WithdrawalStatus.REQUESTED,
  ): Promise<WithdrawalEntity> {
    const withdrawal = this.withdrawalRepository.create({
      userId,
      amount,
      destination,
      status,
    });
    return this.withdrawalRepository.save(withdrawal);
  }
}
