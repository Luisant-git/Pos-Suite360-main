import { Controller, Get, Post, Body, Param, UseGuards, Request, Query, Delete } from '@nestjs/common';
import { EstimationsService } from './estimations.service';
import { CreateEstimationDto } from './dto/create-estimation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('estimations')
@UseGuards(JwtAuthGuard)
export class EstimationsController {
  constructor(private readonly estimationsService: EstimationsService) {}

  @Post()
  create(@Body() createEstimationDto: CreateEstimationDto, @Request() req: any) {
    const userId = req.user?.userId || 1;
    return this.estimationsService.create(createEstimationDto, userId);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.estimationsService.findAll(query);
  }

  @Get('next-estimation-no')
  async getNextEstimationNo() {
    return { estimationNo: await this.estimationsService.getNextEstimationNo() };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.estimationsService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.estimationsService.remove(+id);
  }
}
