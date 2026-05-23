import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, effect, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';

export type Point = [number, number];

export interface RegressionSummary {
  points: Point[];
  m: number;
  b: number;
  x5: number;
  y5: number;
}

@Component({
  selector: 'app-tab1',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
})
export class Tab1Page {
  @ViewChild('touchContainer', { static: true }) touchContainer!: ElementRef<HTMLElement>;

  private readonly storageKey = 'yin_yang_lr_points';

  points = signal<Point[]>([]);
  pointPayload = computed(() => ({ points: this.points() }));
  canCapture = computed(() => this.points().length < 4);
  hasPoints = computed(() => this.points().length > 0);

  regression = computed<RegressionSummary | null>(() => {
    const points = this.points();
    if (points.length !== 4) {
      return null;
    }

    const N = 4;
    const sumX = points.reduce((acc, [x]) => acc + x, 0);
    const sumY = points.reduce((acc, [, y]) => acc + y, 0);
    const sumXY = points.reduce((acc, [x, y]) => acc + x * y, 0);
    const sumX2 = points.reduce((acc, [x]) => acc + x * x, 0);
    const denominator = N * sumX2 - sumX * sumX;
    const m = denominator === 0 ? 0 : (N * sumXY - sumX * sumY) / denominator;
    const b = (sumY - m * sumX) / N;
    const x5 = Math.max(...points.map(([x]) => x)) + 10;
    const y5 = m * x5 + b;

    return {
      points,
      m,
      b,
      x5,
      y5,
    };
  });

  constructor() {
    this.hydrateFromStorage();

    effect(() => {
      const points = this.points();
      if (points.length === 4) {
        const payload = JSON.stringify(this.pointPayload(), null, 2);
        localStorage.setItem(this.storageKey, payload);
        console.debug('Captured points JSON payload:', payload);
        console.log(payload);
      }
    });
  }

  resetPoints(): void {
    this.points.set([]);
    localStorage.removeItem(this.storageKey);
  }

  onTap(event: PointerEvent): void {
    if (!this.canCapture()) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('.ignore-tap')) {
      return;
    }

    const container = this.touchContainer?.nativeElement;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const x = Math.round(event.clientX - rect.left);
    const y = Math.round(event.clientY - rect.top);

    this.points.update((current) => {
      if (current.length >= 4) {
        return current;
      }
      return [...current, [x, y]];
    });
  }

  private hydrateFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (
        parsed?.points &&
        Array.isArray(parsed.points) &&
        parsed.points.length === 4 &&
        parsed.points.every(
          (item: unknown) =>
            Array.isArray(item) &&
            item.length === 2 &&
            typeof item[0] === 'number' &&
            typeof item[1] === 'number'
        )
      ) {
        this.points.set(parsed.points as Point[]);
      } else {
        localStorage.removeItem(this.storageKey);
      }
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }
}
