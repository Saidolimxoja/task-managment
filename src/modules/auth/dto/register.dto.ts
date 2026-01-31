import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: [Role.EMPLOYEE , Role.VIEWER] })
  @IsEnum(Role)
  role: Role = Role.EMPLOYEE;
}
