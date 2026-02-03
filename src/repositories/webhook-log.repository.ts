import { Repository } from 'typeorm';
import { WebhookLogEntity } from '../entities/webhook-log.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class WebhookLogRepository extends Repository<WebhookLogEntity> {
  constructor(
    @InjectRepository(WebhookLogEntity)
    private webhookLogRepository: Repository<WebhookLogEntity>,
  ) {
    super(
      webhookLogRepository.target,
      webhookLogRepository.manager,
      webhookLogRepository.queryRunner,
    );
  }

  async findByProvider(provider: string): Promise<WebhookLogEntity[]> {
    return this.webhookLogRepository.find({ 
      where: { provider },
      order: { createdAt: 'DESC' }
    });
  }

  async findByProcessed(processed: boolean): Promise<WebhookLogEntity[]> {
    return this.webhookLogRepository.find({ 
      where: { processed },
      order: { createdAt: 'DESC' }
    });
  }

  async createWebhookLog(
    provider: string,
    payload: any,
    processed: boolean = false,
  ): Promise<WebhookLogEntity> {
    const webhookLog = this.webhookLogRepository.create({
      provider,
      payload,
      processed,
    });
    return this.webhookLogRepository.save(webhookLog);
  }

  async markAsProcessed(id: string): Promise<WebhookLogEntity> {
    const webhookLog = await this.webhookLogRepository.findOne({
      where: { id },
    });
    
    if (!webhookLog) {
      throw new Error(`Webhook log with ID ${id} not found`);
    }
    
    webhookLog.processed = true;
    return this.webhookLogRepository.save(webhookLog);
  }
}
