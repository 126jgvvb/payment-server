// otp.service.ts
import Redis from 'ioredis';
import * as bcrypt from 'bcryptjs';
import { MailerService } from '@nestjs-modules/mailer';
import { Inject, Injectable } from '@nestjs/common';
import * as twilio from 'twilio';
import { NetworkService } from '../network-service/network-service.service';

@Injectable()
export class OtpService {
  private OTP_PREFIX = 'otp:';
  private twilioClient;

  constructor(
    //  @Inject('REDIS__CLIENT') private readonly redis:Redis,//not needed yet
    private readonly mailerService: MailerService,
    private readonly network: NetworkService,
  ) {
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getKey(email: string): string {
    return `${this.OTP_PREFIX}${email}`;
  }

  async sendOtp(email: string) {
    const otp = this.generateOtp();
    const hash = await bcrypt.hash(otp, 10);

    const ttl = Number(process.env.OTP_EXPIRY_SECONDS);

    //await this.redis.set(this.getKey(email), hash, 'EX', ttl);

    await this.mailerService.sendMail({
      to: email,
      subject: 'Your Verification Code',
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP code is:</p>
        <h1>${otp}</h1>
        <p>This code expires in ${ttl / 60} minutes.</p>
      `,
    });

    return { success: true };
  }

  //we are using only this one for now
  async sendSmsVoucher(phoneNumber: string, expiry: number) {
    //method to get a voucher from the main server

    const result = this.network.sendVoucherGet(
      '/session/generate-voucher',
      {expiryTime:expiry},
    );
    return result.then((result) => {
      if (result.status !== 200 && result.status !== 403) {
        //   throw new Error(result.error);
        console.error(result.error);
        return {smsResults:'',code:''};
      }

      console.log('sending voucher via sms to:',phoneNumber);
      let returnValue=null;

      // Format phone number to international format
      let formattedPhone = phoneNumber;
      if (phoneNumber.startsWith('0')) {
        // Remove leading 0 and add Uganda country code
        formattedPhone = '+256' + phoneNumber.substring(1);
      }
      else if(phoneNumber.startsWith('256')){
        formattedPhone='+'+phoneNumber;
      }
       else if (!phoneNumber.startsWith('+')) {
        formattedPhone = '+256' + phoneNumber;
      }

      return {smsResults:returnValue,code:result.data.code}

      try{
        /*
      returnValue= this.twilioClient.messages.create({
        body: `Your voucher code is ${result.code}.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
      });*/
    }
    catch(e){
      console.log('SMS submission error:',e);
    }

      return {smsResults:returnValue,code:result.code}
    });
  }

  /*
  async verifyEmailOtp(email: string, otp: string) {
    const key = this.getKey(email);
    const hash = await this.redis.get(key);

    if (!hash) {
      return { success: false, message: 'OTP expired or not found' };
    }

    const valid = await bcrypt.compare(otp, hash);
    if (!valid) {
      return { success: false, message: 'Invalid OTP' };
    }

    await this.redis.del(key);

    return { success: true };
  }

  async verifyPhoneOtp(phone: string, otp: string) {
    const key = this.getKey(phone);
    const hash = await this.redis.get(key);

    if (!hash) {
      return { success: false, message: 'OTP expired or not found' };
    }

    const valid = await bcrypt.compare(otp, hash);
    if (!valid) {
      return { success: false, message: 'Invalid OTP' };
    }

    await this.redis.del(key);

    return { success: true };
  }
    */
}
