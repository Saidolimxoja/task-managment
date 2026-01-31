import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title', 255).notNullable();
    table.text('description');
    table
      .enum('status', ['TODO', 'IN_PROGRESS', 'REVIEW', 'APPROVED', 'REJECTED'])
      .defaultTo('TODO');
    table
      .enum('priority', ['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
      .defaultTo('MEDIUM');

    // Foreign keys
    table
      .uuid('project_id')
      .notNullable()
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE');
    table
      .uuid('assignee_id')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table
      .uuid('creator_id')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table.timestamp('deadline');
    table.timestamp('completed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes для производительности
    table.index(['project_id']);
    table.index(['assignee_id']);
    table.index(['status']);
    table.index(['deadline']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('tasks');
}
