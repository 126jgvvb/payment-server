import { PaymentType, PaymentStatus } from '../entities/payment.entity';

export class CreatePaymentDto {
  reference: string;
  type: PaymentType;
  amount: number;
  provider: string;
  rawResponse?: any;
  status?: PaymentStatus;
}

export class UpdatePaymentStatusDto {
  status: PaymentStatus;
  rawResponse?: any;
}

export class UpdatePaymentRawResponseDto {
  rawResponse: any;
}
