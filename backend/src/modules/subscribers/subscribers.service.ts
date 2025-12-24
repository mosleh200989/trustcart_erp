import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailSubscriber } from './email-subscriber.entity';

@Injectable()
export class SubscribersService {
  constructor(
    @InjectRepository(EmailSubscriber)
    private subscribersRepository: Repository<EmailSubscriber>,
  ) {}

  async subscribe(email: string) {
    try {
      // Check if already subscribed
      const existing = await this.subscribersRepository.findOne({ where: { email } });
      
      if (existing) {
        if (existing.status === 'active') {
          return { success: false, message: 'Already subscribed' };
        } else {
          // Reactivate subscription
          existing.status = 'active';
          existing.unsubscribed_at = null as any;
          await this.subscribersRepository.save(existing);
          return { success: true, message: 'Subscription reactivated' };
        }
      }
      
      const subscriber = this.subscribersRepository.create({ email, status: 'active' });
      await this.subscribersRepository.save(subscriber);
      return { success: true, message: 'Successfully subscribed' };
    } catch (error) {
      console.error('Error subscribing email:', error);
      throw error;
    }
  }

  async unsubscribe(email: string) {
    try {
      const subscriber = await this.subscribersRepository.findOne({ where: { email } });
      
      if (!subscriber) {
        return { success: false, message: 'Email not found' };
      }
      
      subscriber.status = 'unsubscribed';
      subscriber.unsubscribed_at = new Date();
      await this.subscribersRepository.save(subscriber);
      
      return { success: true, message: 'Successfully unsubscribed' };
    } catch (error) {
      console.error('Error unsubscribing email:', error);
      throw error;
    }
  }

  async findAll() {
    return this.subscribersRepository.find({ where: { status: 'active' } });
  }
}
