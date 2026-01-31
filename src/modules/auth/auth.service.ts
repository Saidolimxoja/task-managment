import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Knex } from 'knex';
import { KnexService } from 'src/database/knex.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/common/enums/role.enum';
import { LoginDto } from './dto/login.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly knexService: KnexService,
    private readonly jwtService: JwtService,
  ) {}

  private get knex(): Knex {
    return this.knexService.knex;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.knex('users')
      .where({
        email,
      })
      .select('id', 'email', 'full_name', 'role', 'password_hash')
      .first();

    if (!user) {
      throw new UnauthorizedException('Неверный Логин или Пароль');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.knex('users')
      .where({
        email: registerDto.email,
      })
      .first();

    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const [createdUser] = await this.knex('users')
      .insert({
        email: registerDto.email,
        password_hash: passwordHash,
        full_name: registerDto.fullName,
        role: Role.EMPLOYEE || Role.VIEWER,
      })
      .returning(['id', 'email', 'full_name', 'role']);

    if (!createdUser) {
      throw new BadRequestException('Не удалось создать пользователя');
    }

    const payload = {
      sub: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        fullName: createdUser.full_name,
        role: createdUser.role,
      },
    };
  }

  async getusers() {
    const result = await this.knex('users').select('*').returning('*');

    console.log(result);
    return result;
  }

  async validateUser(id: string) {
    const user = await this.knex('users')
      .where({ id })
      .select('id', 'email', 'full_name', 'role')
      .first();

    return user;
  }
}
