import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class IotecWebhookService {
    private readonly webhookSecret: string;

    constructor() {
        this.webhookSecret = process.env.IOTEC_WEBHOOK_SECRET || '';
        if (!this.webhookSecret) {
            console.warn('IOTEC_WEBHOOK_SECRET not configured');
        }
    }

  verifySignature(rawBody: string, signature: string): boolean {
    if (!signature) {
      throw new UnauthorizedException('Missing signature header');
    }

    if (!this.webhookSecret) {
      throw new UnauthorizedException('Webhook secret not configured');
    }

    const expectedSignature =
      'sha256=' +
      crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}