import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

export class SendPdfDto {
  phone: string;
  base64Pdf: string;
  filename: string;
  caption: string;
}

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('send-pdf')
  async sendPdf(@Body() body: SendPdfDto) {
    return this.whatsappService.sendPdf(body.phone, body.base64Pdf, body.filename, body.caption);
  }
}
