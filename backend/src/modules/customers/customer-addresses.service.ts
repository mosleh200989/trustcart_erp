import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerAddress } from './entities/customer-address.entity';

@Injectable()
export class CustomerAddressesService {
  constructor(
    @InjectRepository(CustomerAddress)
    private addressesRepository: Repository<CustomerAddress>,
  ) {}

  async findByCustomerId(customerId: string): Promise<CustomerAddress[]> {
    console.log('=== findByCustomerId SERVICE START ===');
    console.log('Input customerId:', customerId);
    console.log('CustomerId type:', typeof customerId);
    
    try {
      console.log('Attempting to query addresses repository...');
      
      const addresses = await this.addressesRepository.find({
        where: { customerId },
        order: { 
          isPrimary: 'DESC',
          createdAt: 'DESC'
        },
      });
      
      console.log('Query successful!');
      console.log('Found addresses count:', addresses.length);
      console.log('=== findByCustomerId SERVICE END ===');
      
      return addresses;
    } catch (error: any) {
      console.error('=== ERROR in findByCustomerId SERVICE ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async findOne(id: number, customerId: string): Promise<CustomerAddress> {
    console.log('=== findOne SERVICE START ===');
    console.log('Looking for address ID:', id, 'for customer:', customerId);
    
    const address = await this.addressesRepository.findOne({
      where: { id, customerId },
    });

    console.log('Address found:', address ? 'YES' : 'NO');
    if (address) {
      console.log('Address data:', JSON.stringify(address));
    }

    if (!address) {
      console.error('Address not found! ID:', id, 'Customer:', customerId);
      throw new NotFoundException('Address not found');
    }

    console.log('=== findOne SERVICE END ===');
    return address;
  }

  async create(customerId: string, createAddressDto: any): Promise<CustomerAddress> {
    // If this is the first address or marked as default, set as default
    const existingAddresses = await this.findByCustomerId(customerId);
  const isPrimary = existingAddresses.length === 0 || createAddressDto.isPrimary || false;
    
    // Remove default from other addresses if this is being set as default
    if (isPrimary && existingAddresses.length > 0) {
      await this.addressesRepository.update(
        { customerId, isPrimary: true },
        { isPrimary: false },
      );
    }

    const newAddress = this.addressesRepository.create({
      ...createAddressDto,
      customerId,
      isPrimary,
    });

    return this.addressesRepository.save(newAddress) as any as Promise<CustomerAddress>;
  }

  async update(id: number, customerId: string, updateAddressDto: any): Promise<CustomerAddress> {
    try {
      console.log('=== UPDATE SERVICE START ===');
      console.log('Address ID:', id);
      console.log('Customer ID:', customerId);
      console.log('Update data:', JSON.stringify(updateAddressDto));
      
      const address = await this.findOne(id, customerId);
      console.log('Found address:', JSON.stringify(address));

      // If setting as primary, remove primary from others
      if (updateAddressDto.isPrimary) {
        console.log('Setting as primary, removing primary from others');
        await this.addressesRepository.update(
          { customerId, isPrimary: true },
          { isPrimary: false },
        );
      }

      Object.assign(address, updateAddressDto);
      console.log('Address after assign:', JSON.stringify(address));
      
      const result = await this.addressesRepository.save(address);
      console.log('Save result:', JSON.stringify(result));
      console.log('=== UPDATE SERVICE END ===');
      
      return result;
    } catch (error: any) {
      console.error('=== ERROR in UPDATE SERVICE ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  async setDefault(id: number, customerId: string): Promise<CustomerAddress> {
    const address = await this.findOne(id, customerId);

    // Remove default from all other addresses
    await this.addressesRepository.update(
      { customerId, isPrimary: true },
      { isPrimary: false },
    );

    // Set this address as default
    address.isPrimary = true;
    return this.addressesRepository.save(address);
  }

  async remove(id: number, customerId: string): Promise<void> {
    const address = await this.findOne(id, customerId);
    
  const wasPrimary = address.isPrimary;
    await this.addressesRepository.remove(address);

    // If the deleted address was default, set another as default
    if (wasPrimary) {
      const remaining = await this.findByCustomerId(customerId);
      if (remaining.length > 0) {
        remaining[0].isPrimary = true;
        await this.addressesRepository.save(remaining[0]);
      }
    }
  }
}
