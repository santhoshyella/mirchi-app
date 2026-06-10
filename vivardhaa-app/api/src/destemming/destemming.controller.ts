import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { DestemmingService } from './destemming.service';
import {
  CreateDestemmingJobDto,
  SendToPointDto,
  ReceiveFromPointDto,
  AddNoteDto,
} from './dto/destemming.dto';

@Controller('destemming')
export class DestemmingController {
  constructor(private readonly service: DestemmingService) {}

  /** GET /api/destemming?date=&variety=&status= */
  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('rangeStart') rangeStart?: string,
    @Query('rangeEnd') rangeEnd?: string,
    @Query('variety') variety?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({ date, rangeStart, rangeEnd, variety, status });
  }

  /** GET /api/destemming/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** POST /api/destemming */
  @Post()
  create(@Body() dto: CreateDestemmingJobDto) {
    return this.service.create(dto);
  }

  /** POST /api/destemming/:id/dispatches */
  @Post(':id/dispatches')
  sendToPoint(@Param('id') id: string, @Body() dto: SendToPointDto) {
    return this.service.sendToPoint(id, dto);
  }

  /** PATCH /api/destemming/:id/dispatches/:dispatchId/receive */
  @Patch(':id/dispatches/:dispatchId/receive')
  receiveFromPoint(
    @Param('id') id: string,
    @Param('dispatchId') dispatchId: string,
    @Body() dto: ReceiveFromPointDto,
  ) {
    return this.service.receiveFromPoint(id, dispatchId, dto);
  }

  /** POST /api/destemming/:id/notes */
  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() dto: AddNoteDto) {
    return this.service.addNote(id, dto);
  }
}
