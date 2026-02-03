import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('transactions')
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true })
  phone: string;

  @Column('numeric')
  amount: number;

  @Column({ nullable: true })
  currency: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ nullable: true, type: 'jsonb' })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
