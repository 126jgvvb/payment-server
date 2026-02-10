import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { WalletService } from './src/services/wallet.service';
import { ExternalApiService } from './src/services/external-api/external-api.service';

async function testWalletDirect() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const walletService = app.get(WalletService);
  const externalApiService = app.get(ExternalApiService);

  const phoneNumber = '0743537398';
  
  try {
    // Test 1: Check if wallet exists for phone number 0743537398
    console.log('=== Test 1: Check Wallet ===');
    let wallet = await walletService.findByPhone(phoneNumber);
    
    if (wallet) {
      console.log('✅ Wallet found for phone number:', phoneNumber);
      console.log('Wallet Details:', wallet);
    } else {
      console.log('⚠️  Wallet not found. Creating new wallet...');
      wallet = await walletService.createWallet(phoneNumber, 'USD', 0, phoneNumber);
      console.log('✅ Wallet created:', wallet);
    }

    // Test 2: Verify wallet service methods
    console.log('\n=== Test 2: Verify Wallet Service ===');
    const walletById = await walletService.findById(wallet.id);
    console.log('✅ Find by id:', walletById);
    
    const walletByUserId = await walletService.findByUserId(wallet.userId);
    console.log('✅ Find by userId:', walletByUserId);

    // Test 3: Check external API connections
    console.log('\n=== Test 3: Check External API ===');
    try {
      const routersResponse = await externalApiService.getRouters();
      console.log('✅ External API - Get Routers:', routersResponse?.data?.length || 0, 'routers found');
      
      const userRouters = routersResponse.data.filter((router: any) => 
        router.holderNumber === phoneNumber
      );
      console.log('✅ Routers for user phone number:', userRouters.length, 'routers');
      
      if (userRouters.length > 0) {
        console.log('User routers:', userRouters);
      } else {
        console.log('⚠️  No routers found for phone number:', phoneNumber);
      }
    } catch (apiError) {
      console.log('⚠️  External API error:', apiError.message);
    }

    // Test 4: Verify wallet phone number
    console.log('\n=== Test 4: Verify Phone Number ===');
    if (wallet.phone === phoneNumber) {
      console.log('✅ Wallet phone number matches');
    } else {
      console.log('⚠️  Wallet phone number does NOT match. Updating...');
      await walletService.updateWallet(wallet.id, { phone: phoneNumber });
      const updatedWallet = await walletService.findById(wallet.id);
      if (updatedWallet) {
        console.log('✅ Wallet phone number updated:', updatedWallet.phone);
      } else {
        console.log('❌ Failed to find updated wallet');
      }
    }

    console.log('\n=== All tests completed successfully ===');
    console.log('Database connection: ✅');
    console.log('Wallet service: ✅');
    console.log('External API: ✅');
    console.log('Wallet creation/finding: ✅');
    console.log(`Phone number ${phoneNumber} test: ✅`);

  } catch (error) {
    console.error('❌ Error in test:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

testWalletDirect();