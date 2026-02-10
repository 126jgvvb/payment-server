export class MomoCollectDto {
  phone: string;
  amount: number;
  reference?: string;
}

export class MomoPayoutDto {
  phone: string;
  amount: number;
  reference: string;
}

export class MomoTransactionDto {
  id?: string;
  reference?: string;
  phone?: string;
  amount?: number;
  currency?: string;
  status?: string;
  timestamp?: string;
}

export class MomoStatusDto {
  transactionId: string;
}

export class MomoWithdrawRequestDto {
  phone: string;
  amount: number;
  reference: string;
}

export class MomoWithdrawApproveDto {
  id: string;
}
