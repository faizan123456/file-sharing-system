import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppLoggerService } from '../../logger/logger.service';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly context = S3Service.name;

  private isS3AccessDenied(error: unknown): boolean {
    const maybeError = error as {
      name?: string;
      Code?: string;
      code?: string;
      $metadata?: { httpStatusCode?: number };
    };

    return (
      maybeError?.name === 'AccessDenied' ||
      maybeError?.Code === 'AccessDenied' ||
      maybeError?.code === 'AccessDenied' ||
      maybeError?.$metadata?.httpStatusCode === 403
    );
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.bucket = this.configService.get<string>('AWS_BUCKET_NAME', '');

    this.client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    this.logger.log(`Uploading file to S3: ${key}`, this.context);

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      const url = `https://${this.bucket}.s3.amazonaws.com/${key}`;
      this.logger.log(`File uploaded successfully: ${key}`, this.context);
      return url;
    } catch (error) {
      this.logger.error(
        `S3 upload failed for key: ${key}`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );

      if (this.isS3AccessDenied(error)) {
        throw new ForbiddenException(
          'Storage access denied. Check S3 IAM permissions for PutObject.',
        );
      }

      throw new InternalServerErrorException(
        'Failed to upload file to storage',
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    this.logger.log(`Deleting file from S3: ${key}`, this.context);

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`File deleted from S3: ${key}`, this.context);
    } catch (error) {
      this.logger.error(
        `S3 delete failed for key: ${key}`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );

      if (this.isS3AccessDenied(error)) {
        throw new ForbiddenException(
          'Storage access denied. Check S3 IAM permissions for DeleteObject.',
        );
      }

      throw new InternalServerErrorException(
        'Failed to delete file from storage',
      );
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn: expiresInSeconds,
      });

      this.logger.log(`Generated signed URL for: ${key}`, this.context);
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate signed URL for key: ${key}`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );

      if (this.isS3AccessDenied(error)) {
        throw new ForbiddenException(
          'Storage access denied. Check S3 IAM permissions for GetObject.',
        );
      }

      throw new InternalServerErrorException('Failed to generate file URL');
    }
  }
}
