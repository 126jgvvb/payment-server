import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WithdrawalService } from '../services/withdrawal.service';
import { CreateWithdrawalDto, UpdateWithdrawalStatusDto } from '../dtos/withdrawal.dto';
import { WithdrawalEntity, WithdrawalStatus } from '../entities/withdrawal.entity';

@Controller('withdrawals')
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  /**
   * Creates a new withdrawal
   * @param createWithdrawalDto - Withdrawal creation data
   * @returns Promise<WithdrawalEntity>
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWithdrawal(
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ): Promise<WithdrawalEntity> {
    return this.withdrawalService.createWithdrawal(
      createWithdrawalDto.userId,
      createWithdrawalDto.amount,
      createWithdrawalDto.destination,
      createWithdrawalDto.status,
    );
  }

  /**
   * Gets withdrawals by user ID
   * @param userId - User ID
   * @returns Promise<WithdrawalEntity[]>
   */
  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async getWithdrawalsByUserId(@Param('userId') userId: string): Promise<WithdrawalEntity[]> {
    return this.withdrawalService.findByUserId(userId);
  }

  /**
   * Gets withdrawals by status
   * @param status - Withdrawal status
   * @returns Promise<WithdrawalEntity[]>
   */
  @Get('status/:status')
  @HttpCode(HttpStatus.OK)
  async getWithdrawalsByStatus(@Param('status') status: WithdrawalStatus): Promise<WithdrawalEntity[]> {
    return this.withdrawalService.findByStatus(status);
  }

  /**
   * Gets a withdrawal by ID
   * @param id - UUID of the withdrawal
   * @returns Promise<WithdrawalEntity | null>
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getWithdrawalById(@Param('id') id: string): Promise<WithdrawalEntity | null> {
    return this.withdrawalService.findById(id);
  }

  /**
   * Updates withdrawal status
   * @param id - UUID of the withdrawal
   * @param updateWithdrawalStatusDto - Status update data
   * @returns Promise<WithdrawalEntity>
   */
  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateWithdrawalStatus(
    @Param('id') id: string,
    @Body() updateWithdrawalStatusDto: UpdateWithdrawalStatusDto,
  ): Promise<WithdrawalEntity> {
    return this.withdrawalService.updateStatus(id, updateWithdrawalStatusDto.status);
  }
}
