import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary:
      'Получить ВСЕХ Пользователей даже ADMIN с хешированными паролями всех',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  //get user by id yourself can ALL USERS ALL ROLES
  @ApiOperation({ summary: 'Получить Данные о себе' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  //UPGRATE ONLY ADMIN
  @ApiOperation({
    summary: 'Обновление Пользователя но только СВОЁ чужого нельзя',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    const userRole = req.user.role;
    return this.usersService.update(id, updateUserDto, userRole);
  }

  @ApiOperation({ summary: 'Активировать Пользователя' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('activate/:id')
  ActivateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }

  @ApiOperation({ summary: 'Деактивировать Пользователя' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('deactivate/:id')
  DeactivateUSer(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  //DELETE ONLY ADMIN
  @ApiOperation({ summary: 'Удалить Пользователя' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
