import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from root directory
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    bodyParser.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  await app.listen(process.env.PORT ?? 2000);
  console.log(`Application is running on port ${process.env.PORT ?? 2000}`);
}

bootstrap();
