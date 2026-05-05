import { IsOptional, IsDateString, IsString } from 'class-validator';

export class UploadFileDto {
  @IsOptional()
  @IsString()
  file?: string;

  @IsOptional()
  @IsDateString()
  expiryTime?: string;
}
