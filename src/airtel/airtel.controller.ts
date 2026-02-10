import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { AirtelService } from './airtel.service';
import { AirtelCollectDto, AirtelPayoutDto } from './airtel.dto';
import { FraudService } from './fraud.service';
import { MomoWithdrawRequestDto } from '../dtos/momo.dto';

@Controller('airtel')
export class AirtelController {
  constructor(
    private readonly airtelService: AirtelService,
    private readonly fraudService: FraudService,
  ) {}

  @Post('collect')
  async collect(@Body() dto: AirtelCollectDto) {
    this.fraudService.check(dto);
    const result=  await this.airtelService.collectMoney(dto);
  
  return {data:result};
  }

  @Post('payout')
  payout(@Body() dto: AirtelPayoutDto) {
    return this.airtelService.disburseMoney(dto);
  }

  @Get('status/:id')
  status(@Param('id') id: string) {
    return this.airtelService.checkStatus(id);
  }

  @Get('transactions')
  async getAllTransactions(
    @Query('limit') limit: string,
    @Query('offset') offset: string,
  ) {
    const queryParams = {};
    if (limit) {
      queryParams['limit'] = parseInt(limit);
    }
    if (offset) {
      queryParams['offset'] = parseInt(offset);
    }
    
    return await this.airtelService.getAllTransactions(queryParams);
  }

  @Post('withdraw/request')
  requestWithdrawal(@Body() dto: MomoWithdrawRequestDto) {
    // save as REQUESTED
  }

  @Post('withdraw/approve/:id')
  approve(@Param('id') id: string) {
    // enqueue payout
  }
}
