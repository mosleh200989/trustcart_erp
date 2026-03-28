import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JournalEntry, JournalLine])],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
