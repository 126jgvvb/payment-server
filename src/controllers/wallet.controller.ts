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
import { WalletService } from '../services/wallet.service';
import { CreateWalletDto, UpdateWalletBalanceDto } from '../dtos/wallet.dto';
import { WalletEntity } from '../entities/wallet.entity';

@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Creates a new wallet for a user
   * @param createWalletDto - Wallet creation data
   * @returns Promise<WalletEntity>
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWallet(
    @Body() createWalletDto: CreateWalletDto,
  ): Promise<WalletEntity> {
    return this.walletService.createWallet(
      createWalletDto.userId,
      createWalletDto.currency,
      createWalletDto.initialBalance,
      createWalletDto.phone,
    );
  }

  /**
   * Gets a wallet by user ID
   * @param userId - UUID of the user
   * @returns Promise<WalletEntity | null>
   */
  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async getWalletByUserId(
    @Param('userId') userId: string,
  ): Promise<WalletEntity | null> {
    return this.walletService.findByUserId(userId);
  }

  /**
   * Gets a wallet by ID
   * @param id - UUID of the wallet
   * @returns Promise<WalletEntity | null>
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getWalletById(@Param('id') id: string): Promise<WalletEntity | null> {
    return this.walletService.findById(id);
  }

  /**
   * Gets a wallet by user ID and currency
   * @param userId - UUID of the user
   * @param currency - Currency code
   * @returns Promise<WalletEntity | null>
   */
  @Get('user/:userId/currency/:currency')
  @HttpCode(HttpStatus.OK)
  async getWalletByUserIdAndCurrency(
    @Param('userId') userId: string,
    @Param('currency') currency: string,
  ): Promise<WalletEntity | null> {
    return this.walletService.findByUserIdAndCurrency(userId, currency);
  }

  /**
   * Gets a wallet by phone number
   * @param phone - Phone number
   * @returns Promise<WalletEntity | null>
   */
  @Get('phone/:phone')
  @HttpCode(HttpStatus.OK)
  async getWalletByPhone(@Param('phone') phone: string): Promise<WalletEntity | null> {
    return this.walletService.findByPhone(phone);
  }

  /**
   * Updates wallet balance
   * @param id - UUID of the wallet
   * @param updateWalletBalanceDto - Balance update data
   * @returns Promise<WalletEntity>
   */
  @Put(':id/balance')
  @HttpCode(HttpStatus.OK)
  async updateBalance(
    @Param('id') id: string,
    @Body() updateWalletBalanceDto: UpdateWalletBalanceDto,
  ): Promise<WalletEntity> {
    return this.walletService.updateBalance(id, updateWalletBalanceDto.amount);
  }
}
