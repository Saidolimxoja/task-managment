import { Global, Module } from "@nestjs/common";
import { KnexService } from "./knex.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import Knex from "knex";

export const KNEX_CONNECTION = 'KNEX_CONNECTION'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: KNEX_CONNECTION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return Knex({
          client: 'pg',  
          connection: {
            host: configService.get('DB_HOST'),
            port: configService.get('DB_PORT'),
            user: configService.get('DB_USER'),
            password: configService.get('DB_PASSWORD'),
            database: configService.get('DB_NAME'),
          },
        });
      },
    },
    KnexService
  ],
  exports:[KnexService ,KNEX_CONNECTION]
})
export class DatabaseModule {}