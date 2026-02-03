import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { AirtelService } from './airtel.service';
import { AIRTEL_PAYOUT_QUEUE } from './airtel.queue';

@Processor(AIRTEL_PAYOUT_QUEUE)
export class AirtelPayoutProcessor {
  constructor(private airtelService: AirtelService) {}

  @Process()
  async handle(job: Job) {
    return this.airtelService.disburseMoney(job.data);
  }
}
