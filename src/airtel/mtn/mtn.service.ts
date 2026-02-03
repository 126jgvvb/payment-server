import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { MomoCollectDto, MomoPayoutDto } from '../../dtos/momo.dto';

@Injectable()
export class MtnService {
  constructor(private readonly http: HttpService) {}

  private async getToken() {
    const auth = Buffer.from(
      `${process.env.MTN_API_USER}:${process.env.MTN_API_KEY}`,
    ).toString('base64');

    const res = await firstValueFrom(
      this.http.post(
        `${process.env.MTN_BASE_URL}/collection/token/`,
        {},
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY,
          },
        },
      ),
    );

    return res.data.access_token;
  }

  async collect(dto: MomoCollectDto) {
    const token = await this.getToken();

    return firstValueFrom(
      this.http.post(
        `${process.env.MTN_BASE_URL}/collection/v1_0/requesttopay`,
        {
          amount: dto.amount,
          currency: 'UGX',
          externalId: dto.reference,
          payer: { partyIdType: 'MSISDN', partyId: dto.phone },
          payerMessage: 'Wifi Voucher',
          payeeNote: 'Voucher purchase',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Reference-Id': dto.reference,
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY,
          },
        },
      ),
    );
  }

  async payout(dto: MomoPayoutDto) {
    const token = await this.getToken();

    return firstValueFrom(
      this.http.post(
        `${process.env.MTN_BASE_URL}/disbursement/v1_0/transfer`,
        {
          amount: dto.amount,
          currency: 'UGX',
          externalId: dto.reference,
          payee: { partyIdType: 'MSISDN', partyId: dto.phone },
          payerMessage: 'Withdrawal',
          payeeNote: 'Reseller payout',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Reference-Id': dto.reference,
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY,
          },
        },
      ),
    );
  }
}
