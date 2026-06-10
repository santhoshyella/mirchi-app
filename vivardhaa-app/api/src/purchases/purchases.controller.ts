import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import {
  AdvancePurchaseDto,
  RejectPurchaseDto,
  SettlePurchaseDto,
  RequestInfoDto,
  AssignPurchaseDto,
  AddNoteDto,
} from './dto/purchase-action.dto';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  /** GET /api/purchases?date=&rangeStart=&rangeEnd=&variety=&stage= */
  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('rangeStart') rangeStart?: string,
    @Query('rangeEnd') rangeEnd?: string,
    @Query('variety') variety?: string,
    @Query('stage') stage?: string,
  ) {
    return this.service.findAll({
      date,
      rangeStart,
      rangeEnd,
      variety,
      stage: stage ? parseInt(stage, 10) : undefined,
    });
  }

  /** GET /api/purchases/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** POST /api/purchases */
  @Post()
  create(@Body() dto: CreatePurchaseDto) {
    return this.service.create(dto);
  }

  /** PATCH /api/purchases/:id — update stage-1 fields */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseDto) {
    return this.service.update(id, dto);
  }

  /** PATCH /api/purchases/:id/advance */
  @Patch(':id/advance')
  advance(@Param('id') id: string, @Body() dto: AdvancePurchaseDto) {
    return this.service.advance(id, dto);
  }

  /** PATCH /api/purchases/:id/reject */
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectPurchaseDto) {
    return this.service.reject(id, dto);
  }

  /** PATCH /api/purchases/:id/settle */
  @Patch(':id/settle')
  settle(@Param('id') id: string, @Body() dto: SettlePurchaseDto) {
    return this.service.settle(id, dto);
  }

  /** PATCH /api/purchases/:id/request-info */
  @Patch(':id/request-info')
  requestInfo(@Param('id') id: string, @Body() dto: RequestInfoDto) {
    return this.service.requestInfo(id, dto);
  }

  /** PATCH /api/purchases/:id/assign */
  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignPurchaseDto) {
    return this.service.assign(id, dto);
  }

  /** POST /api/purchases/:id/note */
  @Post(':id/note')
  addNote(@Param('id') id: string, @Body() dto: AddNoteDto) {
    return this.service.addNote(id, dto);
  }
}
