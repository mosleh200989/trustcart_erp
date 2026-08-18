import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from './customer.entity';
import { CdmService } from './cdm.service';
import { CdmController } from './cdm.controller';
import { FamilyMember } from './entities/family-member.entity';
import { CustomerInteraction } from './entities/customer-interaction.entity';
import { CustomerBehavior } from './entities/customer-behavior.entity';
import { CustomerDropoff } from './entities/customer-dropoff.entity';
import { CustomerAddress } from './entities/customer-address.entity';
import { CustomerAddressesController } from './customer-addresses.controller';
import { CustomerAddressesService } from './customer-addresses.service';
import { CustomerEnrichmentService } from './customer-enrichment.service';
import { CustomerEnrichmentController } from './customer-enrichment.controller';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      FamilyMember,
      CustomerInteraction,
      CustomerBehavior,
      CustomerDropoff,
      CustomerAddress,
    ]),
    LoyaltyModule,
  ],
  controllers: [CustomersController, CdmController, CustomerAddressesController, CustomerEnrichmentController],
  providers: [CustomersService, CdmService, CustomerAddressesService, CustomerEnrichmentService],
  exports: [CustomersService, CdmService, CustomerAddressesService, CustomerEnrichmentService],
})
export class CustomersModule {}
