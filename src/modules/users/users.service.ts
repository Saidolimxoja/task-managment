import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { Knex } from 'knex';
import { KnexService } from 'src/database/knex.service';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(private readonly knexService: KnexService) {}

  private get knex(): Knex {
    return this.knexService.knex;
  }

  async findAll() {
    const users = await this.knex('users').select('*').returning('*');

    return users;
  }

  async findOne(id: string) {
    try {
      const user = await this.knex('users').where({ id }).select('*').first();
      if (user == undefined) {
        throw new ForbiddenException(`Не существует пользователь с ID: ${id}`);
      }
      return user;
    } catch (error) {
     
      if (error.code === '22P02' && error.message.includes('uuid')) {
        throw new BadRequestException('Неверный формат идентификатора');
      }
      throw error; 
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto, userRole: string) {
    // 1️⃣ Проверка существования (один раз)
    const existing = await this.knex('users').where({ id }).first();
    if (!existing) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }

    // 2️⃣ Формируем updateData
    const updateData: any = {
      updated_at: this.knex.fn.now(),
    };

    // 3️⃣ Админ может менять роль, остальные — нет
    if (userRole === Role.ADMIN && updateUserDto.role !== undefined) {
      updateData.role = updateUserDto.role;
    }

    // 4️⃣ Общие поля (для всех)
    if (updateUserDto.fullName !== undefined) {
      updateData.full_name = updateUserDto.fullName;
    }

    if (updateUserDto.email !== undefined) {
      // TODO: Проверь уникальность email!
      updateData.email = updateUserDto.email;
    }

    if (updateUserDto.password !== undefined) {
      updateData.password_hash = await bcrypt.hash(updateUserDto.password, 10);
    }

    const [updatedUser] = await this.knex('users')
      .where({ id })
      .update(updateData)
      .returning('*');
    return {
      success: true,
      message: 'Профиль успешно обновлен',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        role: updatedUser.role,
      },
    };
  }

  async activateUser(id: string) {
    const updated = await this.knex('users')
      .where({ id })
      .update({ is_active: true });

    return updated > 0;
  }

  async deactivateUser(id: string) {
    const updated = await this.knex('users')
      .where({ id })
      .update({ is_active: false });

    return updated > 0;
  }

  async remove(id: string) {
    // Проверка существования
    const existing = await this.knex('users').where({ id }).first();

    if (!existing) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }

    // Удаление
    const deletedCount = await this.knex('users').where({ id }).delete();

    if (deletedCount === 0) {
      throw new BadRequestException('Не удалось удалить пользователя');
    }

    // Возвращаем информацию об удаленном пользователе
    return {
      success: true,
      message: `Пользователь "${existing.email}" успешно удален`,
      deletedUser: {
        id: existing.id,
        email: existing.email,
      },
    };
  }
}
