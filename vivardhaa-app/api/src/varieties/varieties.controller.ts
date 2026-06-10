import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { VarietiesService } from './varieties.service';
import {
  CreateMarkDto,
  CreateVarietyDto,
  UpdateMarkDto,
  UpdateVarietyDto,
} from './dto/varieties.dto';

@Controller('varieties')
export class VarietiesController {
  constructor(private readonly svc: VarietiesService) {}

  // ── Varieties ──────────────────────────────────────────────────────────────

  @Get()
  listVarieties() {
    return this.svc.findAllVarieties();
  }

  @Get(':id')
  getVariety(@Param('id') id: string) {
    return this.svc.findOneVariety(id);
  }

  @Post()
  createVariety(@Body() dto: CreateVarietyDto) {
    return this.svc.createVariety(dto);
  }

  @Patch(':id')
  updateVariety(@Param('id') id: string, @Body() dto: UpdateVarietyDto) {
    return this.svc.updateVariety(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteVariety(@Param('id') id: string) {
    return this.svc.deleteVariety(id);
  }

  // ── Marks ──────────────────────────────────────────────────────────────────

  @Get(':varietyId/marks')
  listMarks(@Param('varietyId') varietyId: string) {
    return this.svc.findMarksForVariety(varietyId);
  }

  @Post(':varietyId/marks')
  createMark(@Param('varietyId') varietyId: string, @Body() dto: CreateMarkDto) {
    return this.svc.createMark(varietyId, dto);
  }

  @Patch(':varietyId/marks/:markId')
  updateMark(
    @Param('varietyId') varietyId: string,
    @Param('markId') markId: string,
    @Body() dto: UpdateMarkDto,
  ) {
    return this.svc.updateMark(varietyId, markId, dto);
  }

  @Delete(':varietyId/marks/:markId')
  @HttpCode(204)
  deleteMark(
    @Param('varietyId') varietyId: string,
    @Param('markId') markId: string,
  ) {
    return this.svc.deleteMark(varietyId, markId);
  }
}
