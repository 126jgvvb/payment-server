import { Repository } from 'typeorm';
import { LedgerEntity } from '../entities/ledger.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class LedgerRepository extends Repository<LedgerEntity> {
  constructor(
    @InjectRepository(LedgerEntity)
    private ledgerRepository: Repository<LedgerEntity>,
  ) {
    super(
      ledgerRepository.target,
      ledgerRepository.manager,
      ledgerRepository.queryRunner,
    );
  }

  async findByWallet(walletId: string): Promise<LedgerEntity[]> {
    return this.ledgerRepository.find({ 
      where: { walletId },
      order: { createdAt: 'DESC' }
    });
  }

  async findByReference(reference: string): Promise<LedgerEntity[]> {
    return this.ledgerRepository.find({ 
      where: { reference },
      order: { createdAt: 'DESC' }
    });
  }
}
