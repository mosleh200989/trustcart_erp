import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { HrmEmployees } from './hrm-employees.entity';

@Entity('hr_trips')
export class HrmTrips {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HrmEmployees, employee => employee.trips, { nullable: true, onDelete: 'SET NULL' })
  employee: HrmEmployees;

  @Column({ length: 100, nullable: true })
  trip_type: string;

  @Column({ length: 255, nullable: true })
  destination: string;

  @Column({ type: 'date', nullable: true })
  start_date: string;

  @Column({ type: 'date', nullable: true })
  end_date: string;

  @Column({ type: 'text', nullable: true })
  purpose: string;

  @Column({ length: 50, default: 'Planned' })
  status: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
