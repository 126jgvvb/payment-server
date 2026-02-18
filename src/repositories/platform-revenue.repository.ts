import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformRevenue } from '../entities/platform-revenue.entity';

@Injectable()
export class PlatformRevenueRepository extends Repository<PlatformRevenue> {
  constructor(
    @InjectRepository(PlatformRevenue)
    private platformRevenueRepository: Repository<PlatformRevenue>,
  ) {
    super(
      platformRevenueRepository.target,
      platformRevenueRepository.manager,
      platformRevenueRepository.queryRunner,
    );
  }

  async getOrCreate(): Promise<PlatformRevenue> {
    let revenue = await this.platformRevenueRepository.findOne({ where: {} });
    if (!revenue) {
      revenue = this.platformRevenueRepository.create({
        currentRevenue: 0,
        lastRevenue: 0,
        totalTransactions: 0,
      });
      await this.platformRevenueRepository.save(revenue);
    }
    return revenue;
  }

  async addRevenue(amount: number): Promise<PlatformRevenue> {
    const revenue = await this.getOrCreate();
    // Simple integer addition: lastRevenue = currentRevenue, then currentRevenue = currentRevenue + amount
    revenue.lastRevenue = revenue.currentRevenue;
    revenue.currentRevenue = revenue.currentRevenue + amount;
    revenue.totalTransactions = revenue.totalTransactions + 1;
    return await this.platformRevenueRepository.save(revenue);
  }

  async getCurrentRevenue(): Promise<number> {
    const revenue = await this.getOrCreate();
    return revenue.currentRevenue;
  }

  async findAll(): Promise<PlatformRevenue[]> {
    return await this.platformRevenueRepository.find();
  }
}
