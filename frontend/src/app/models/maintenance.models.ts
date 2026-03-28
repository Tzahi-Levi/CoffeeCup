export type IntervalType = 'shots' | 'days';
export type TaskStatus = 'ok' | 'due-soon' | 'overdue';

export interface MaintenanceTask {
  id: string;
  name: string;
  icon: string;
  intervalType: IntervalType;
  intervalValue: number;
  lastCompletedAt: string | null;
  lastCompletedShots: number | null;
  isPreset: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceTaskPayload {
  name: string;
  icon: string;
  intervalType: IntervalType;
  intervalValue: number;
}

export interface MaintenanceSettings {
  totalShots: number;
}

export interface MaintenanceTaskView extends MaintenanceTask {
  status: TaskStatus;
  progressPercent: number;
  shotsUntilNext: number | null;
  daysUntilNext: number | null;
}
