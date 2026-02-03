/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
//import { ConfigModule } from '@nestjs/config';
import { PesaController } from 'src/controllers/pesa.controller';
import { PesaService } from 'src/services/pesa.service';
import { OtpService } from 'src/services/otp-service/otp2.service';
import { MongodbModule } from 'src/services/mongodb-service/mongodb-service.module';
import { NetworkService } from 'src/services/network-service/network-service.service';

@Module({
   // imports:[ConfigModule],
    imports: [MongodbModule],
    controllers:[PesaController],
    providers: [PesaService,NetworkService, OtpService],
    exports:[PesaService]
})
export class PesaModule {}
