import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WebhookLogService } from '../services/webhook-log.service';
import { CreateWebhookLogDto } from '../dtos/webhook-log.dto';
import { WebhookLogEntity } from '../entities/webhook-log.entity';

@Controller('webhook-logs')
export class WebhookLogController {
  constructor(private readonly webhookLogService: WebhookLogService) {}

  /**
   * Creates a new webhook log entry
   * @param createWebhookLogDto - Webhook log creation data
   * @returns Promise<WebhookLogEntity>
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWebhookLog(
    @Body() createWebhookLogDto: CreateWebhookLogDto,
  ): Promise<WebhookLogEntity> {
    return this.webhookLogService.createWebhookLog(
      createWebhookLogDto.provider,
      createWebhookLogDto.payload,
      createWebhookLogDto.processed,
    );
  }

  /**
   * Gets webhook logs by provider
   * @param provider - Payment provider
   * @returns Promise<WebhookLogEntity[]>
   */
  @Get('provider/:provider')
  @HttpCode(HttpStatus.OK)
  async getWebhookLogsByProvider(@Param('provider') provider: string): Promise<WebhookLogEntity[]> {
    return this.webhookLogService.findByProvider(provider);
  }

  /**
   * Gets webhook logs by processed status
   * @param processed - Processed status (true/false)
   * @returns Promise<WebhookLogEntity[]>
   */
  @Get('processed/:processed')
  @HttpCode(HttpStatus.OK)
  async getWebhookLogsByProcessed(@Param('processed') processed: string): Promise<WebhookLogEntity[]> {
    return this.webhookLogService.findByProcessed(processed === 'true');
  }

  /**
   * Gets a webhook log by ID
   * @param id - UUID of the webhook log
   * @returns Promise<WebhookLogEntity | null>
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getWebhookLogById(@Param('id') id: string): Promise<WebhookLogEntity | null> {
    return this.webhookLogService.findById(id);
  }

  /**
   * Marks a webhook log as processed
   * @param id - UUID of the webhook log
   * @returns Promise<WebhookLogEntity>
   */
  @Put(':id/processed')
  @HttpCode(HttpStatus.OK)
  async markAsProcessed(@Param('id') id: string): Promise<WebhookLogEntity> {
    return this.webhookLogService.markAsProcessed(id);
  }
}
