import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import {
  APP_STATUS_CODES,
  USER_MESSAGES,
  SECURITY,
  POSTGRES_ERROR_CODES,
} from '../constants/app.constants';
import { DatabaseErrorService } from '../database/services/database-error.service';
import { RegisterDto } from '../auth/dto/register.dto';
import { AppLoggerService } from '../logger/logger.service';

@Injectable()
export class UsersService {
  private readonly context = UsersService.name;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly databaseErrorService: DatabaseErrorService,
    private readonly logger: AppLoggerService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug(`findByEmail: ${email}`, this.context);
    try {
      return await this.usersRepository.findOne({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      this.logger.error(
        `DB error in findByEmail: ${email}`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );
      throw new InternalServerErrorException('Database query failed');
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    this.logger.debug(`findByUsername: ${username}`, this.context);
    try {
      return await this.usersRepository.findOne({ where: { username } });
    } catch (error) {
      this.logger.error(
        `DB error in findByUsername: ${username}`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );
      throw new InternalServerErrorException('Database query failed');
    }
  }

  async findById(id: string): Promise<User | null> {
    this.logger.debug(`findById: ${id}`, this.context);
    try {
      return await this.usersRepository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(
        `DB error in findById: ${id}`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );
      throw new InternalServerErrorException('Database query failed');
    }
  }

  async createUser(
    createUserDto: RegisterDto,
  ): Promise<Omit<User, 'password'>> {
    this.logger.log(`Creating user: ${createUserDto.email}`, this.context);
    const username = createUserDto.username.trim();
    const email = createUserDto.email.trim().toLowerCase();
    const password = createUserDto.password;

    if (!username || !email || !password) {
      throw new BadRequestException({
        statusCode: APP_STATUS_CODES.BAD_REQUEST,
        message: USER_MESSAGES.REQUIRED_FIELDS,
      });
    }

    const existingEmail = await this.findByEmail(email);
    if (existingEmail) {
      this.logger.warn(`Email already exists: ${email}`, this.context);
      throw new BadRequestException({
        statusCode: APP_STATUS_CODES.BAD_REQUEST,
        message: USER_MESSAGES.EMAIL_EXISTS,
      });
    }

    const existingUsername = await this.findByUsername(username);
    if (existingUsername) {
      this.logger.warn(`Username already taken: ${username}`, this.context);
      throw new BadRequestException({
        statusCode: APP_STATUS_CODES.BAD_REQUEST,
        message: USER_MESSAGES.USERNAME_EXISTS,
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      SECURITY.PASSWORD_SALT_ROUNDS,
    );

    const user = this.usersRepository.create({
      username,
      email,
      password: hashedPassword,
    });

    try {
      const savedUser = await this.usersRepository.save(user);
      this.logger.log(`User created: ${savedUser.id}`, this.context);
      return this.toSafeUser(savedUser);
    } catch (error) {
      const meta = this.databaseErrorService.getMetadata(error);
      if (
        meta.isQueryFailed &&
        meta.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION
      ) {
        this.logger.warn(`Duplicate user constraint: ${email}`, this.context);
        throw new BadRequestException({
          statusCode: APP_STATUS_CODES.BAD_REQUEST,
          message: USER_MESSAGES.DUPLICATE_USER,
        });
      }
      if (meta.isQueryFailed) {
        this.databaseErrorService.throwQueryFailed();
      }
      this.databaseErrorService.throwOperationFailed();
    }
  }

  private toSafeUser(user: User): Omit<User, 'password'> {
    const { password, ...safeUser } = user;
    void password;
    return safeUser;
  }
}
