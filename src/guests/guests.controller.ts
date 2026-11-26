import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import {
  ApiBulkCreateGuestsDocs,
  ApiBulkDeleteGuestsDocs,
  ApiCreateGuestDocs,
  ApiDeleteGuestDocs,
  ApiGetGuestDocs,
  ApiListGuestsDocs,
  ApiUpdateGuestDocs,
} from '@quickdialog/swagger/decorators/guests.decorator.js';
import {
  bulkCreateGuestsSchema,
  bulkDeleteGuestsSchema,
  createGuestSchema,
  guestIdParamSchema,
  type BulkCreateGuestsDTO,
  type BulkDeleteGuestsDTO,
  type CreateGuestDTO,
  type GuestIdParamDTO,
  type UpdateGuestDTO,
  updateGuestSchema,
} from './schemas/guest.schema.js';
import { GuestsService } from './guests.service.js';

@ApiTags('Guests')
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  @ApiCreateGuestDocs()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: createGuestSchema }) input: CreateGuestDTO,
  ) {
    return this.guestsService.create(user.hotelId!, input);
  }

  @Post('bulk')
  @ApiBulkCreateGuestsDocs()
  bulkCreate(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: bulkCreateGuestsSchema }) input: BulkCreateGuestsDTO,
  ) {
    return this.guestsService.createMany(user.hotelId!, input.guests);
  }

  @Get()
  @ApiListGuestsDocs()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.guestsService.findAll(user.hotelId!);
  }

  @Get(':id')
  @ApiGetGuestDocs()
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: guestIdParamSchema })
    { id }: GuestIdParamDTO,
  ) {
    return this.guestsService.findOne(user.hotelId!, id);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiBulkDeleteGuestsDocs()
  bulkRemove(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: bulkDeleteGuestsSchema }) input: BulkDeleteGuestsDTO,
  ) {
    return this.guestsService.removeMany(user.hotelId!, input.ids);
  }

  @Patch(':id')
  @ApiUpdateGuestDocs()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: guestIdParamSchema })
    { id }: GuestIdParamDTO,
    @Body({ schema: updateGuestSchema }) input: UpdateGuestDTO,
  ) {
    return this.guestsService.update(user.hotelId!, id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteGuestDocs()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: guestIdParamSchema })
    { id }: GuestIdParamDTO,
  ) {
    return this.guestsService.remove(user.hotelId!, id);
  }
}
