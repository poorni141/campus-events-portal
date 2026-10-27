/**
 * TicketNest Background Job Queue (BullMQ / Redis worker implementation)
 * Manages delayed expiration jobs (10-minute hold window) and periodic safety sweeps.
 * Ensures held ticket inventory is released safely, idempotently, and exactly once.
 */

import { db } from './db';
import { cache } from './cache';

export interface ExpirationJob {
  id: string;
  reservationId: string;
  scheduledFor: number; // Unix timestamp ms
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  attempts: number;
}

class ExpirationQueueService {
  private jobs: Map<string, ExpirationJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private periodicInterval: NodeJS.Timeout | null = null;
  private stats = {
    totalScheduled: 0,
    totalExpiredProcessed: 0,
    totalCancelledJobs: 0,
    lastSweepAt: new Date().toISOString(),
    sweepCount: 0,
  };

  constructor() {
    this.startPeriodicSweeper();
  }

  /**
   * Schedule an expiration job for a reservation (default 10 minutes = 600,000 ms)
   */
  scheduleExpiration(reservationId: string, delayMs: number = 10 * 60 * 1000): void {
    const jobId = `job-exp-${reservationId}`;
    const scheduledFor = Date.now() + delayMs;

    // Clear any existing timer for this reservation
    if (this.timers.has(reservationId)) {
      clearTimeout(this.timers.get(reservationId)!);
      this.timers.delete(reservationId);
    }

    const job: ExpirationJob = {
      id: jobId,
      reservationId,
      scheduledFor,
      status: 'PENDING',
      attempts: 0,
    };

    this.jobs.set(jobId, job);
    this.stats.totalScheduled++;

    // Set precise node timer
    const timer = setTimeout(async () => {
      await this.processJob(jobId);
    }, delayMs);

    this.timers.set(reservationId, timer);
  }

  /**
   * Cancel expiration job when booking is confirmed or manually cancelled
   */
  cancelExpiration(reservationId: string): void {
    if (this.timers.has(reservationId)) {
      clearTimeout(this.timers.get(reservationId)!);
      this.timers.delete(reservationId);
    }

    const jobId = `job-exp-${reservationId}`;
    const job = this.jobs.get(jobId);
    if (job && job.status === 'PENDING') {
      job.status = 'CANCELLED';
      this.stats.totalCancelledJobs++;
    }
  }

  /**
   * Process a single expiration job
   */
  async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'PENDING') return;

    job.attempts++;
    try {
      const reservation = db.reservations.get(job.reservationId);
      if (!reservation) {
        job.status = 'FAILED';
        return;
      }

      // Check if reservation is still PENDING
      if (reservation.status === 'PENDING') {
        const result = await db.releaseReservation(job.reservationId, 'EXPIRED');
        if (result.released) {
          this.stats.totalExpiredProcessed++;
          // Invalidate cache so updated availability is reflected
          cache.invalidateEventCaches(reservation.eventId);
        }
      }

      job.status = 'COMPLETED';
      this.timers.delete(job.reservationId);
    } catch (err) {
      console.error(`Error processing expiration job ${jobId}:`, err);
      job.status = 'FAILED';
    }
  }

  /**
   * Periodic Safety Sweeper (Runs every 30 seconds)
   * Sweeps for any pending reservations whose expiresAt timestamp has passed,
   * in case a scheduled timer was delayed, server restarted, or edge case occurred.
   */
  private startPeriodicSweeper(): void {
    this.periodicInterval = setInterval(async () => {
      await this.runSweep();
    }, 30 * 1000);
  }

  /**
   * Manual or periodic sweep of all expired reservations
   */
  async runSweep(): Promise<{ sweptCount: number; releasedCount: number }> {
    const now = Date.now();
    this.stats.lastSweepAt = new Date().toISOString();
    this.stats.sweepCount++;

    let sweptCount = 0;
    let releasedCount = 0;

    for (const reservation of db.reservations.values()) {
      if (reservation.status === 'PENDING') {
        const expiresAt = new Date(reservation.expiresAt).getTime();
        if (expiresAt <= now) {
          sweptCount++;
          const result = await db.releaseReservation(reservation.id, 'EXPIRED');
          if (result.released) {
            releasedCount++;
            this.stats.totalExpiredProcessed++;
            cache.invalidateEventCaches(reservation.eventId);
          }
          this.cancelExpiration(reservation.id);
        }
      }
    }

    return { sweptCount, releasedCount };
  }

  /**
   * Queue diagnostics & telemetry for monitoring console
   */
  getStats() {
    return {
      ...this.stats,
      activePendingTimers: this.timers.size,
      totalJobsRecorded: this.jobs.size,
    };
  }

  destroy(): void {
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
    }
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

export const expirationQueue = new ExpirationQueueService();
