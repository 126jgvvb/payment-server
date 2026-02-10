import { Injectable, NotFoundException } from '@nestjs/common';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { WithdrawalEntity, WithdrawalStatus } from '../entities/withdrawal.entity';

@Injectable()
export class WithdrawalService {
  constructor(private readonly withdrawalRepository: WithdrawalRepository) {}

  /**
   * Creates a new withdrawal
   * @param userId - User ID
   * @param amount - Withdrawal amount
   * @param destination - Destination address
   * @param status - Withdrawal status (default: REQUESTED)
   * @returns Promise<WithdrawalEntity>
   */
  async createWithdrawal(
    userId: string,
    amount: number,
    destination: string,
    status: WithdrawalStatus = WithdrawalStatus.REQUESTED,
  ): Promise<WithdrawalEntity> {
    return this.withdrawalRepository.createWithdrawal(
      userId,
      amount,
      destination,
      status,
    );
  }

  /**
   * Finds withdrawals by user ID
   * @param userId - User ID
   * @returns Promise<WithdrawalEntity[]>
   */
  async findByUserId(userId: string): Promise<WithdrawalEntity[]> {
    return this.withdrawalRepository.findByUserId(userId);
  }

  /**
   * Finds withdrawals by status
   * @param status - Withdrawal status
   * @returns Promise<WithdrawalEntity[]>
   */
  async findByStatus(status: WithdrawalStatus): Promise<WithdrawalEntity[]> {
    return this.withdrawalRepository.findByStatus(status);
  }

  /**
   * Finds a withdrawal by ID
   * @param id - UUID of the withdrawal
   * @returns Promise<WithdrawalEntity | null>
   */
  async findById(id: string): Promise<WithdrawalEntity | null> {
    return this.withdrawalRepository.findOne({ where: { id } });
  }

  /**
   * Updates withdrawal status
   * @param id - UUID of the withdrawal
   * @param status - New withdrawal status
   * @returns Promise<WithdrawalEntity>
   */
  async updateStatus(id: string, status: WithdrawalStatus): Promise<WithdrawalEntity> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
    });

    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal with ID ${id} not found`);
    }

    withdrawal.status = status;
    return this.withdrawalRepository.save(withdrawal);
  }

  /**
   * Gets withdrawals by user ID
   * @param userId - User ID
   * @returns Promise<WithdrawalEntity[]>
   */
  async getWithdrawalsByUserId(userId: string): Promise<WithdrawalEntity[]> {
    return this.withdrawalRepository.findByUserId(userId);
  }
}
