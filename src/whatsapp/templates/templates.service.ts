import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { MetaGraphClient } from '../meta/meta-graph.client.js';
import { decryptMetaToken } from '../meta/meta-token.util.js';
import type { MetaTemplate, MetaTemplateButton, MetaTemplateRequestButton, MetaTemplateRequestComponent } from '../meta/meta.types.js';
import type { TemplateInput } from './template.schema.js';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly meta: MetaGraphClient) {}

  private async connection(hotelId: string) {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: { hotelId, status: 'CONNECTED', accessTokenEncrypted: { not: null } },
      orderBy: { updatedAt: 'desc' },
      select: { wabaId: true, accessTokenEncrypted: true },
    });
    if (!account?.accessTokenEncrypted) throw new BadRequestException('Connected WhatsApp account is required');
    return {
      wabaId: account.wabaId,
      token: decryptMetaToken(account.accessTokenEncrypted, this.config.getOrThrow<string>('meta.tokenEncryptionKey')),
    };
  }

  private async ownedTemplate(wabaId: string, token: string, id: string): Promise<MetaTemplate> {
    // Meta detail is addressed by global ID; check membership in this hotel's WABA first.
    let after: string | undefined;
    let hasNext = true;
    while (hasNext) {
      const page = await this.meta.listTemplates(wabaId, token, after);
      const found = page.data.find((item) => item.id === id);
      if (found) return found;
      const next = page.paging?.cursors?.after;
      hasNext = Boolean(page.paging?.next && next && next !== after);
      if (!hasNext) break;
      after = next;
    }
    throw new NotFoundException('WhatsApp template not found');
  }

  private present(template: MetaTemplate) {
    const header = template.components.find((part) => part.type === 'HEADER');
    const body = template.components.find((part) => part.type === 'BODY');
    const footer = template.components.find((part) => part.type === 'FOOTER');
    const buttons = template.components.find((part) => part.type === 'BUTTONS');
    const format = header?.format;
    const headerValue = format === 'TEXT'
      ? { type: 'TEXT', text: header?.text }
      : format === 'IMAGE' || format === 'VIDEO' || format === 'DOCUMENT'
        ? { type: format }
        : null;
    return {
      id: template.id,
      name: template.name,
      category: template.category,
      language: template.language,
      header: headerValue,
      body: typeof body?.text === 'string' ? body.text : '',
      footer: typeof footer?.text === 'string' ? footer.text : null,
      buttons: Array.isArray(buttons?.buttons) ? buttons.buttons.map((item: MetaTemplateButton) => ({
        type: item.type,
        text: item.text,
        ...(item.type === 'URL' ? { url: item.url } : {}),
        ...(item.type === 'PHONE_NUMBER' ? { phoneNumber: item.phone_number } : {}),
      })) : [],
      status: template.status,
      broadcastEligible: template.status === 'APPROVED',
      ...(template.status === 'REJECTED' && template.rejected_reason && template.rejected_reason !== 'NONE'
        ? { rejectionReason: template.rejected_reason }
        : {}),
    };
  }

  async list(hotelId: string, after?: string) {
    const { wabaId, token } = await this.connection(hotelId);
    const page = await this.meta.listTemplates(wabaId, token, after);
    return { data: page.data.map((item) => this.present(item)), paging: { after: page.paging?.next ? page.paging.cursors?.after ?? null : null } };
  }

  async detail(hotelId: string, id: string) {
    const { wabaId, token } = await this.connection(hotelId);
    await this.ownedTemplate(wabaId, token, id);
    return this.present(await this.meta.getTemplate(id, token));
  }

  private components(input: TemplateInput) {
    const names = new Map<string, number>();
    const convert = (text: string) => text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, name: string) => {
      if (!names.has(name)) names.set(name, names.size + 1);
      return `{{${names.get(name)}}}`;
    });
    const sample = (name: string): string => {
      const value = input.sampleValues?.[name];
      if (!value) throw new BadRequestException(`Sample value is required for ${name}`);
      return value;
    };
    const components: MetaTemplateRequestComponent[] = [];
    if (input.header) {
      if (input.header.type === 'TEXT') {
        const text = convert(input.header.text);
        components.push({ type: 'HEADER', format: 'TEXT', text, ...(names.size ? { example: { header_text: [...names.keys()].map(sample) } } : {}) });
      } else components.push({ type: 'HEADER', format: input.header.type, example: { header_handle: [input.header.mediaHandle] } });
    }
    names.clear();
    const body = convert(input.body);
    components.push({ type: 'BODY', text: body, ...(names.size ? { example: { body_text: [[...names.keys()].map(sample)] } } : {}) });
    if (input.footer) components.push({ type: 'FOOTER', text: input.footer });
    if (input.buttons.length) {
      const buttons: MetaTemplateRequestButton[] = input.buttons.map((button) => {
        if (button.type === 'URL') return { type: button.type, text: button.text, url: button.url };
        if (button.type === 'PHONE_NUMBER') return { type: button.type, text: button.text, phone_number: button.phoneNumber };
        return { type: button.type, text: button.text };
      });
      components.push({ type: 'BUTTONS', buttons });
    }
    return components;
  }

  async create(hotelId: string, input: TemplateInput) {
    const { wabaId, token } = await this.connection(hotelId);
    const components = this.components(input);
    const submitted = await this.meta.createTemplate(wabaId, token, { name: input.name, language: input.language, category: input.category, components });
    if (!submitted || typeof submitted.id !== 'string' || !submitted.id.trim() || typeof submitted.status !== 'string' || !submitted.status.trim() || typeof submitted.category !== 'string' || !submitted.category.trim()) {
      throw new BadGatewayException('Meta did not confirm template submission');
    }
    return this.present({ id: submitted.id, name: input.name, language: input.language, category: submitted.category, status: submitted.status, components });
  }

  async uploadMedia(hotelId: string, file: Buffer, fileName: string, mimeType: string) {
    if (!Buffer.isBuffer(file) || file.length === 0 || file.length > 15 * 1024 * 1024) throw new BadRequestException('Media file must be between 1 byte and 15 MB');
    if (!['image/jpeg', 'image/png', 'video/mp4'].includes(mimeType)) throw new BadRequestException('Unsupported media type');
    if (typeof fileName !== 'string' || !fileName || fileName.length > 128 || fileName.includes('/') || fileName.includes('\\') || Array.from(fileName).some((char) => char.charCodeAt(0) < 32)) throw new BadRequestException('Invalid media file name');
    const { token } = await this.connection(hotelId);
    const mediaHandle = await this.meta.uploadTemplateMedia(token, file, fileName, mimeType);
    if (typeof mediaHandle !== 'string' || !mediaHandle.trim()) throw new BadGatewayException('Meta returned no template media handle');
    return { mediaHandle };
  }

  async edit(hotelId: string, id: string, input: TemplateInput) {
    const { wabaId, token } = await this.connection(hotelId);
    const current = await this.ownedTemplate(wabaId, token, id);
    if (input.name !== current.name || input.language !== current.language) throw new BadRequestException('Template name and language cannot be edited');
    const response = await this.meta.editTemplate(id, token, { category: input.category, components: this.components(input) });
    if (response?.success !== true || response.id !== id) throw new BadGatewayException('Meta did not confirm template update');
    return this.present(await this.meta.getTemplate(id, token));
  }

  async delete(hotelId: string, id: string) {
    const { wabaId, token } = await this.connection(hotelId);
    const current = await this.ownedTemplate(wabaId, token, id);
    await this.meta.deleteTemplate(wabaId, id, current.name, token);
  }
}
