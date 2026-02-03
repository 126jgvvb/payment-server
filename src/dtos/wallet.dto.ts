export class CreateWalletDto {
  userId: string;
  phone?: string;
  currency?: string;
  initialBalance?: number;
}

export class UpdateWalletBalanceDto {
  amount: number;
}
