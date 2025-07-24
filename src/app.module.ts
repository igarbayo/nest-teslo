import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './products/products.module';
import { CommonModule } from './common/common.module';
import { SeedModule } from './seed/seed.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Load environment variables globally
    DatabaseModule,
    ProductsModule,
    CommonModule,
    SeedModule,
    FilesModule, // Import the DatabaseModule to provide the PostgreSQL connection pool
  ],
})
export class AppModule {}
