import { BadRequestException, Injectable } from '@nestjs/common';
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly databaseErrorService: DatabaseErrorService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async createUser(
    createUserDto: RegisterDto,
  ): Promise<Omit<User, 'password'>> {
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
      throw new BadRequestException({
        statusCode: APP_STATUS_CODES.BAD_REQUEST,
        message: USER_MESSAGES.EMAIL_EXISTS,
      });
    }

    const existingUsername = await this.findByUsername(username);
    if (existingUsername) {
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
      return this.toSafeUser(savedUser);
    } catch (error) {
      const meta = this.databaseErrorService.getMetadata(error);
      if (
        meta.isQueryFailed &&
        meta.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION
      ) {
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
