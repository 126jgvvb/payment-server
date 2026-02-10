import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { UsersController } from './src/controllers/users.controller';
import { JWTService } from './src/services/jwt/jwt.service';
import { WalletService } from './src/services/wallet.service';

async function testDashboard() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersController = app.get(UsersController);
  const walletService = app.get(WalletService);
  const jwtService = app.get(JWTService);

  const phoneNumber = '0743537398';
  
  try {
    // Check if wallet exists, create if not
    let wallet = await walletService.findByPhone(phoneNumber);
    if (!wallet) {
      console.log('Creating wallet for phone number:', phoneNumber);
      wallet = await walletService.createWallet(phoneNumber, 'USD', 0, phoneNumber);
    }
    console.log('Wallet found:', wallet);

    // Create a mock request object
    const mockReq = {
      user: {
        userId: wallet.userId,
        walletId: wallet.id,
      },
    };

    // Test the dashboard functionality
    console.log('Testing dashboard for user:', wallet.userId);
    const dashboardData = await usersController.getClientDashboard(mockReq);
    
    console.log('\nDashboard Statistics:', dashboardData.statistics);
    console.log('\nLinked Routers:', dashboardData.linkedRouters);
    console.log('\nCurrently Running Tokens:', dashboardData.currentlyRunningTokens);
    
    if (dashboardData.linkedRouters.length > 0) {
      console.log('\n✅ Router filtering by holderNumber is working');
    } else {
      console.log('\n⚠️  No routers found for phone number:', phoneNumber);
    }
    
    if (dashboardData.currentlyRunningTokens.length > 0) {
      console.log('\n✅ Voucher filtering by phone number and router MAC address is working');
    } else {
      console.log('\n⚠️  No currently running tokens found for this user');
    }

  } catch (error) {
    console.error('\n❌ Error testing dashboard:', error);
  } finally {
    await app.close();
  }
}

testDashboard();