import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentEntity, PaymentType, PaymentStatus } from '../entities/payment.entity';

@Injectable()
export class PaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  /**
   * Creates a new payment
   * @param userId - User ID
   * @param reference - Unique payment reference
   * @param type - Payment type (COLLECTION or PAYOUT)
   * @param amount - Payment amount
   * @param provider - Payment provider
   * @param rawResponse - Raw API response
   * @param status - Payment status (default: PENDING)
   * @returns Promise<PaymentEntity>
   */
  async createPayment(
    userId: string,
    reference: string,
    type: PaymentType,
    amount: number,
    provider: string,
    rawResponse?: any,
    status: PaymentStatus = PaymentStatus.PENDING,
  ): Promise<PaymentEntity> {
    // Check if payment with same reference already exists
    const existingPayment = await this.paymentRepository.findByReference(reference);
    if (existingPayment) {
      return existingPayment;
    }

    return this.paymentRepository.createPayment(
      userId,
      reference,
      type,
      amount,
      provider,
      rawResponse,
      status,
    );
  }

  /**
   * Finds a payment by reference
   * @param reference - Unique payment reference
   * @returns Promise<PaymentEntity | null>
   */
  async findByReference(reference: string): Promise<PaymentEntity | null> {
    return this.paymentRepository.findByReference(reference);
  }

  /**
   * Finds payments by type
   * @param type - Payment type (COLLECTION or PAYOUT)
   * @returns Promise<PaymentEntity[]>
   */
  async findByType(type: PaymentType): Promise<PaymentEntity[]> {
    return this.paymentRepository.findByType(type);
  }

  /**
   * Finds payments by status
   * @param status - Payment status
   * @returns Promise<PaymentEntity[]>
   */
  async findByStatus(status: PaymentStatus): Promise<PaymentEntity[]> {
    return this.paymentRepository.findByStatus(status);
  }

  /**
   * Finds payments by provider
   * @param provider - Payment provider
   * @returns Promise<PaymentEntity[]>
   */
  async findByProvider(provider: string): Promise<PaymentEntity[]> {
    return this.paymentRepository.findByProvider(provider);
  }

  /**
   * Finds a payment by ID
   * @param id - UUID of the payment
   * @returns Promise<PaymentEntity | null>
   */
  async findById(id: string): Promise<PaymentEntity | null> {
    return this.paymentRepository.findOne({ where: { id } });
  }

  /**
   * Updates payment status
   * @param id - UUID of the payment
   * @param status - New payment status
   * @param rawResponse - Updated raw API response (optional)
   * @returns Promise<PaymentEntity>
   */
  async updateStatus(
    id: string,
    status: PaymentStatus,
    rawResponse?: any,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    payment.status = status;
    if (rawResponse) {
      payment.rawResponse = rawResponse;
    }

    return this.paymentRepository.save(payment);
  }

  /**
   * Updates payment with raw API response
   * @param id - UUID of the payment
   * @param rawResponse - Raw API response
   * @returns Promise<PaymentEntity>
   */
  async updateRawResponse(
    id: string,
    rawResponse: any,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    payment.rawResponse = rawResponse;
    return this.paymentRepository.save(payment);
  }

  /**
   * Gets payments by user ID
   * @param userId - User ID
   * @returns Promise<PaymentEntity[]>
   */
  async getPaymentsByUserId(userId: string): Promise<PaymentEntity[]> {
    // This would query payments by user ID in your payment repository
    return this.paymentRepository.find({
      where: { userId }, // This assumes your PaymentEntity has a userId field
      order: { createdAt: 'DESC' },
    });
  }
}
