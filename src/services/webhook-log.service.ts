import { Injectable, NotFoundException } from '@nestjs/common';
import { WebhookLogRepository } from '../repositories/webhook-log.repository';
import { WebhookLogEntity } from '../entities/webhook-log.entity';

@Injectable()
export class WebhookLogService {
  constructor(private readonly webhookLogRepository: WebhookLogRepository) {}

  /**
   * Creates a new webhook log entry
   * @param provider - Payment provider
   * @param payload - Webhook payload
   * @param processed - Whether the webhook has been processed (default: false)
   * @returns Promise<WebhookLogEntity>
   */
  async createWebhookLog(
    provider: string,
    payload: any,
    processed: boolean = false,
  ): Promise<WebhookLogEntity> {
    return this.webhookLogRepository.createWebhookLog(provider, payload, processed);
  }

  /**
   * Finds webhook logs by provider
   * @param provider - Payment provider
   * @returns Promise<WebhookLogEntity[]>
   */
  async findByProvider(provider: string): Promise<WebhookLogEntity[]> {
    return this.webhookLogRepository.findByProvider(provider);
  }

  /**
   * Finds webhook logs by processed status
   * @param processed - Processed status
   * @returns Promise<WebhookLogEntity[]>
   */
  async findByProcessed(processed: boolean): Promise<WebhookLogEntity[]> {
    return this.webhookLogRepository.findByProcessed(processed);
  }

  /**
   * Finds a webhook log by ID
   * @param id - UUID of the webhook log
   * @returns Promise<WebhookLogEntity | null>
   */
  async findById(id: string): Promise<WebhookLogEntity | null> {
    return this.webhookLogRepository.findOne({ where: { id } });
  }

  /**
   * Marks a webhook log as processed
   * @param id - UUID of the webhook log
   * @returns Promise<WebhookLogEntity>
   */
  async markAsProcessed(id: string): Promise<WebhookLogEntity> {
    try {
      return await this.webhookLogRepository.markAsProcessed(id);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }
}
