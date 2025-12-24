import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import { CustomerMembership } from './entities/customer-membership.entity';
import { CustomerWallet } from './entities/customer-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { CustomerReferral } from './entities/customer-referral.entity';
import { MonthlyGroceryList } from './entities/monthly-grocery-list.entity';
import { GroceryListItem } from './entities/grocery-list-item.entity';
import { PriceLock } from './entities/price-lock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerMembership,
      CustomerWallet,
      WalletTransaction,
      CustomerReferral,
      MonthlyGroceryList,
      GroceryListItem,
      PriceLock,
    ]),
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
