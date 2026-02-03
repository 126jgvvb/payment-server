import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { v4 as uuid } from 'uuid';
import { LedgerRepository } from '../repositories/ledger.repository';
import { LedgerEntity } from '../entities/ledger.entity';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly ledgerRepository: LedgerRepository) {}

  async postEntry(
    walletId: string,
    amount: number,
    direction: 'DEBIT' | 'CREDIT',
    ref: string,
  ) {
    const entry = new LedgerEntity();
    entry.walletId = walletId;
    entry.amount = amount;
    entry.direction = direction;
    entry.reference = ref;

    await this.ledgerRepository.save(entry);
    
    this.logger.log(`Posting entry: ${direction} ${amount} to ${walletId}`);
  }

  async transfer(from: string, to: string, amount: number, ref: string) {
    await this.postEntry(from, amount, 'DEBIT', ref);
    await this.postEntry(to, amount, 'CREDIT', ref);
  }
}
