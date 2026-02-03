import { WithdrawalStatus } from '../entities/withdrawal.entity';

export class CreateWithdrawalDto {
  userId: string;
  amount: number;
  destination: string;
  status?: WithdrawalStatus;
}

export class UpdateWithdrawalStatusDto {
  status: WithdrawalStatus;
}
