import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { RaasiService } from './raasi.service';
import { CreateRaasiBatchDto, MarkCollectedDto, AddRaasiNoteDto } from './dto/raasi.dto';

@Controller('raasi')
export class RaasiController {
  constructor(private readonly service: RaasiService) {}

  /** GET /api/raasi?date=&variety=&status=&sourceType= */
  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('rangeStart') rangeStart?: string,
    @Query('rangeEnd') rangeEnd?: string,
    @Query('variety') variety?: string,
    @Query('status') status?: string,
    @Query('sourceType') sourceType?: string,
  ) {
    return this.service.findAll({ date, rangeStart, rangeEnd, variety, status, sourceType });
  }

  /** GET /api/raasi/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** POST /api/raasi */
  @Post()
  create(@Body() dto: CreateRaasiBatchDto) {
    return this.service.create(dto);
  }

  /** PATCH /api/raasi/:id/collect */
  @Patch(':id/collect')
  markCollected(@Param('id') id: string, @Body() dto: MarkCollectedDto) {
    return this.service.markCollected(id, dto);
  }

  /** POST /api/raasi/:id/notes */
  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() dto: AddRaasiNoteDto) {
    return this.service.addNote(id, dto);
  }
}
