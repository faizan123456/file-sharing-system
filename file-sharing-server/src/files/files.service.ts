import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  GoneException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { File } from './entities/file.entity';
import { S3Service } from './services/s3.service';
import { PaginationDto } from './dto/pagination.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { AppLoggerService } from '../logger/logger.service';
import { FILE_MESSAGES } from '../constants/app.constants';

@Injectable()
export class FilesService {
  private readonly context = FilesService.name;

  constructor(
    @InjectRepository(File)
    private readonly filesRepository: Repository<File>,
    private readonly s3Service: S3Service,
    private readonly logger: AppLoggerService,
  ) {}

  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    dto: UploadFileDto,
  ): Promise<File> {
    if (!file) {
      throw new BadRequestException(FILE_MESSAGES.NO_FILE);
    }

    this.logger.log(
      `User ${userId} uploading file: ${file.originalname}`,
      this.context,
    );

    const publicId = crypto.randomBytes(16).toString('hex');
    const ext = file.originalname.split('.').pop() ?? '';
    const s3Key = `uploads/${userId}/${publicId}${ext ? `.${ext}` : ''}`;

    const url = await this.s3Service.uploadFile(
      s3Key,
      file.buffer,
      file.mimetype,
    );

    const expiryTime = dto.expiryTime ? new Date(dto.expiryTime) : null;

    try {
      const entity = this.filesRepository.create({
        userId,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        s3Key,
        url,
        publicId,
        expiryTime,
      });

      const saved = await this.filesRepository.save(entity);
      this.logger.log(`File saved to DB: ${saved.id}`, this.context);
      return saved;
    } catch (error) {
      this.logger.error(
        `DB save failed after S3 upload, rolling back S3 key: ${s3Key}`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );
      await this.s3Service.deleteFile(s3Key).catch((rollbackErr: unknown) => {
        this.logger.error(
          `S3 rollback failed for key: ${s3Key}`,
          rollbackErr instanceof Error
            ? rollbackErr.stack
            : String(rollbackErr),
          this.context,
        );
      });
      throw new InternalServerErrorException('Failed to save file metadata');
    }
  }

  async getUserFiles(
    userId: string,
    pagination: PaginationDto,
  ): Promise<{ list: File[]; total: number; page: number; limit: number }> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    this.logger.log(
      `Listing files for user ${userId} (page ${page}, limit ${limit})`,
      this.context,
    );

    try {
      const [list, total] = await this.filesRepository
        .createQueryBuilder('file')
        .leftJoinAndSelect('file.user', 'user')
        .select([
          'file.id',
          'file.userId',
          'file.originalName',
          'file.size',
          'file.mimeType',
          'file.s3Key',
          'file.url',
          'file.publicId',
          'file.uploadedAt',
          'file.expiryTime',
          'user.id',
          'user.username',
          'user.email',
          'user.createdAt',
        ])
        .where('file.userId = :userId', { userId })
        .orderBy('file.uploadedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return { list, total, page, limit };
    } catch (error) {
      this.logger.error(
        `Failed to list files for user: ${userId}`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );
      throw new InternalServerErrorException('Failed to retrieve files');
    }
  }

  async getFileById(userId: string, fileId: string): Promise<File> {
    this.logger.log(`User ${userId} fetching file ${fileId}`, this.context);

    let file: File | null;
    try {
      file = await this.filesRepository
        .createQueryBuilder('file')
        .leftJoinAndSelect('file.user', 'user')
        .select([
          'file.id',
          'file.userId',
          'file.originalName',
          'file.size',
          'file.mimeType',
          'file.s3Key',
          'file.url',
          'file.publicId',
          'file.uploadedAt',
          'file.expiryTime',
          'user.id',
          'user.username',
          'user.email',
          'user.createdAt',
        ])
        .where('file.id = :fileId', { fileId })
        .getOne();
    } catch (error) {
      this.logger.error(
        `DB error fetching file: ${fileId}`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );
      throw new InternalServerErrorException('Failed to retrieve file');
    }

    if (!file) {
      this.logger.warn(`File not found: ${fileId}`, this.context);
      throw new NotFoundException(FILE_MESSAGES.NOT_FOUND);
    }

    if (file.userId !== userId) {
      this.logger.warn(
        `Forbidden: user ${userId} tried to access file ${fileId} owned by ${file.userId}`,
        this.context,
      );
      throw new ForbiddenException(FILE_MESSAGES.FORBIDDEN);
    }

    return file;
  }

  async deleteFile(userId: string, fileId: string): Promise<void> {
    this.logger.log(`User ${userId} deleting file ${fileId}`, this.context);

    const file = await this.getFileById(userId, fileId);

    await this.s3Service.deleteFile(file.s3Key);

    try {
      await this.filesRepository.remove(file);
      this.logger.log(`File deleted: ${fileId}`, this.context);
    } catch (error) {
      this.logger.error(
        `DB remove failed for file: ${fileId} (S3 already deleted)`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );
      throw new InternalServerErrorException('Failed to remove file record');
    }
  }

  async getFileByPublicId(
    publicId: string,
  ): Promise<{ url: string; file: File }> {
    this.logger.log(`Public share lookup: ${publicId}`, this.context);

    let file: File | null;
    try {
      file = await this.filesRepository
        .createQueryBuilder('file')
        .leftJoinAndSelect('file.user', 'user')
        .select([
          'file.id',
          'file.userId',
          'file.originalName',
          'file.size',
          'file.mimeType',
          'file.s3Key',
          'file.url',
          'file.publicId',
          'file.uploadedAt',
          'file.expiryTime',
          'user.id',
          'user.username',
          'user.email',
          'user.createdAt',
        ])
        .where('file.publicId = :publicId', { publicId })
        .getOne();
    } catch (error) {
      this.logger.error(
        `DB error on public share lookup: ${publicId}`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );
      throw new InternalServerErrorException('Failed to retrieve shared file');
    }

    if (!file) {
      this.logger.warn(`Public file not found: ${publicId}`, this.context);
      throw new NotFoundException(FILE_MESSAGES.NOT_FOUND);
    }

    if (file.expiryTime && new Date() > file.expiryTime) {
      this.logger.warn(`Share link expired: ${publicId}`, this.context);
      throw new GoneException(FILE_MESSAGES.EXPIRED);
    }

    const signedUrl = await this.s3Service.getSignedUrl(
      file.s3Key,
      3600,
      file.originalName,
    );
    return { url: signedUrl, file };
  }
}
