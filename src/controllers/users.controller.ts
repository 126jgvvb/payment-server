import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JWTService } from '../services/jwt/jwt.service';
import { WalletService } from '../services/wallet.service';
import { PaymentService } from '../services/payment.service';
import { WithdrawalService } from '../services/withdrawal.service';
import { ExternalApiService } from '../services/external-api/external-api.service';
import { UserService } from '../services/user.service';
import { IotecService } from '../services/iotec.service';
import { PlatformRevenueRepository } from '../repositories/platform-revenue.repository';
import config from '../config/config';
import { WalletEntity } from '../entities/wallet.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { WithdrawalEntity, WithdrawalStatus } from '../entities/withdrawal.entity';
import { CreateWalletDto } from '../dtos/wallet.dto';

// DTO interfaces for client operations
interface ClientSignupDto {
  fullName: string;
  email: string;
  phoneNumber: string;
  walletId: string;
  password: string;
}

interface ClientLoginDto {
  phoneNumber: string;
  password: string;
}

interface ClientProfileUpdateDto {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly jwtService: JWTService,
    private readonly walletService: WalletService,
    private readonly paymentService: PaymentService,
    private readonly withdrawalService: WithdrawalService,
    private readonly externalApiService: ExternalApiService,
    private readonly userService: UserService,
    private readonly iotecService: IotecService,
    private readonly platformRevenueRepository: PlatformRevenueRepository,
  ) {}

  /**
   * Client signup endpoint - creates a new user with wallet
   * @param signupDto - Client signup data
   * @returns Promise<{ user: any; wallet: WalletEntity; token: string }>
   */
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
   async clientSignup(@Body() signupDto: ClientSignupDto) {
    // Create user in the database
    const user = await this.userService.createUser({
      fullName: signupDto.fullName,
      email: signupDto.email,
      phoneNumber: signupDto.phoneNumber,
      password: signupDto.password,
    });

    // Create wallet for the user
    const wallet = await this.walletService.createWallet(
      user.id,
      'USD',
      0,
      user.phoneNumber,
    );

    // Update user with walletId
    await this.userService.updateUser(user.id, {
      walletId: wallet.id,
    });

    // Generate JWT token
    const token = this.jwtService.generateToken({
      userId: user.id,
      walletId: wallet.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
    });

    return {
      user: { ...user, walletId: wallet.id },
      wallet,
      token,
    };
  }

  /**
   * Client login endpoint
   * @param loginDto - Client login credentials
   * @returns Promise<{ user: any; wallet: WalletEntity; token: string }>
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async clientLogin(@Body() loginDto: ClientLoginDto) {
    // Find user by phoneNumber
    const user = await this.userService.findByPhoneNumber(loginDto.phoneNumber);
    if (!user) {
      return {
        status: 'error',
        message: 'Invalid phone number or password',
      };
    }

    // Verify password
    const isPasswordValid = await this.userService.validatePassword(
      user,
      loginDto.password,
    );
    if (!isPasswordValid) {
      return {
        status: 'error',
        message: 'Invalid phone number or password',
      };
    }

    // Get user's wallet
    const wallet = await this.walletService.findByPhone(user.phoneNumber);
    if (!wallet) {
      return {
        status: 'error',
        message: 'Wallet not found for this phone number',
      };
    }

    // Generate JWT token
    const token = this.jwtService.generateToken({
      userId: user.id,
      walletId: wallet.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
    });

    return {
      user,
      wallet,
      token,
    };
  }

  /**
     * Gets client profile data
     * @param req - Request object with user data
     * @returns Promise<{ user: any; wallet: WalletEntity }>
     */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getClientProfile(@Request() req) {
    const userId = req.user?.userId;
    
    // Get user data from database
    const user = await this.userService.findById(userId);
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    // Get user's wallet
    const wallet = await this.walletService.findByUserId(userId);

    return {
      user,
      wallet,
    };
  }

  /**
   * Updates client profile
   * @param req - Request object with user data
   * @param updateDto - Profile update data
   * @returns Promise<{ user: any }>
   */
  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateClientProfile(
    @Request() req,
    @Body() updateDto: ClientProfileUpdateDto,
  ) {
    const userId = req.user?.userId;

    // Update user profile in database
    const updatedUser = await this.userService.updateUser(userId, updateDto);
    if (!updatedUser) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    return {
      user: updatedUser,
    };
  }

  /**
   * Gets client dashboard data
   * @param req - Request object with user data
   * @returns Promise<object>
   */
  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getClientDashboard(@Request() req) {
    const userId = req.user?.userId;

    // Get user's wallet
    const wallet = await this.walletService.findByUserId(userId);

    // Get user's payment history
    const payments = await this.paymentService.getPaymentsByUserId(userId);

    // Get user's withdrawal history
    const withdrawals = await this.withdrawalService.getWithdrawalsByUserId(userId);

    // Get user data to access phone number
    const user = await this.userService.findById(userId);
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

      // Get user's linked routers from external API
     const routersResponse = await this.externalApiService.getRoutersByPhoneNumber(user.phoneNumber);
     const linkedRouters = routersResponse.data || [];
     const formattedRouters = linkedRouters.map((router: any, index: number) => ({
       id: `${index + 1}`,
       name: router.routerName || `Router-${index + 1}`,
       macAddress: router.routerIP || 'Unknown',
     }));

     // Get currently running tokens from external API
    const vouchersResponse = await this.externalApiService.getAllVouchersInMemory();
    //const allVouchers = vouchersResponse.data || [];
    const allVouchers = vouchersResponse.data || [];

    console.log('Vouchers====>',allVouchers);

     // Filter vouchers by user's phone number and router MAC address
     const currentlyRunningTokens = allVouchers.filter((voucher: any) => 
       voucher.phoneNumber === user.phoneNumber && 
       formattedRouters.some(router => router.routerIP === voucher.routerIP)
     ).map((voucher: any, index: number) => ({
       id: `voucher-${index + 1}`,
       tokenId: voucher.code,
       router: voucher.routerIP || 'Unknown Router',
       duration: this.getDurationFromExpiry(voucher.expiry),
       expiryTime: new Date(Date.now() + voucher.expiry * 1000).toISOString(),
       status: voucher.status === 'access granted' ? 'active' : voucher.status,
       createdBy: userId,
       createdAt: new Date(),
       payment: voucher.payment,
       connectionID: voucher.connectionID,
       origUrl: voucher.origUrl,
       clientID: voucher.clientID,
       isBound: voucher.isBound,
       ip: voucher.ip,
     }));

     // Get user's generated vouchers
     const userVouchersResponse = await this.getClientVouchers(req);
     const vouchers = userVouchersResponse.vouchers || [];

     return {
       statistics: {
         currentBalance: wallet?.balance || 0,
         totalPayments: payments.length,
         totalWithdrawals: withdrawals.length,
         activeTokens: currentlyRunningTokens.length,
         linkedRouters: formattedRouters.length,
       },
       wallet,
       recentPayments: payments.slice(0, 5),
       recentWithdrawals: withdrawals.slice(0, 5),
       linkedRouters: formattedRouters,
       currentlyRunningTokens,
       vouchers,
     };
  }

  /**
     * Gets user's payment history
     * @param req - Request object with user data
     * @returns Promise<PaymentEntity[]>
     */
  @Get('payments')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getClientPayments(@Request() req) {
    const userId = req.user?.userId;
    return this.paymentService.getPaymentsByUserId(userId);
  }

  /**
   * Gets user's withdrawal history
   * @param req - Request object with user data
   * @returns Promise<WithdrawalEntity[]>
   */
  @Get('withdrawals')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getClientWithdrawals(@Request() req) {
    const userId = req.user?.userId;
    return this.withdrawalService.getWithdrawalsByUserId(userId);
  }

  /**
   * Client withdrawal request - creates a withdrawal and triggers disbursement
   * @param req - Request object with user data
   * @param withdrawalData - Withdrawal data (amount, phoneNumber, provider)
   * @returns Promise<{ success: boolean; message: string; withdrawal?: WithdrawalEntity; disbursement?: any }>
   */
  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async requestWithdrawal(
    @Request() req,
    @Body() withdrawalData: { amount: number; phoneNumber: string; provider?: 'MTN' | 'AIRTEL' },
  ) {
    const userId = req.user?.userId;
    const { amount, phoneNumber, provider = 'MTN' } = withdrawalData;

    // Validate amount
    if (!amount || amount < 10000) {
      return { success: false, message: 'Minimum withdrawal amount is UGX 10,000' };
    }

    // Get user's wallet
    const wallet = await this.walletService.findByUserId(userId);
    if (!wallet) {
      return { success: false, message: 'Wallet not found' };
    }

    // Check balance
    if (wallet.balance < amount) {
      return { success: false, message: 'Insufficient balance' };
    }

    // Apply charge of 1000 and credit remaining to user's wallet
    const CHARGE_AMOUNT = 1000;
    const amountNum = parseFloat((amount).toString());
    const netAmount = amountNum - CHARGE_AMOUNT;

    if (netAmount <= 0) {
      return { success: false, message: 'Amount is less than minimum charge' };
    }

    // Create withdrawal record first (without deducting from wallet yet)
    const withdrawal = await this.withdrawalService.createWithdrawal(
      userId,
      netAmount,
      phoneNumber,
      WithdrawalStatus.REQUESTED,
    );

    // Trigger disbursement via iotecService
    try {
      // Call the iotecService walletToMobileMoney method directly
      const disbursementResult = await this.iotecService.walletToMobileMoney({
        amount: netAmount,
        phoneNumber: phoneNumber,
        provider: provider,
        reference: `withdrawal-${withdrawal.id}`,
        payee: phoneNumber,
      });

      // Only deduct from wallet and update status when disbursement is successful
      if (disbursementResult.status === 'Success') {
        // Deduct from wallet after successful disbursement
        await this.walletService.updateBalance(wallet.id, -amount);
        console.log(`Deducted ${amount} from wallet ${wallet.id} (charge: ${CHARGE_AMOUNT}, net: ${netAmount})`);
        
        // Update withdrawal status to PAID
        await this.withdrawalService.updateStatus(withdrawal.id, WithdrawalStatus.PAID);
        
        return {
          success: true,
          message: 'Withdrawal completed successfully',
          withdrawal,
          disbursement: disbursementResult,
        };
      } else if (disbursementResult.status === 'Scheduled') {
        // For scheduled status, deduct from wallet, update platform revenue, and mark as APPROVED
        await this.walletService.updateBalance(wallet.id, -amount);
        console.log(`Deducted ${amount} from wallet ${wallet.id} (pending disbursement)`);
        
        // Update platform revenue with the constant from environment
        const platformRevenue = await this.platformRevenueRepository.addRevenue(config.platformRevenueConstant);
        console.log(`Platform revenue updated: +${config.platformRevenueConstant}, new total: ${platformRevenue.currentRevenue}`);
        
        await this.withdrawalService.updateStatus(withdrawal.id, WithdrawalStatus.APPROVED);
        
        return {
          success: true,
          message: 'Withdrawal request submitted - pending processing',
          withdrawal,
          disbursement: disbursementResult,
          platformRevenue: platformRevenue.currentRevenue,
        };
      } else {
        // Disbursement failed - no deduction needed, mark as rejected
        await this.withdrawalService.updateStatus(withdrawal.id, WithdrawalStatus.REJECTED);
        
        return {
          success: false,
          message: 'Withdrawal failed: ' + (disbursementResult.statusMessage || 'Unknown error'),
          withdrawal,
          disbursement: disbursementResult,
        };
      }
    } catch (error) {
      // If disbursement fails, mark as failed - no wallet deduction was made
      await this.withdrawalService.updateStatus(withdrawal.id, WithdrawalStatus.REJECTED);
      
      return {
        success: false,
        message: 'Withdrawal failed: ' + (error.message || 'Unknown error'),
        withdrawal,
      };
    }
  }

   /**
       * Generates vouchers for the client (Premium Feature - UGX 5000 per generation)
       * @param req - Request object with user data
       * @param voucherData - Voucher generation data
       * @returns Promise<{ vouchers: any[] }>
       */
      @Post('vouchers')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async generateVouchers(
    @Request() req,
    @Body() voucherData: { quantity: number; duration: string },
  ) {
    const userId = req.user?.userId;

    // Get user data to access phone number
    const user = await this.userService.findById(userId);
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    // Get user's wallet
    const wallet = await this.walletService.findByUserId(userId);
    const VOUCHER_GEN_COST = 5000; // UGX 5000 per voucher generation

    // Check if user has enough balance to generate vouchers
    if (!wallet || wallet.balance < VOUCHER_GEN_COST) {
      return {
        status: 'error',
        message: 'Insufficient balance. Voucher generation costs UGX 5000. Please add funds to your wallet.',
      };
    }

    // Deduct the voucher generation cost from user's wallet
    await this.walletService.updateBalance(wallet.id, wallet.balance - VOUCHER_GEN_COST);

    // Get user's linked routers
    const routersResponse = await this.externalApiService.getRouters();
    const allRouters = routersResponse.data || [];
    const linkedRouters = allRouters.filter((router: any) => 
      router.holderNumber === user.phoneNumber
    );

    // Convert duration string to seconds for external API
    const durationStr = voucherData.duration.toLowerCase().trim();
    let durationInSeconds: number;

    // Parse duration like "6 hours", "30 minutes", "2 days"
    const hourMatch = durationStr.match(/(\d+)\s*hour/i);
    if (hourMatch) {
      durationInSeconds = Number(hourMatch[1]) * 3600;
    } else {
      const minuteMatch = durationStr.match(/(\d+)\s*minute/i);
      if (minuteMatch) {
        durationInSeconds = Number(minuteMatch[1]) * 60;
      } else {
        const dayMatch = durationStr.match(/(\d+)\s*day/i);
        if (dayMatch) {
          durationInSeconds = Number(dayMatch[1]) * 86400;
        } else {
          // Default to hours if just a number is provided
          durationInSeconds = Number(durationStr) * 3600;
        }
      }
    }

    // Call external API to generate bulk vouchers
    const response = await this.externalApiService.generateBulkVouchers(
      voucherData.quantity,
      durationInSeconds,
    );

    // Format the vouchers with additional details
    const vouchers = response.codes.map((tokenData: any, index: number) => ({
      id: `voucher-${Date.now()}-${index}`,
      tokenId: tokenData.voucherCode,
      router: linkedRouters.length > 0 ? linkedRouters[index % linkedRouters.length].routerIP || 'Unknown Router' : 'Main-Lobby-R1',
      duration: voucherData.duration,
      expiryTime: new Date(Date.now() + this.getDurationMs(voucherData.duration)).toISOString(),
      status: 'active',
      createdBy: userId,
      createdAt: new Date(),
    }));

    return {
      vouchers,
      message: `Successfully generated ${voucherData.quantity} voucher(s) for UGX 5000`,
    };
  }

  /**
      * Gets client's generated vouchers
      * @param req - Request object with user data
      * @returns Promise<{ vouchers: any[] }>
      */
  @Get('vouchers')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getClientVouchers(@Request() req) {
    const userId = req.user?.userId;

    // Get user data to access phone number
    const user = await this.userService.findById(userId);
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    console.log('=== getClientVouchers ===');
    console.log('User ID:', userId);
    console.log('User data:', user);
    console.log('Phone number:', user.phoneNumber);

    // Get user's linked routers
    const routersResponse = await this.externalApiService.getRoutersByPhoneNumber(user.phoneNumber);
    const linkedRouters = routersResponse.data || [];

    console.log('Routers response:', routersResponse);
    console.log('Linked routers:', linkedRouters);
    console.log('Router properties:', linkedRouters.length > 0 ? Object.keys(linkedRouters[0]) : []);

    // Get current voucher codes from external API
    const vouchersResponse = await this.externalApiService.getCurrentVoucherCodes();
    const allVouchers = vouchersResponse.data || [];

    console.log('Vouchers response:', vouchersResponse);
    console.log('All vouchers:', allVouchers);
    console.log('Voucher properties:', allVouchers.length > 0 ? Object.keys(allVouchers[0]) : []);
    
    // Filter vouchers by user's phone number and router MAC address
    const userVouchers = allVouchers.filter((voucher: any) => {
      const matchesPhone = voucher.phoneNumber === user.phoneNumber;
      const matchesRouter = linkedRouters.some(router => router.routerIP === voucher.routerIP);
      console.log(`Voucher ${voucher.code}: Phone match=${matchesPhone}, Router match=${matchesRouter}`);
      return matchesPhone || matchesRouter;
    }).map((voucher: any, index: number) => ({
      id: `voucher-${index + 1}`,
      tokenId: voucher.code,
      router: voucher.routerIP || 'Unknown Router',
      duration: voucher.expiry, //this.getDurationFromExpiry(voucher.expiry),
      expiryTime: new Date(Date.now() + voucher.expiry * 1000).toISOString(),
      status: voucher.status === 'access granted' ? 'active' : voucher.status,
      createdBy: userId,
      createdAt: new Date(),
      payment: voucher.payment,
      connectionID: voucher.connectionID,
      origUrl: voucher.origUrl,
      clientID: voucher.clientID,
      isBound: voucher.isBound,
      ip: voucher.ip,
    }));

    console.log('Filtered vouchers:', userVouchers);

    return {
      vouchers: userVouchers,
    };
  }

  /**
      * Gets client's linked routers
      * @param req - Request object with user data
      * @returns Promise<{ routers: any[] }>
      */
  @Get('routers')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getClientRouters(@Request() req) {
    const userId = req.user?.userId;

    // Get user data to access phone number
    const user = await this.userService.findById(userId);
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    // Get user's linked routers from external API
    const routersResponse = await this.externalApiService.getRoutersByPhoneNumber(user.phoneNumber);
    const linkedRouters = routersResponse.data || [];

    // Format routers with additional details
    const formattedRouters = linkedRouters.map((router: any, index: number) => ({
      id: `${index + 1}`,
      name: router.name || `Router-${index + 1}`,
      macAddress: router.routerIP || 'Unknown',
    }));

    return {
      routers: formattedRouters,
    };
  }

  /**
     * Helper method to convert duration string to milliseconds
     * @param duration - Duration string (e.g., '1hr', '2hr', '4hr', '8hr', '1day', '3day', '1week', '1month')
     * @returns number - Duration in milliseconds
     */
  private getDurationMs(duration: string): number {
    const durationMap: Record<string, number> = {
      '1hr': 3600000,
      '2hr': 7200000,
      '4hr': 14400000,
      '8hr': 28800000,
      '1day': 86400000,
      '3day': 259200000,
      '1week': 604800000,
      '1month': 2592000000,
    };

    return durationMap[duration] || 3600000; // Default to 1 hour
  }

  /**
     * Helper method to convert expiry time in seconds to duration string
     * @param expiryInSeconds - Expiry time in seconds
     * @returns string - Duration string (e.g., '1hr', '2hr', '1day')
     */
  private getDurationFromExpiry(expiryInSeconds: number): string {
    const hourInSeconds = 3600;
    const dayInSeconds = 86400;
    const weekInSeconds = 604800;
    const monthInSeconds = 2592000;

    if (expiryInSeconds < hourInSeconds) {
      return `${Math.ceil(expiryInSeconds / 60)}min`;
    } else if (expiryInSeconds < dayInSeconds) {
      const hours = Math.ceil(expiryInSeconds / hourInSeconds);
      return `${hours}hr${hours > 1 ? 's' : ''}`;
    } else if (expiryInSeconds < weekInSeconds) {
      const days = Math.ceil(expiryInSeconds / dayInSeconds);
      return `${days}day${days > 1 ? 's' : ''}`;
    } else if (expiryInSeconds < monthInSeconds) {
      const weeks = Math.ceil(expiryInSeconds / weekInSeconds);
      return `${weeks}week${weeks > 1 ? 's' : ''}`;
    } else {
      const months = Math.ceil(expiryInSeconds / monthInSeconds);
      return `${months}month${months > 1 ? 's' : ''}`;
    }
  }
}
