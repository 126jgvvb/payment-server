import { Controller, Post, Body, Get, Param } from '@nestjs/common';
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
    return await this.airtelService.collectMoney(dto);
  }

  @Post('payout')
  payout(@Body() dto: AirtelPayoutDto) {
    return this.airtelService.disburseMoney(dto);
  }

  @Get('status/:id')
  status(@Param('id') id: string) {
    return this.airtelService.checkStatus(id);
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
