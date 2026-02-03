import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LedgerService } from './ledger.service';

@Injectable()
export class RevenueService {
  constructor(private ledger: LedgerService) {}

  async split(
    escrowWallet: string,
    resellerWallet: string,
    platformWallet: string,
    total: number,
    resellerShare: number,
    platformShare: number,
    reference: string,
  ) {
    // Debit escrow
    await this.ledger.postEntry(escrowWallet, total, 'DEBIT', reference);

    // Credit reseller
    await this.ledger.postEntry(
      resellerWallet,
      resellerShare,
      'CREDIT',
      reference,
    );

    // Credit platform
    await this.ledger.postEntry(
      platformWallet,
      platformShare,
      'CREDIT',
      reference,
    );
  }
}
