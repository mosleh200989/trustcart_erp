import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { Public } from '../../common/decorators/public.decorator';
import * as jwt from 'jsonwebtoken';

/** Extract customerId from optional JWT bearer token. */
function extractCustomerId(req: any): number | undefined {
  try {
    const authHeader = req?.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (decoded?.type === 'customer' && decoded?.customerId) {
      return Number(decoded.customerId);
    }
    // Also handle user-type tokens that have a linked customer
    return undefined;
  } catch {
    return undefined;
  }
}

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /** Get cart items for a session. */
  @Get(':sessionId')
  @Public()
  async getCart(@Param('sessionId') sessionId: string, @Req() req: any) {
    const customerId = extractCustomerId(req);
    const items = await this.cartService.getCart(sessionId, customerId);
    return {
      sessionId,
      customerId: customerId ?? null,
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        variant: i.variant,
        unitPrice: Number(i.unitPrice),
        quantity: i.quantity,
        imageUrl: i.imageUrl,
        category: i.category,
      })),
    };
  }

  /** Full cart sync — replaces server cart with the provided items. */
  @Put(':sessionId')
  @Public()
  async syncCart(
    @Param('sessionId') sessionId: string,
    @Body() body: { items: any[] },
    @Req() req: any,
  ) {
    const customerId = extractCustomerId(req);
    const items = (body.items || []).map((i: any) => ({
      productId: Number(i.productId),
      productName: i.productName || null,
      variant: i.variant || null,
      unitPrice: Number(i.unitPrice),
      quantity: Number(i.quantity) || 1,
      imageUrl: i.imageUrl || null,
      category: i.category || null,
    }));
    const saved = await this.cartService.syncCart(sessionId, items, customerId);
    return {
      sessionId,
      customerId: customerId ?? null,
      items: saved.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        variant: i.variant,
        unitPrice: Number(i.unitPrice),
        quantity: i.quantity,
        imageUrl: i.imageUrl,
        category: i.category,
      })),
    };
  }

  /** Clear cart. */
  @Delete(':sessionId')
  @Public()
  async clearCart(@Param('sessionId') sessionId: string, @Req() req: any) {
    const customerId = extractCustomerId(req);
    await this.cartService.clearCart(sessionId, customerId);
    return { success: true };
  }

  /** Merge a guest cart into the customer's cart on login. */
  @Post('merge')
  @Public()
  async mergeCart(
    @Body() body: { sessionId: string; customerId: number },
  ) {
    if (!body.sessionId || !body.customerId) {
      return { success: false, message: 'sessionId and customerId are required' };
    }
    const items = await this.cartService.mergeGuestCart(body.sessionId, body.customerId);
    return {
      sessionId: body.sessionId,
      customerId: body.customerId,
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        variant: i.variant,
        unitPrice: Number(i.unitPrice),
        quantity: i.quantity,
        imageUrl: i.imageUrl,
        category: i.category,
      })),
    };
  }
}
