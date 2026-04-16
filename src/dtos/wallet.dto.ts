export enum WalletOwnerType {
  USER = 'user',
  GROUP = 'group',
}

export class CreateWalletDto {
  userId: string;
  phone?: string;
  currency?: string;
  initialBalance?: number;
  ownerType?: WalletOwnerType;
}

export class CreateGroupWalletDto {
  groupId: string;
  groupName?: string;
  currency?: string;
  initialBalance?: number;
}

export class UpdateWalletBalanceDto {
  amount: number;
}
