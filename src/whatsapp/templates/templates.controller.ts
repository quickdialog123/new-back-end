import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import {
  templateIdSchema,
  templateInputSchema,
  templateListSchema,
  type TemplateInput,
  type TemplateIdParamDto,
  type TemplateListQueryDto,
} from './template.schema.js';
import { TemplatesService } from './templates.service.js';
import {
  ApiCreateTemplateDocs,
  ApiDeleteTemplateDocs,
  ApiGetTemplateDocs,
  ApiListTemplatesDocs,
  ApiUpdateTemplateDocs,
  ApiUploadTemplateMediaDocs,
} from '@quickdialog/swagger/decorators/templates.decorator.js';

@ApiTags('WhatsApp Templates')
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('whatsapp/templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  @ApiListTemplatesDocs()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query({ schema: templateListSchema }) query: TemplateListQueryDto,
  ) {
    return this.templates.list(user.hotelId!, query.after);
  }

  @Get(':id')
  @ApiGetTemplateDocs()
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: templateIdSchema }) { id }: TemplateIdParamDto,
  ) {
    return this.templates.detail(user.hotelId!, id);
  }

  @Post()
  @ApiCreateTemplateDocs()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: templateInputSchema }) input: TemplateInput,
  ) {
    return this.templates.create(user.hotelId!, input);
  }

  @Post('media')
  @ApiUploadTemplateMediaDocs()
  uploadMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('content-type') contentType: string,
    @Headers('x-file-name') fileName: string,
    @Body() file: Buffer,
  ) {
    return this.templates.uploadMedia(
      user.hotelId!,
      file,
      fileName,
      contentType,
    );
  }

  @Patch(':id')
  @ApiUpdateTemplateDocs()
  edit(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: templateIdSchema }) { id }: TemplateIdParamDto,
    @Body({ schema: templateInputSchema }) input: TemplateInput,
  ) {
    return this.templates.edit(user.hotelId!, id, input);
  }

  @Delete(':id')
  @ApiDeleteTemplateDocs()
  @HttpCode(204)
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: templateIdSchema }) { id }: TemplateIdParamDto,
  ) {
    return this.templates.delete(user.hotelId!, id);
  }
}
