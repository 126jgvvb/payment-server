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
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto, UpdatePaymentStatusDto, UpdatePaymentRawResponseDto } from '../dtos/payment.dto';
import { PaymentEntity, PaymentType, PaymentStatus } from '../entities/payment.entity';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Creates a new payment
   * @param createPaymentDto - Payment creation data
   * @returns Promise<PaymentEntity>
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentEntity> {
    return this.paymentService.createPayment(
      createPaymentDto.reference,
      createPaymentDto.type,
      createPaymentDto.amount,
      createPaymentDto.provider,
      createPaymentDto.rawResponse,
      createPaymentDto.status,
    );
  }

  /**
   * Gets a payment by reference
   * @param reference - Unique payment reference
   * @returns Promise<PaymentEntity | null>
   */
  @Get('reference/:reference')
  @HttpCode(HttpStatus.OK)
  async getPaymentByReference(
    @Param('reference') reference: string,
  ): Promise<PaymentEntity | null> {
    return this.paymentService.findByReference(reference);
  }

  /**
   * Gets a payment by ID
   * @param id - UUID of the payment
   * @returns Promise<PaymentEntity | null>
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getPaymentById(@Param('id') id: string): Promise<PaymentEntity | null> {
    return this.paymentService.findById(id);
  }

  /**
   * Gets payments by type
   * @param type - Payment type (COLLECTION or PAYOUT)
   * @returns Promise<PaymentEntity[]>
   */
  @Get('type/:type')
  @HttpCode(HttpStatus.OK)
  async getPaymentsByType(@Param('type') type: PaymentType): Promise<PaymentEntity[]> {
    return this.paymentService.findByType(type);
  }

  /**
   * Gets payments by status
   * @param status - Payment status
   * @returns Promise<PaymentEntity[]>
   */
  @Get('status/:status')
  @HttpCode(HttpStatus.OK)
  async getPaymentsByStatus(@Param('status') status: PaymentStatus): Promise<PaymentEntity[]> {
    return this.paymentService.findByStatus(status);
  }

  /**
   * Gets payments by provider
   * @param provider - Payment provider
   * @returns Promise<PaymentEntity[]>
   */
  @Get('provider/:provider')
  @HttpCode(HttpStatus.OK)
  async getPaymentsByProvider(@Param('provider') provider: string): Promise<PaymentEntity[]> {
    return this.paymentService.findByProvider(provider);
  }

  /**
   * Updates payment status
   * @param id - UUID of the payment
   * @param updatePaymentStatusDto - Status update data
   * @returns Promise<PaymentEntity>
   */
  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
  ): Promise<PaymentEntity> {
    return this.paymentService.updateStatus(
      id,
      updatePaymentStatusDto.status,
      updatePaymentStatusDto.rawResponse,
    );
  }

  /**
   * Updates payment raw response
   * @param id - UUID of the payment
   * @param updatePaymentRawResponseDto - Raw response update data
   * @returns Promise<PaymentEntity>
   */
  @Put(':id/raw-response')
  @HttpCode(HttpStatus.OK)
  async updatePaymentRawResponse(
    @Param('id') id: string,
    @Body() updatePaymentRawResponseDto: UpdatePaymentRawResponseDto,
  ): Promise<PaymentEntity> {
    return this.paymentService.updateRawResponse(id, updatePaymentRawResponseDto.rawResponse);
  }
}
