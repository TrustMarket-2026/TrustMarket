import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryRequestService } from './delivery-request/delivery-request.service';
import { DeliveryRequestController } from './delivery-request/delivery-request.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DeliveryController, DeliveryRequestController],
  providers: [DeliveryService, DeliveryRequestService],
  exports: [DeliveryService, DeliveryRequestService],
})
export class DeliveryModule {}