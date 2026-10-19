import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import {
  ApiCreateHotelDocs,
  ApiDeactivateHotelDocs,
  ApiGetHotelDocs,
  ApiListHotelsDocs,
  ApiUpdateHotelDocs,
} from '@quickdialog/swagger/decorators/hotels.decorator.js';
import { HotelsService } from './hotels.service.js';
import {
  createHotelSchema,
  hotelIdParamSchema,
  type CreateHotelDTO,
  type UpdateHotelDTO,
  updateHotelSchema,
} from './schemas/hotel.schema.js';

@ApiTags('Hotels')
@Roles(UserRole.SUPER_ADMIN)
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Post()
  @ApiCreateHotelDocs()
  create(@Body({ schema: createHotelSchema }) input: CreateHotelDTO) {
    return this.hotelsService.create(input);
  }

  @Get()
  @ApiListHotelsDocs()
  findAll() {
    return this.hotelsService.findAll();
  }

  @Get(':id')
  @ApiGetHotelDocs()
  findOne(@Param({ schema: hotelIdParamSchema }) { id }: { id: string }) {
    return this.hotelsService.findOne(id);
  }

  @Patch(':id')
  @ApiUpdateHotelDocs()
  update(
    @Param({ schema: hotelIdParamSchema }) { id }: { id: string },
    @Body({ schema: updateHotelSchema }) input: UpdateHotelDTO,
  ) {
    return this.hotelsService.update(id, input);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiDeactivateHotelDocs()
  deactivate(@Param({ schema: hotelIdParamSchema }) { id }: { id: string }) {
    return this.hotelsService.deactivate(id);
  }
}
