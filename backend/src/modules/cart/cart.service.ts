import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './cart-item.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private cartRepo: Repository<CartItem>,
  ) {}

  /** Get all cart items for a session (or customer). */
  async getCart(sessionId: string, customerId?: number): Promise<CartItem[]> {
    if (customerId) {
      return this.cartRepo.find({
        where: { customerId },
        order: { createdAt: 'ASC' },
      });
    }
    return this.cartRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Full sync — replaces all items in the cart with the provided list.
   * This is the primary sync mechanism: the frontend sends its full cart state.
   */
  async syncCart(
    sessionId: string,
    items: Array<{
      productId: number;
      productName?: string;
      variant?: string;
      unitPrice: number;
      quantity: number;
      imageUrl?: string;
      category?: string;
    }>,
    customerId?: number,
  ): Promise<CartItem[]> {
    // Delete existing items for this session/customer
    if (customerId) {
      await this.cartRepo.delete({ customerId });
    } else {
      await this.cartRepo.delete({ sessionId });
    }

    if (!items || items.length === 0) {
      return [];
    }

    const entities = items.map((item) => {
      const ci = new CartItem();
      ci.sessionId = sessionId;
      ci.customerId = customerId ?? null;
      ci.productId = item.productId;
      ci.productName = item.productName ?? null;
      ci.variant = item.variant ?? null;
      ci.unitPrice = item.unitPrice;
      ci.quantity = item.quantity;
      ci.imageUrl = item.imageUrl ?? null;
      ci.category = item.category ?? null;
      return ci;
    });

    return this.cartRepo.save(entities);
  }

  /** Clear all items for a session/customer. */
  async clearCart(sessionId: string, customerId?: number): Promise<void> {
    if (customerId) {
      await this.cartRepo.delete({ customerId });
    }
    // Always clear by sessionId too in case of stale guest rows
    await this.cartRepo.delete({ sessionId });
  }

  /**
   * Merge a guest cart (by sessionId) into a customer cart (by customerId).
   * Guest items that don't already exist in the customer cart are added.
   * Existing items get their quantity summed.
   */
  async mergeGuestCart(sessionId: string, customerId: number): Promise<CartItem[]> {
    const guestItems = await this.cartRepo.find({ where: { sessionId, customerId: undefined as any } });
    // Also get items where customerId IS NULL
    const guestItemsNull = await this.cartRepo
      .createQueryBuilder('ci')
      .where('ci.session_id = :sessionId', { sessionId })
      .andWhere('ci.customer_id IS NULL')
      .getMany();

    const allGuest = [...guestItems, ...guestItemsNull].filter(
      (item, idx, arr) => arr.findIndex((i) => i.id === item.id) === idx,
    );

    const customerItems = await this.cartRepo.find({ where: { customerId } });

    // Build a map of existing customer cart keyed by productId+variant
    const existingMap = new Map<string, CartItem>();
    for (const item of customerItems) {
      existingMap.set(`${item.productId}::${item.variant ?? ''}`, item);
    }

    for (const guestItem of allGuest) {
      const key = `${guestItem.productId}::${guestItem.variant ?? ''}`;
      const existing = existingMap.get(key);
      if (existing) {
        // Sum quantities
        existing.quantity += guestItem.quantity;
        await this.cartRepo.save(existing);
      } else {
        // Move guest item to customer cart
        guestItem.customerId = customerId;
        await this.cartRepo.save(guestItem);
        existingMap.set(key, guestItem);
      }
    }

    // Remove remaining guest-only rows for this session
    await this.cartRepo
      .createQueryBuilder()
      .delete()
      .from(CartItem)
      .where('session_id = :sessionId', { sessionId })
      .andWhere('customer_id IS NULL')
      .execute();

    return this.cartRepo.find({
      where: { customerId },
      order: { createdAt: 'ASC' },
    });
  }
}
