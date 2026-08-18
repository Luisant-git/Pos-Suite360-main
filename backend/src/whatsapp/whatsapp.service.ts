import { Injectable, OnModuleInit, Logger, BadRequestException } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(WhatsappService.name);
  private isReady = false;

  onModuleInit() {
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu'],
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      }
    });

    this.client.on('qr', (qr) => {
      this.logger.log('QR Code received, please scan it to authenticate:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.logger.log('WhatsApp Client is ready!');
    });

    this.client.on('authenticated', () => {
      this.logger.log('WhatsApp Client authenticated successfully.');
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error('WhatsApp Authentication failure', msg);
    });

    this.client.on('disconnected', async (reason) => {
      this.isReady = false;
      this.logger.warn('WhatsApp Client was disconnected', reason);
      try {
        await this.client.destroy();
      } catch (e) {
        // ignore destroy errors
      }
      // Restart client after a short delay
      setTimeout(() => {
        this.client.initialize().catch(e => this.logger.error('Re-init failed', e));
      }, 5000);
    });

    try {
      this.client.initialize().catch(e => this.logger.error('Init failed', e));
    } catch (e) {
      this.logger.error('Init failed synchronously', e);
    }
  }

  async sendPdf(phone: string, base64Pdf: string, filename: string, caption: string) {
    if (!this.isReady) {
      throw new BadRequestException('WhatsApp client is not ready yet. Please ensure the QR code is scanned in the server terminal.');
    }

    try {
      // Format phone number: remove any non-digit characters
      let formattedPhone = phone.replace(/\D/g, '');
      
      let contactId = await this.client.getNumberId(formattedPhone);
      
      // If not found, try common country codes based on user's location (India/Malaysia)
      if (!contactId && formattedPhone.length === 10) {
        contactId = await this.client.getNumberId(`91${formattedPhone}`);
      }
      if (!contactId && formattedPhone.startsWith('0')) {
        contactId = await this.client.getNumberId(`60${formattedPhone.substring(1)}`);
      }
      if (!contactId && formattedPhone.length === 9) {
        contactId = await this.client.getNumberId(`60${formattedPhone}`);
      }

      if (!contactId) {
        throw new Error('Phone number is not registered on WhatsApp. Please check the country code.');
      }

      const chatId = contactId._serialized;

      // Remove the data URL prefix if present (e.g. data:application/pdf;base64,...)
      const base64Data = base64Pdf.includes('base64,') 
        ? base64Pdf.split('base64,')[1] 
        : base64Pdf;

      // Create MessageMedia object
      const media = new MessageMedia('application/pdf', base64Data, filename);

      // Send the file with caption
      await this.client.sendMessage(chatId, media, { caption });
      
      this.logger.log(`PDF successfully sent to ${phone}`);
      return { success: true, message: 'PDF sent successfully' };
    } catch (error) {
      this.logger.error(`Failed to send PDF to ${phone}`, error);
      throw new BadRequestException('Failed to send WhatsApp message. Please check the phone number.');
    }
  }
}
