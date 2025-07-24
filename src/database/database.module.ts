import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [
    {
      provide: 'PG_POOL',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new Pool({
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          user: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
        });
      },
    },
  ],
  exports: ['PG_POOL'],
})
export class DatabaseModule {}
