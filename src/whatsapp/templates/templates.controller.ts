import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import { templateIdSchema, templateInputSchema, templateListSchema, type TemplateInput } from './template.schema.js';
import { TemplatesService } from './templates.service.js';

@ApiTags('WhatsApp Templates')
@Roles(UserRole.OWNER)
@Controller('whatsapp/templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  private hotelId(user: AuthenticatedUser) {
    if (!user.hotelId) throw new BadRequestException('Authenticated user has no hotel');
    return user.hotelId;
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query({ schema: templateListSchema }) query: z.infer<typeof templateListSchema>) {
    return this.templates.list(this.hotelId(user), query.after);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthenticatedUser, @Param({ schema: templateIdSchema }) { id }: z.infer<typeof templateIdSchema>) {
    return this.templates.detail(this.hotelId(user), id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body({ schema: templateInputSchema }) input: TemplateInput) {
    return this.templates.create(this.hotelId(user), input);
  }

  @Post('media')
  uploadMedia(@CurrentUser() user: AuthenticatedUser, @Headers('content-type') contentType: string, @Headers('x-file-name') fileName: string, @Body() file: Buffer) {
    return this.templates.uploadMedia(this.hotelId(user), file, fileName, contentType);
  }

  @Patch(':id')
  edit(@CurrentUser() user: AuthenticatedUser, @Param({ schema: templateIdSchema }) { id }: z.infer<typeof templateIdSchema>, @Body({ schema: templateInputSchema }) input: TemplateInput) {
    return this.templates.edit(this.hotelId(user), id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@CurrentUser() user: AuthenticatedUser, @Param({ schema: templateIdSchema }) { id }: z.infer<typeof templateIdSchema>) {
    return this.templates.delete(this.hotelId(user), id);
  }
}
