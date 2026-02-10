import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { WalletService } from './src/services/wallet.service';

async function testWallet() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const walletService = app.get(WalletService);

  const phoneNumber = '0743537398';
  
  try {
    // Check if wallet exists for this phone number
    let wallet = await walletService.findByPhone(phoneNumber);
    
    if (wallet) {
      console.log('Wallet found:', wallet);
    } else {
      console.log('Wallet not found. Creating new wallet...');
      wallet = await walletService.createWallet(phoneNumber, 'USD', 0, phoneNumber);
      console.log('Wallet created:', wallet);
    }
    
    // Also test the findByUserId method
    const walletByUserId = await walletService.findByUserId(wallet.userId);
    console.log('Wallet by userId:', walletByUserId);
    
    console.log('Database connection and wallet service are working correctly');
  } catch (error) {
    console.error('Error testing wallet:', error);
  } finally {
    await app.close();
  }
}

testWallet();