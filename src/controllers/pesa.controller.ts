/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body } from '@nestjs/common';
import { PesaService } from '../services/pesa.service';
import { PesaPaymentConfirmationDto, PesaInitiatePaymentDto, PesaGetPaymentStatusDto } from '../dtos/pesa.dto';

@Controller('payment')
export class PesaController {
    constructor(private readonly pesapalService: PesaService) {}

    @Post('/payment-confirmation')
    async paymentCallback(@Body() dto: PesaPaymentConfirmationDto) {
        const { OrdertrackingId, OrderNotificationType, OrderMerchantReference } = dto;

        console.log(`Payment callback message:{${OrdertrackingId},${OrderNotificationType}, ${OrderMerchantReference}`);
        //save this to db
        const result = this.pesapalService.paymentConfirmation(OrdertrackingId);
        result.then((result) => {
            if (result) {
                return true;
            } else {
                return false;
            }
        });
    }

    @Post('mobile-money-initiate-payment')
    async initiateMobileMoneyPayment(@Body() dto: PesaInitiatePaymentDto) {
        return this.pesapalService.initiateMobileMoneyPayment(dto.phoneNumber, {
            selectedPrice: dto.selectedPrice,
            phoneNumber: dto.phoneNumber,
        });
    }
    
    @Get('get-payment-status')
    async getPaymentStatus(@Body() dto: PesaGetPaymentStatusDto) {
        return this.pesapalService.getPaymentStatus(dto.transactionID);
    }

    @Get('access-token')
    async getAccessToken() {
        return this.pesapalService.getToken();
    }
}
