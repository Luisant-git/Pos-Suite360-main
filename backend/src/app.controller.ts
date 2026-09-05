import { Controller, Get, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';
import type { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('upi-redirect')
  upiRedirect(@Query('pa') pa: string, @Query('pn') pn: string, @Query('tr') tr: string, @Query('am') am: string, @Res() res: Response) {
    const upiUrl = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&tr=${encodeURIComponent(tr)}&am=${am}&cu=INR`;
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pay ${pn}</title><meta http-equiv="refresh" content="0;url=${upiUrl}"></head><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>Opening UPI Payment...</h2><p>Amount: ₹${am}</p><p>To: ${pn}</p><a href="${upiUrl}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#1A63A8;color:white;border-radius:8px;text-decoration:none;font-weight:bold">Tap to Pay</a></body></html>`);
  }
}
