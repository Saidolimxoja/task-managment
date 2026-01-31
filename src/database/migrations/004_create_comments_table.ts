import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('content').notNullable();
    
    // Foreign keys
    table
      .uuid('task_id')
      .notNullable()
      .references('id')
      .inTable('tasks')
      .onDelete('CASCADE');
    table
      .uuid('author_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .uuid('parent_comment_id')
      .references('id')
      .inTable('comments')
      .onDelete('CASCADE'); // Для вложенных комментариев
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Индексы
    table.index(['task_id']);
    table.index(['author_id']);
    table.index(['parent_comment_id']);
    table.index(['created_at']); // Для сортировки по времени
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('comments');
}