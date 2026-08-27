import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { MetaWebhookGuard } from '../../../common/guards/meta-webhook.guard';
import {
  META_EVENT_ACK,
  META_HUB_SUBSCRIBE,
} from '../../../common/constants/meta-webhook.constants';
import { FacebookEventService } from './facebook-event.service';

/**
 * The public endpoint Meta calls.
 *
 * Two rules govern this controller:
 *
 *  1. The GET handler must answer the registration challenge as **plain text**.
 *     Returning JSON makes Meta reject the URL with a generic error.
 *
 *  2. The POST handler must return 200 immediately. Meta retries anything slow
 *     or non-2xx, and a retry means a duplicate reply to a real customer. So the
 *     response is sent first and the work is started without awaiting it — the
 *     event is already durably stored by the time any decision is made.
 */
@Controller('automation/webhook')
export class FacebookWebhookController {
  private readonly logger = new Logger(FacebookWebhookController.name);

  constructor(
    private readonly eventService: FacebookEventService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Registration handshake. Meta calls this once when you save the callback URL
   * in the App Dashboard, and again whenever you change it.
   */
  @Public()
  @Get('facebook')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
    const expected = String(
      this.configService.get<string>('META_WEBHOOK_VERIFY_TOKEN') ?? '',
    ).trim();

    if (!expected) {
      this.logger.error(
        'META_WEBHOOK_VERIFY_TOKEN is not set — Meta webhook verification will always fail. ' +
          'Set it to any random string and type the same string into the App Dashboard.',
      );
      res.status(500).send('verify token not configured');
      return;
    }

    if (mode === META_HUB_SUBSCRIBE && String(verifyToken ?? '') === expected) {
      this.logger.log('Meta webhook verification succeeded');
      // Plain text, not JSON — Meta compares the body byte for byte.
      res.status(200).type('text/plain').send(String(challenge ?? ''));
      return;
    }

    this.logger.warn(
      `Meta webhook verification failed (mode=${mode}). ` +
        'The token in the App Dashboard must match META_WEBHOOK_VERIFY_TOKEN exactly.',
    );
    res.status(403).send('verification failed');
  }

  /**
   * Event delivery. Answers 200 first, then processes.
   *
   * Errors are caught and logged rather than surfaced: a 500 here would make
   * Meta redeliver the same event, and a bug in our decision logic must not
   * turn into a stream of duplicate customer replies.
   */
  @Public()
  @Post('facebook')
  @HttpCode(200)
  @UseGuards(MetaWebhookGuard)
  receive(@Body() body: Record<string, any>, @Req() request: Request): string {
    const signatureValid = Boolean((request as any).metaSignatureValid);

    void this.eventService
      .processWebhook(body, signatureValid)
      .catch((error) =>
        this.logger.error(`Webhook processing failed: ${error?.message}`, error?.stack),
      );

    return META_EVENT_ACK;
  }

  /**
   * GET health check. Useful for confirming from a browser that nginx routes
   * the path through before pointing Meta at it.
   */
  @Public()
  @Get('facebook/health')
  health(): Record<string, any> {
    return {
      status: 'ok',
      webhook: 'facebook',
      verify_token_configured: Boolean(
        String(this.configService.get<string>('META_WEBHOOK_VERIFY_TOKEN') ?? '').trim(),
      ),
      app_secret_configured: Boolean(
        String(this.configService.get<string>('META_APP_SECRET') ?? '').trim(),
      ),
      timestamp: new Date().toISOString(),
    };
  }
}
