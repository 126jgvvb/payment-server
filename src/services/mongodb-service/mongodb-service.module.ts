/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongodbService } from './mongodb-service.service';
import { NetworkService } from '../network-service/network-service.service';
import { JWTService } from '../jwt/jwt.service';

@Module({
    providers: [MongodbService, NetworkService, JWTService],
    exports: [MongodbService]
})
export class MongodbModule { } 