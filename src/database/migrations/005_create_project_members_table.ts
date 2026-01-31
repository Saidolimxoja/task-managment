import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('project_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign keys
    table
      .uuid('project_id')
      .notNullable()
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE');
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    
    table
      .enum('role', ['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'])
      .defaultTo('MEMBER');
    
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Уникальный индекс, чтобы пользователь не мог быть добавлен в проект дважды
    table.unique(['project_id', 'user_id']);
    
    // Индексы
    table.index(['project_id']);
    table.index(['user_id']);
    table.index(['role']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('project_members');
}