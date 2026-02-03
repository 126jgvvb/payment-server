import { Injectable, ForbiddenException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import dayjs from 'dayjs';
import { MongodbService } from '../services/mongodb-service/mongodb-service.service';

@Injectable()
export class FraudService {
  constructor(private readonly mongodbService: MongodbService) {}

  async check(dto) {
    if (dto.amount > 500000) throw new ForbiddenException('Amount too large');

    // Note: The original code used txRepo.count() which doesn't exist in this codebase
    // This is a placeholder - you would need to implement the actual fraud check logic
    // using the mongodbService or another service

    return true;
  }
}
