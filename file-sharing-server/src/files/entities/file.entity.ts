import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '../../users/entities/user.entity';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ length: 255 })
  originalName!: string;

  @Column({ type: 'bigint' })
  size!: number;

  @Column({ length: 255 })
  mimeType!: string;

  @Exclude()
  @Column({ length: 512 })
  s3Key!: string;

  @Column({ length: 512 })
  url!: string;

  @Index()
  @Column({ unique: true, length: 64 })
  publicId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  uploadedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiryTime!: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
