import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PesaService } from './services/pesa.service';
import { PesaController } from './controllers/pesa.controller';
import { PesaModule } from './modules/pesa.module';
import { MongodbModule } from './services/mongodb-service/mongodb-service.module';
import { MongodbService } from './services/mongodb-service/mongodb-service.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { RedisProvider } from './redis.provider';
import { OtpService } from './services/otp-service/otp2.service';
import { NetworkService } from './services/network-service/network-service.service';
import { JWTService } from './services/jwt/jwt.service';
import { AirtelModule } from './airtel/airtel.module';
import { AirtelController } from './airtel/airtel.controller';
import { AirtelService } from './airtel/airtel.service';
import {
  AIRTEL_COLLECTION_QUEUE,
  AIRTEL_PAYOUT_QUEUE,
} from './airtel/airtel.queue';
import { MtnService } from './airtel/mtn/mtn.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from './entities/transaction.entity';
import { LedgerEntity } from './entities/ledger.entity';
import { WalletEntity } from './entities/wallet.entity';
import { PaymentEntity } from './entities/payment.entity';
import { WithdrawalEntity } from './entities/withdrawal.entity';
import { WebhookLogEntity } from './entities/webhook-log.entity';
import { UserEntity } from './entities/user.entity';
import { TransactionRepository } from './repositories/transaction.repository';
import { LedgerRepository } from './repositories/ledger.repository';
import { WalletRepository } from './repositories/wallet.repository';
import { PaymentRepository } from './repositories/payment.repository';
import { WithdrawalRepository } from './repositories/withdrawal.repository';
import { WebhookLogRepository } from './repositories/webhook-log.repository';
import { UserRepository } from './repositories/user.repository';
import { WalletService } from './services/wallet.service';
import { PaymentService } from './services/payment.service';
import { WithdrawalService } from './services/withdrawal.service';
import { WebhookLogService } from './services/webhook-log.service';
import { WalletController } from './controllers/wallet.controller';
import { PaymentController } from './controllers/payment.controller';
import { WithdrawalController } from './controllers/withdrawal.controller';
import { WebhookLogController } from './controllers/webhook-log.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { UsersController } from './controllers/users.controller';
import { UserService } from './services/user.service';
import { ExternalApiService } from './services/external-api/external-api.service';

@Module({
  imports: [
    PesaModule,
    MongodbModule,
    HttpModule,
    ConfigModule,

    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '.env'
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST') || 'localhost',
        port: parseInt(config.get<string>('DB_PORT') || '5432'),
        username: config.get<string>('DB_USERNAME') || 'postgres',
        password: config.get<string>('DB_PASSWORD') || 'password',
        database: config.get<string>('DB_DATABASE') || 'payment_server',
    //    ssl: config.get<string>('DB_HOST') !== 'localhost', // Only use SSL if not local
        extra: config.get<string>('DB_HOST') !== 'localhost' 
          ? {
              ssl: {
                rejectUnauthorized: false, // Supabase requires this
              },
            }
          : {},
        entities: [
          TransactionEntity,
          LedgerEntity,
          WalletEntity,
          PaymentEntity,
          WithdrawalEntity,
          WebhookLogEntity,
          UserEntity,
        ],
        synchronize: true, // Set to false in production
        logging: true,
      }),
    }),
    TypeOrmModule.forFeature([
      TransactionEntity,
      LedgerEntity,
      WalletEntity,
      PaymentEntity,
      WithdrawalEntity,
      WebhookLogEntity,
      UserEntity,
    ]),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('SMTP_HOST') || 'smtp.gmail.com',
          port: config.get<number>('SMTP_PORT') || 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: config.get<string>('SMTP_USER'),
            pass: config.get<string>('SMTP_PASS'),
          },
        },
        defaults: {
          from: config.get<string>('SMTP_FROM') || 'noreply@example.com',
        },
      }),
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 30,
        },
      ],
    }),

    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),

    BullModule.registerQueue(
      { name: AIRTEL_COLLECTION_QUEUE },
      { name: AIRTEL_PAYOUT_QUEUE },
    ),

    AirtelModule,
  ],
  controllers: [
    AppController,
    PesaController,
    WalletController,
    PaymentController,
    WithdrawalController,
    WebhookLogController,
    DashboardController,
    UsersController,
  ],
  providers: [
    AppService,
    JWTService,
    OtpService,
    NetworkService,
    PesaService,
    MongodbService,
    TransactionRepository,
    LedgerRepository,
    WalletRepository,
    PaymentRepository,
    WithdrawalRepository,
    WebhookLogRepository,
    UserRepository,
    WalletService,
    PaymentService,
    WithdrawalService,
    WebhookLogService,
    ExternalApiService,
    UserService,
  ],
})
export class AppModule {}
