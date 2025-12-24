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
  ],
  controllers: [CustomersController, CdmController, CustomerAddressesController],
  providers: [CustomersService, CdmService, CustomerAddressesService],
  exports: [CustomersService, CdmService, CustomerAddressesService],
})
export class CustomersModule {}
