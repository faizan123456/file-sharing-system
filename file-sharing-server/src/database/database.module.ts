import { Global, Module } from '@nestjs/common';
import { DatabaseErrorService } from './services/database-error.service';

@Global()
@Module({
  providers: [DatabaseErrorService],
  exports: [DatabaseErrorService],
})
export class DatabaseModule {}
