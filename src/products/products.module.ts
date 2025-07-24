import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  imports: [DatabaseModule],
  exports: [ProductsService], // Export the service if it needs to be used in other modules
})
export class ProductsModule {}
