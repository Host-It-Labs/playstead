import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 24 }) handle!: string;
  @Index({ unique: true })
  @Column({ name: 'handle_normalized', type: 'varchar', length: 24 })
  handleNormalized!: string;
  @Column({ name: 'password_hash', type: 'varchar', length: 72 }) passwordHash!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity({ name: 'daily_sessions' })
@Unique('uq_daily_session_user_date', ['userId', 'puzzleDate'])
export class DailySessionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
  @Index()
  @Column({ name: 'puzzle_date', type: 'date' })
  puzzleDate!: string;
  @Column({ name: 'target_ids', type: 'jsonb' }) targetIds!: string[];
  @Column({ name: 'current_round', type: 'smallint', default: 1 }) currentRound!: number;
  @Column({ name: 'total_score', type: 'integer', default: 0 }) totalScore!: number;
  @Column({ type: 'varchar', length: 16, default: 'in_progress' }) status!:
    'in_progress' | 'completed';
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity({ name: 'daily_puzzles' })
export class DailyPuzzleEntity {
  @PrimaryColumn({ name: 'puzzle_date', type: 'date' }) puzzleDate!: string;
  @Column({ name: 'target_ids', type: 'jsonb' }) targetIds!: string[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity({ name: 'daily_guesses' })
@Unique('uq_daily_guess_session_round', ['sessionId', 'round'])
export class DailyGuessEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index()
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;
  @ManyToOne(() => DailySessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: DailySessionEntity;
  @Column({ type: 'smallint' }) round!: number;
  @Column({ name: 'target_id', type: 'varchar', length: 64 }) targetId!: string;
  @Column({ name: 'guess_lat', type: 'double precision' }) guessLat!: number;
  @Column({ name: 'guess_lng', type: 'double precision' }) guessLng!: number;
  @Column({ name: 'distance_km', type: 'double precision' }) distanceKm!: number;
  @Column({ type: 'integer' }) score!: number;
  @CreateDateColumn({ name: 'guessed_at', type: 'timestamptz' }) guessedAt!: Date;
}

@Entity({ name: 'chat_rooms' })
export class ChatRoomEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 16 }) kind!: 'commons' | 'circle';
  @Column({ type: 'varchar', length: 48 }) name!: string;
  @Index({ unique: true, where: 'invite_code IS NOT NULL' })
  @Column({ name: 'invite_code', type: 'varchar', length: 12, nullable: true })
  inviteCode!: string | null;
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true }) createdById!: string | null;
  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: UserEntity | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity({ name: 'chat_room_members' })
export class ChatRoomMemberEntity {
  @PrimaryColumn({ name: 'room_id', type: 'uuid' }) roomId!: string;
  @ManyToOne(() => ChatRoomEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: ChatRoomEntity;
  @PrimaryColumn({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' }) joinedAt!: Date;
}

@Entity({ name: 'chat_messages' })
@Unique('uq_chat_message_user_nonce', ['userId', 'clientNonce'])
export class ChatMessageEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index()
  @Column({ name: 'room_id', type: 'uuid' })
  roomId!: string;
  @ManyToOne(() => ChatRoomEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: ChatRoomEntity;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
  @Column({ type: 'text', nullable: true }) body!: string | null;
  @Column({ name: 'client_nonce', type: 'uuid', nullable: true }) clientNonce!: string | null;
  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}

@Entity({ name: 'matches' })
export class MatchEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 10 })
  code!: string;
  @Column({ type: 'varchar', length: 16 }) visibility!: 'public' | 'private';
  @Index()
  @Column({ type: 'varchar', length: 20, default: 'lobby' })
  state!: 'lobby' | 'round_open' | 'round_reveal' | 'finished';
  @Column({ name: 'host_user_id', type: 'uuid' }) hostUserId!: string;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_user_id' })
  host!: UserEntity;
  @Column({ name: 'target_ids', type: 'jsonb' }) targetIds!: string[];
  @Column({ name: 'current_round', type: 'smallint', default: 0 }) currentRound!: number;
  @Column({ name: 'deadline_at', type: 'timestamptz', nullable: true }) deadlineAt!: Date | null;
  @Column({ name: 'reveal_ends_at', type: 'timestamptz', nullable: true })
  revealEndsAt!: Date | null;
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true }) startedAt!: Date | null;
  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true }) finishedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity({ name: 'match_players' })
@Unique('uq_match_player', ['matchId', 'userId'])
export class MatchPlayerEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index()
  @Column({ name: 'match_id', type: 'uuid' })
  matchId!: string;
  @ManyToOne(() => MatchEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match!: MatchEntity;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
  @Column({ type: 'boolean', default: false }) ready!: boolean;
  @Column({ name: 'total_score', type: 'integer', default: 0 }) totalScore!: number;
  @Column({ name: 'round_score', type: 'integer', nullable: true }) roundScore!: number | null;
  @Column({ name: 'has_guessed', type: 'boolean', default: false }) hasGuessed!: boolean;
  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' }) joinedAt!: Date;
}

@Entity({ name: 'match_guesses' })
@Unique('uq_match_guess_player_round', ['matchId', 'userId', 'round'])
export class MatchGuessEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index()
  @Column({ name: 'match_id', type: 'uuid' })
  matchId!: string;
  @ManyToOne(() => MatchEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match!: MatchEntity;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
  @Column({ type: 'smallint' }) round!: number;
  @Column({ name: 'target_id', type: 'varchar', length: 64 }) targetId!: string;
  @Column({ name: 'guess_lat', type: 'double precision' }) guessLat!: number;
  @Column({ name: 'guess_lng', type: 'double precision' }) guessLng!: number;
  @Column({ name: 'distance_km', type: 'double precision' }) distanceKm!: number;
  @Column({ type: 'integer' }) score!: number;
  @CreateDateColumn({ name: 'guessed_at', type: 'timestamptz' }) guessedAt!: Date;
}

export const ALL_ENTITIES = [
  UserEntity,
  DailyPuzzleEntity,
  DailySessionEntity,
  DailyGuessEntity,
  ChatRoomEntity,
  ChatRoomMemberEntity,
  ChatMessageEntity,
  MatchEntity,
  MatchPlayerEntity,
  MatchGuessEntity,
];
