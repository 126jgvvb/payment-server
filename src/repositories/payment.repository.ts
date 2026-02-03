import { Repository } from 'typeorm';
import { PaymentEntity, PaymentType, PaymentStatus } from '../entities/payment.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PaymentRepository extends Repository<PaymentEntity> {
  constructor(
    @InjectRepository(PaymentEntity)
    private paymentRepository: Repository<PaymentEntity>,
  ) {
    super(
      paymentRepository.target,
      paymentRepository.manager,
      paymentRepository.queryRunner,
    );
  }

  async findByReference(reference: string): Promise<PaymentEntity | null> {
    return this.paymentRepository.findOne({ where: { reference } });
  }

  async findByType(type: PaymentType): Promise<PaymentEntity[]> {
    return this.paymentRepository.find({ 
      where: { type },
      order: { createdAt: 'DESC' }
    });
  }

  async findByStatus(status: PaymentStatus): Promise<PaymentEntity[]> {
    return this.paymentRepository.find({ 
      where: { status },
      order: { createdAt: 'DESC' }
    });
  }

  async findByProvider(provider: string): Promise<PaymentEntity[]> {
    return this.paymentRepository.find({ 
      where: { provider },
      order: { createdAt: 'DESC' }
    });
  }

  async createPayment(
    reference: string,
    type: PaymentType,
    amount: number,
    provider: string,
    rawResponse?: any,
    status: PaymentStatus = PaymentStatus.PENDING,
  ): Promise<PaymentEntity> {
    const payment = this.paymentRepository.create({
      reference,
      type,
      amount,
      provider,
      rawResponse,
      status,
    });
    return this.paymentRepository.save(payment);
  }
}
