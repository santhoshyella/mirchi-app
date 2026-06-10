import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesModule } from './purchases/purchases.module';
import { DestemmingModule } from './destemming/destemming.module';
import { RaasiModule } from './raasi/raasi.module';
import { OrdersModule } from './orders/orders.module';
import { VarietiesModule } from './varieties/varieties.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { Purchase } from './purchases/purchase.entity';
import { DestemmingJob } from './destemming/destemming-job.entity';
import { RaasiBatch } from './raasi/raasi-batch.entity';
import { Order } from './orders/order.entity';
import { Variety } from './varieties/variety.entity';
import { Mark } from './varieties/mark.entity';
import { User } from './users/user.entity';
import { Role } from './users/role.entity';
import { OtpRecord } from './auth/otp-record.entity';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'vivardhaa'),
        password: config.get<string>('DB_PASSWORD', 'vivardhaa_secret'),
        database: config.get<string>('DB_NAME', 'vivardhaa_db'),
        entities: [Purchase, DestemmingJob, RaasiBatch, Order, Variety, Mark, User, Role, OtpRecord],
        synchronize: true,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    AuthModule,
    PurchasesModule,
    DestemmingModule,
    RaasiModule,
    OrdersModule,
    VarietiesModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
