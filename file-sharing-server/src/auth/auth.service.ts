import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '../users/entities/user.entity';
import { AUTH_MESSAGES } from '../constants/app.constants';
import { AppLoggerService } from '../logger/logger.service';

export type SafeUser = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  private readonly context = AuthService.name;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly logger: AppLoggerService,
  ) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    this.logger.log(`Register attempt: ${dto.email}`, this.context);
    try {
      return await this.usersService.createUser(dto);
    } catch (error) {
      if (
        error instanceof InternalServerErrorException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      // Re-throw NestJS HTTP exceptions (BadRequestException etc.) as-is
      if ((error as { status?: number }).status) {
        throw error;
      }
      this.logger.error(
        `Unexpected error during registration: ${dto.email}`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );
      throw new InternalServerErrorException(
        'Registration failed unexpectedly',
      );
    }
  }

  async login(dto: LoginDto): Promise<{ user: SafeUser; token: string }> {
    this.logger.log(`Login attempt: ${dto.email}`, this.context);
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      this.logger.warn(
        `Login failed - user not found: ${dto.email}`,
        this.context,
      );
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    let passwordMatch: boolean;
    try {
      passwordMatch = await bcrypt.compare(dto.password, user.password);
    } catch (error) {
      this.logger.error(
        `bcrypt.compare failed for: ${dto.email}`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );
      throw new InternalServerErrorException('Login failed unexpectedly');
    }

    if (!passwordMatch) {
      this.logger.warn(
        `Login failed - wrong password: ${dto.email}`,
        this.context,
      );
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    let token: string;
    try {
      token = this.jwtService.sign(payload);
    } catch (error) {
      this.logger.error(
        `JWT signing failed for user: ${user.id}`,
        error instanceof Error ? error.stack : String(error),
        this.context,
      );
      throw new InternalServerErrorException('Login failed unexpectedly');
    }

    this.logger.log(`Login successful: ${user.id}`, this.context);
    const { password, ...safeUser } = user;
    void password;

    return { user: safeUser, token };
  }
}
