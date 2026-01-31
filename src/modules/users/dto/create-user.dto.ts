import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    minLength: 6,
    description: 'Пароль (минимум 6 символов)',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Иван Иванов', description: 'Полное имя' })
  @IsString()
  fullName: string;

  @ApiProperty({
    example: Role.EMPLOYEE,
    enum: Role,
    enumName: 'Role',
    description: 'Роль пользователя (по умолчанию EMPLOYEE)',
    default: Role.EMPLOYEE,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.EMPLOYEE; // 👈 Опционально + значение по умолчанию
}
