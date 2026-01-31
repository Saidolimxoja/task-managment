import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knex, { Knex } from 'knex';

@Injectable()
export class KnexService implements OnModuleInit, OnModuleDestroy {
  public constructor(private readonly configService: ConfigService) {}
  public knex: Knex;

  async onModuleInit() {
    this.knex = knex({
      client: 'pg',
      connection: {
        host: this.configService.getOrThrow<string>('DB_HOST'),
        port: this.configService.getOrThrow<number>('DB_PORT'),
        user: this.configService.getOrThrow<string>('DB_USER'),
        password: this.configService.getOrThrow<string>('DB_PASSWORD'),
        database: this.configService.getOrThrow<string>('DB_NAME'),
      },
      migrations: {
        directory: './src/database/migrations',
      },
    });
  }

  async onModuleDestroy() {
    await this.knex.destroy();
  }
}
