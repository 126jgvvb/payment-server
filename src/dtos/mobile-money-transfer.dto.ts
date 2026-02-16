export class MobileMoneyTransferDto {
    amount: number;
    phoneNumber: string;
    provider: 'MTN' | 'AIRTEL';
    reference: string;
  }