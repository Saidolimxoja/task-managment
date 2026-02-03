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
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary:
      'Получить ВСЕХ Пользователей даже ADMIN с хешированными паролями всех',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.ZAM_DIRECTOR)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  //get user by id yourself can ALL USERS ALL ROLES
  @ApiOperation({ summary: 'Получить Данные о себе' })
  @ApiBearerAuth('access-token')
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
  updateUSER(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user,
  ) {
    return this.usersService.update(id, updateUserDto, user.role);
  }

  @ApiOperation({ summary: 'Активировать Пользователя' })
  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('activate/:id')
  ActivateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }

  @ApiOperation({ summary: 'Деактивировать Пользователя' })
  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('deactivate/:id')
  DeactivateUSer(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  //DELETE ONLY ADMIN
  @ApiOperation({ summary: 'Удалить Пользователя' })
  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
