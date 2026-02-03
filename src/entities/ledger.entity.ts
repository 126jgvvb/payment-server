import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ledger')
export class LedgerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletId: string;

  @Column('numeric')
  amount: number;

  @Column({ type: 'varchar', length: 10 })
  direction: 'DEBIT' | 'CREDIT';

  @Column({ nullable: true })
  reference: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
