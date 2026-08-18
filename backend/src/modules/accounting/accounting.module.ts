import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';
import { DollarConsumptionCalculation } from './entities/dollar-consumption-calculation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JournalEntry, JournalLine, DollarConsumptionCalculation])],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
