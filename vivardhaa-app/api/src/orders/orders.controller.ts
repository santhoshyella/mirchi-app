import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  AdvanceOrderDto,
  SettleOrderDto,
  CancelOrderDto,
  AddAllocationDto,
  AssignOrderDto,
} from './dto/orders.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  /** GET /api/orders?date=&variety=&stage=&customer= */
  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('rangeStart') rangeStart?: string,
    @Query('rangeEnd') rangeEnd?: string,
    @Query('variety') variety?: string,
    @Query('stage') stage?: string,
    @Query('customer') customer?: string,
  ) {
    return this.service.findAll({
      date,
      rangeStart,
      rangeEnd,
      variety,
      stage: stage ? parseInt(stage, 10) : undefined,
      customer,
    });
  }

  /** GET /api/orders/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** POST /api/orders */
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.service.create(dto);
  }

  /** PATCH /api/orders/:id/advance */
  @Patch(':id/advance')
  advance(@Param('id') id: string, @Body() dto: AdvanceOrderDto) {
    return this.service.advance(id, dto);
  }

  /** PATCH /api/orders/:id/settle */
  @Patch(':id/settle')
  settle(@Param('id') id: string, @Body() dto: SettleOrderDto) {
    return this.service.settle(id, dto);
  }

  /** PATCH /api/orders/:id/cancel */
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.service.cancel(id, dto);
  }

  /** POST /api/orders/:id/allocations */
  @Post(':id/allocations')
  addAllocation(@Param('id') id: string, @Body() dto: AddAllocationDto) {
    return this.service.addAllocation(id, dto);
  }

  /** DELETE /api/orders/:id/allocations/:allocId */
  @Delete(':id/allocations/:allocId')
  removeAllocation(
    @Param('id') id: string,
    @Param('allocId') allocId: string,
  ) {
    return this.service.removeAllocation(id, allocId);
  }

  /** PATCH /api/orders/:id/assign */
  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignOrderDto) {
    return this.service.assign(id, dto);
  }
}
