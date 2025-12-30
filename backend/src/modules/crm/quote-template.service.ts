import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoteTemplate } from './entities/quote-template.entity';
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { join } from 'path';

@Injectable()
export class QuoteTemplateService {
  constructor(
    @InjectRepository(QuoteTemplate)
    private templateRepository: Repository<QuoteTemplate>,
  ) {}

  async getAllTemplates() {
    return this.templateRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' }
    });
  }

  async getTemplateById(id: number) {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Quote template not found');
    return template;
  }

  async getDefaultTemplate() {
    return this.templateRepository.findOne({
      where: { isDefault: true, isActive: true }
    });
  }

  async createTemplate(data: Partial<QuoteTemplate>, createdBy?: number) {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.templateRepository.update(
        { isDefault: true },
        { isDefault: false }
      );
    }

    const template = this.templateRepository.create({
      ...data,
      createdBy: createdBy
    });
    return this.templateRepository.save(template);
  }

  async updateTemplate(id: number, data: Partial<QuoteTemplate>) {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.templateRepository.update(
        { isDefault: true },
        { isDefault: false }
      );
    }

    await this.templateRepository.update(id, data);
    return this.getTemplateById(id);
  }

  async deleteTemplate(id: number) {
    const template = await this.getTemplateById(id);
    if (template.isDefault) {
      throw new Error('Cannot delete default template');
    }
    template.isActive = false;
    return this.templateRepository.save(template);
  }

  async setAsDefault(id: number) {
    // Unset current default
    await this.templateRepository.update(
      { isDefault: true },
      { isDefault: false }
    );

    // Set new default
    await this.templateRepository.update(id, { isDefault: true });
    return this.getTemplateById(id);
  }

  // Generate PDF from quote
  async generateQuotePDF(quoteData: any, templateId?: number): Promise<string> {
    let template = null;
    
    if (templateId) {
      template = await this.getTemplateById(templateId);
    } else {
      template = await this.getDefaultTemplate();
    }

    if (!template) {
      throw new NotFoundException('No template available');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const fileName = `quote-${quoteData.quoteNumber}-${Date.now()}.pdf`;
        const filePath = join(process.cwd(), 'uploads', 'quotes', fileName);
        const stream = createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('QUOTATION', { align: 'center' });
        doc.moveDown();

        if (template.headerContent) {
          doc.fontSize(10).text(template.headerContent);
          doc.moveDown();
        }

        // Quote details
        doc.fontSize(12).text(`Quote Number: ${quoteData.quoteNumber}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.text(`Valid Until: ${quoteData.validUntil ? new Date(quoteData.validUntil).toLocaleDateString() : 'N/A'}`);
        doc.moveDown();

        // Customer details
        doc.fontSize(14).text('Bill To:', { underline: true });
        doc.fontSize(10).text(quoteData.customer?.name || '');
        doc.text(quoteData.customer?.email || '');
        doc.text(quoteData.customer?.phone || '');
        doc.moveDown();

        // Line items table
        doc.fontSize(14).text('Items:', { underline: true });
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const itemCodeX = 50;
        const descriptionX = 150;
        const quantityX = 350;
        const priceX = 420;
        const amountX = 490;

        // Table header
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Item', itemCodeX, tableTop);
        doc.text('Description', descriptionX, tableTop);
        doc.text('Qty', quantityX, tableTop);
        doc.text('Price', priceX, tableTop);
        doc.text('Amount', amountX, tableTop);

        doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
        doc.moveDown();

        // Table rows
        doc.font('Helvetica');
        let currentY = doc.y;

        (quoteData.lineItems || []).forEach((item: any, index: number) => {
          doc.text(item.productName || item.description || `Item ${index + 1}`, itemCodeX, currentY, { width: 90 });
          doc.text(item.description || '', descriptionX, currentY, { width: 180 });
          doc.text(item.quantity.toString(), quantityX, currentY);
          doc.text(`$${Number(item.price).toFixed(2)}`, priceX, currentY);
          doc.text(`$${(item.quantity * item.price).toFixed(2)}`, amountX, currentY);
          currentY += 25;
        });

        doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
        doc.moveDown();

        // Totals
        const totalsX = 420;
        doc.fontSize(10);
        doc.text('Subtotal:', totalsX, doc.y);
        doc.text(`$${Number(quoteData.subtotal || 0).toFixed(2)}`, amountX, doc.y - 12);

        if (quoteData.tax) {
          doc.text('Tax:', totalsX, doc.y);
          doc.text(`$${Number(quoteData.tax).toFixed(2)}`, amountX, doc.y - 12);
        }

        if (quoteData.discount) {
          doc.text('Discount:', totalsX, doc.y);
          doc.text(`-$${Number(quoteData.discount).toFixed(2)}`, amountX, doc.y - 12);
        }

        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Total:', totalsX, doc.y);
        doc.text(`$${Number(quoteData.total || 0).toFixed(2)}`, amountX, doc.y - 15);

        doc.moveDown(2);

        // Terms and conditions
        if (template.termsAndConditions) {
          doc.fontSize(10).font('Helvetica-Bold').text('Terms and Conditions:');
          doc.font('Helvetica').fontSize(9).text(template.termsAndConditions);
          doc.moveDown();
        }

        // Payment terms
        if (template.paymentTerms) {
          doc.fontSize(10).font('Helvetica-Bold').text('Payment Terms:');
          doc.font('Helvetica').fontSize(9).text(template.paymentTerms);
          doc.moveDown();
        }

        // Footer
        if (template.footerContent) {
          doc.fontSize(9).text(template.footerContent, { align: 'center' });
        }

        doc.end();

        stream.on('finish', () => {
          resolve(`/uploads/quotes/${fileName}`);
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }
}
