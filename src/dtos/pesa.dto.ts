export class PesaInitiatePaymentDto {
  phoneNumber: string;
  selectedPrice: number;
}

export class PesaPaymentConfirmationDto {
  OrdertrackingId: string;
  OrderNotificationType: string;
  OrderMerchantReference: string;
}

export class PesaGetPaymentStatusDto {
  transactionID: string;
}

export class PesaTransactionDto {
  id?: string;
  redirect_mode?: string;
  notification_id?: string;
  billing_address?: {
    phone_number: string;
  };
  currency?: string;
  amount?: number;
  description?: string;
  callback_url?: string;
}

export class PesaPaymentStatusDto {
  payment_status_description: string;
  message: string;
  sender: string;
  timestamp: string;
}
