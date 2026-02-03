import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum WithdrawalStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  REJECTED = 'REJECTED',
}

@Entity('withdrawals')
export class WithdrawalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column('numeric', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.REQUESTED,
  })
  status: WithdrawalStatus;

  @Column()
  destination: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
