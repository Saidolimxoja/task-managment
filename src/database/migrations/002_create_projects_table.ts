import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('code', 50).unique().notNullable(); // Проектный код (например: PROJ-001)
    
    // Foreign keys
    table
      .uuid('owner_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    
    table
      .enum('status', ['ACTIVE', 'ARCHIVED', 'COMPLETED'])
      .defaultTo('ACTIVE');
    
    table.timestamp('start_date');
    table.timestamp('end_date');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Индексы
    table.index(['owner_id']);
    table.index(['status']);
    table.index(['code']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('projects');
}