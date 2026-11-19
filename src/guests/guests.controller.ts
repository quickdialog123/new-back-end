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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';

import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import {
  bulkCreateGuestsSchema,
  bulkDeleteGuestsSchema,
  createGuestSchema,
  guestIdParamSchema,
  type BulkCreateGuestsDTO,
  type BulkDeleteGuestsDTO,
  type CreateGuestDTO,
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
  @ApiOperation({
    summary: 'Create a guest for the authenticated user’s hotel',
  })
  @ApiResponse({ status: 201, description: 'Guest created' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: createGuestSchema }) input: CreateGuestDTO,
  ) {
    return this.guestsService.create(user.hotelId!, input);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Bulk create guests for the authenticated user’s hotel',
  })
  @ApiResponse({
    status: 201,
    description: 'Guests created; returns the count',
  })
  bulkCreate(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: bulkCreateGuestsSchema }) input: BulkCreateGuestsDTO,
  ) {
    return this.guestsService.createMany(user.hotelId!, input.guests);
  }

  @Get()
  @ApiOperation({ summary: 'List guests for the authenticated user’s hotel' })
  @ApiResponse({ status: 200, description: 'Guests returned' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.guestsService.findAll(user.hotelId!);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a guest' })
  @ApiResponse({ status: 200, description: 'Guest returned' })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: guestIdParamSchema })
    { id }: z.infer<typeof guestIdParamSchema>,
  ) {
    return this.guestsService.findOne(user.hotelId!, id);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk delete guests from the authenticated user’s hotel',
  })
  @ApiResponse({
    status: 200,
    description: 'Matching guests deleted; returns the count',
  })
  bulkRemove(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: bulkDeleteGuestsSchema }) input: BulkDeleteGuestsDTO,
  ) {
    return this.guestsService.removeMany(user.hotelId!, input.ids);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a guest' })
  @ApiResponse({ status: 200, description: 'Guest updated' })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: guestIdParamSchema })
    { id }: z.infer<typeof guestIdParamSchema>,
    @Body({ schema: updateGuestSchema }) input: UpdateGuestDTO,
  ) {
    return this.guestsService.update(user.hotelId!, id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a guest' })
  @ApiResponse({ status: 204, description: 'Guest deleted' })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: guestIdParamSchema })
    { id }: z.infer<typeof guestIdParamSchema>,
  ) {
    return this.guestsService.remove(user.hotelId!, id);
  }
}
