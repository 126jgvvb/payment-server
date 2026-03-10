import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('PlatformRevenue')
export class PlatformRevenue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  currentRevenue: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  lastRevenue: number;

  @Column({ type: 'int', default: 0 })
  totalTransactions: number;

  @UpdateDateColumn()
  lastUpdated: Date;

  @CreateDateColumn()
  createdAt: Date;
}
