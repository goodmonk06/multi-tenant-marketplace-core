import {
  Controller,
  Post,
  Body,
  Request,
  Headers,
  RawBodyRequest,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(
    @Request() req,
    @Body() body: { orderId: string },
  ) {
    return this.paymentsService.createPaymentIntent(body.orderId, req.tenantId);
  }

  @Post('webhook')
  @Public()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Request() req: RawBodyRequest<Request>,
  ) {
    // Note: NestJS needs to be configured to provide raw body for webhook verification
    // This would require middleware configuration in main.ts
    const payload = req.body as any;
    return this.paymentsService.handleWebhook(signature, payload);
  }
}
