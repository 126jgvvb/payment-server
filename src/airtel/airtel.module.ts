import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AirtelService } from './airtel.service';
import { AirtelController } from './airtel.controller';
import { AirtelWebhookController } from './airtel.webhook.controller';
import { MtnService } from './mtn/mtn.service';
import { FraudService } from './fraud.service';
import { LedgerService } from './ledger.service';
import { SettlementService } from './settlement.service';
import { MongodbModule } from '../services/mongodb-service/mongodb-service.module';
import { OtpService } from '../services/otp-service/otp2.service';
import { NetworkService } from '../services/network-service/network-service.service';
import { JWTService } from '../services/jwt/jwt.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from '../entities/transaction.entity';
import { LedgerEntity } from '../entities/ledger.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { TransactionRepository } from '../repositories/transaction.repository';
import { LedgerRepository } from '../repositories/ledger.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { WalletService } from '../services/wallet.service';

@Module({
  imports: [
    HttpModule, 
    MongodbModule,
    TypeOrmModule.forFeature([TransactionEntity, LedgerEntity, WalletEntity])
  ],
  providers: [
    AirtelService,
    MtnService,
    FraudService,
    LedgerService,
    SettlementService,
    OtpService,
    NetworkService,
    JWTService,
    TransactionRepository,
    LedgerRepository,
    WalletRepository,
    WalletService,
  ],
  controllers: [AirtelController, AirtelWebhookController],
})
export class AirtelModule {}
