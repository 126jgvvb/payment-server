import { Repository } from 'typeorm';
import { TransactionEntity } from '../entities/transaction.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class TransactionRepository extends Repository<TransactionEntity> {
  constructor(
    @InjectRepository(TransactionEntity)
    private transactionRepository: Repository<TransactionEntity>,
  ) {
    super(
      transactionRepository.target,
      transactionRepository.manager,
      transactionRepository.queryRunner,
    );
  }

  async findByReference(reference: string): Promise<TransactionEntity | null> {
    return this.transactionRepository.findOne({ where: { reference } });
  }

  async findByPhone(phone: string): Promise<TransactionEntity[]> {
    return this.transactionRepository.find({ where: { phone } });
  }
}
