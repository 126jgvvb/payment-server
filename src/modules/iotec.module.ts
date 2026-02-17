import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { IotecService } from 'src/services/iotec.service';
import { IotecController } from 'src/controllers/iotec.controller';
import { IotecWebhookService } from 'src/services/iotec.webhook.service';
import { TransactionEntity } from '../entities/transaction.entity';
import { LedgerEntity } from '../entities/ledger.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { WithdrawalEntity } from '../entities/withdrawal.entity';
import { TransactionRepository } from '../repositories/transaction.repository';
import { LedgerRepository } from '../repositories/ledger.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { WalletService } from '../services/wallet.service';
import { LedgerService } from '../airtel/ledger.service';
import { WithdrawalService } from '../services/withdrawal.service';
import { OtpService } from '../services/otp-service/otp2.service';
import { NetworkService } from '../services/network-service/network-service.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([TransactionEntity, LedgerEntity, WalletEntity, WithdrawalEntity]),
    MailerModule,
  ],
  providers: [
    IotecService,
    IotecWebhookService,
    TransactionRepository,
    LedgerRepository,
    WalletRepository,
    WithdrawalRepository,
    WalletService,
    LedgerService,
    WithdrawalService,
    OtpService,
    NetworkService,
  ],
  controllers: [IotecController],
  exports: [IotecService],
})
export class IotecModule {}
