import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  HttpCode,
  HttpStatus,
  Body,
  ParseUUIDPipe,
  BadRequestException,
  ValidationPipe,
  UseFilters,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UploadFileDto } from './dto/upload-file.dto';
import { PaginationDto } from './dto/pagination.dto';
import { multerConfig } from './config/multer.config';
import { FILE_MESSAGES } from '../constants/app.constants';
import { MulterExceptionFilter } from './filters/multer-exception.filter';

type AuthRequest = Request & { user: JwtPayload };

@Controller()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @UseFilters(MulterExceptionFilter)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    )
    dto: UploadFileDto,
    @Req() req: AuthRequest,
  ) {
    if (!file || file.size === 0) {
      throw new BadRequestException(FILE_MESSAGES.NO_FILE);
    }
    const data = await this.filesService.uploadFile(req.user.userId, file, dto);
    return {
      success: true,
      message: FILE_MESSAGES.UPLOAD_SUCCESS,
      data,
    };
  }

  @Get('files')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserFiles(
    @Query() pagination: PaginationDto,
    @Req() req: AuthRequest,
  ) {
    const result = await this.filesService.getUserFiles(
      req.user.userId,
      pagination,
    );
    return {
      success: true,
      message: FILE_MESSAGES.LIST_SUCCESS,
      data: result,
    };
  }

  @Get('files/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getFileById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    const data = await this.filesService.getFileById(req.user.userId, id);
    return {
      success: true,
      message: FILE_MESSAGES.GET_SUCCESS,
      data,
    };
  }

  @Delete('files/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    await this.filesService.deleteFile(req.user.userId, id);
    return {
      success: true,
      message: FILE_MESSAGES.DELETE_SUCCESS,
      data: null,
    };
  }

  @Get('share/:publicId')
  @HttpCode(HttpStatus.OK)
  async shareFile(@Param('publicId') publicId: string) {
    const result = await this.filesService.getFileByPublicId(publicId);
    return {
      success: true,
      message: FILE_MESSAGES.SHARE_SUCCESS,
      data: result,
    };
  }
}
