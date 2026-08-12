import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { ALL_ENTITIES } from './database/entities.js';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { DailyModule } from './daily/daily.module.js';
import { LeaderboardsModule } from './leaderboards/leaderboards.module.js';
import { ChatModule } from './chat/chat.module.js';
import { MatchesModule } from './matches/matches.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: ALL_ENTITIES,
        synchronize: false,
        migrationsRun: false,
      }),
    }),
    AuthModule,
    DailyModule,
    LeaderboardsModule,
    ChatModule,
    MatchesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
