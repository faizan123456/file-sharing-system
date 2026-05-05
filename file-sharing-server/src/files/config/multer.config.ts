import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { FILE_LIMITS } from '../../constants/app.constants';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'video/mp4',
  'audio/mpeg',
  'application/vnd.ms-excel',
  'text/csv',
];

export const multerConfig: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: FILE_LIMITS.MAX_SIZE_BYTES,
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ): void => {
    if (!file?.originalname?.trim()) {
      callback(null, false);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new BadRequestException(
          `File type '${file.mimetype}' is not allowed`,
        ) as unknown as Error,
        false,
      );
      return;
    }
    callback(null, true);
  },
};
