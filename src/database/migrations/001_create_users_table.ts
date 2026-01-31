// 001_create_users.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('full_name', 255);

    // ← Используем те же значения, что в enum Role
    table
      .enum('role', ['ADMIN', 'DIRECTOR', 'ZAM_DIRECTOR', 'EMPLOYEE', 'VIEWER'])
      .notNullable()
      .defaultTo('EMPLOYEE');

    table.boolean('is_active').notNullable().defaultTo(true);

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Индексы
    table.index(['email']);
    table.index(['role']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('users');
}
