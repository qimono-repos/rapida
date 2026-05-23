import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  signal,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import {
  IonicModule,
  IonButton,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/angular';

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

  containerSize = signal({ width: 0, height: 0 });

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

  lineCoords = computed(() => {
    const reg = this.regression();
    const size = this.containerSize();
    if (!reg || size.width === 0 || size.height === 0) return null;

    const x1 = 0;
    const y1 = reg.b;
    const x2 = size.width;
    const y2 = reg.m * x2 + reg.b;
    return { x1, y1, x2, y2, width: size.width, height: size.height };
  });

  constructor() {
    this.hydrateFromStorage();

    effect(() => {
      const points = this.points();
      if (points.length === 4) {
        const payload = JSON.stringify(this.pointPayload(), null, 2);
        localStorage.setItem(this.storageKey, payload);
        console.debug('Captured points JSON payload:', payload);
        console.log('Regression summary for 4 captured points:');
        console.log(`Points:\n${points.map(([x, y], idx) => `${idx + 1}: [${x}, ${y}]`).join('\n')}`);
        const reg = this.regression();
        if (reg) {
          console.log(`Slope (m): ${reg.m}`);
          console.log(`Intercept (b): ${reg.b}`);
          console.log(`Predicted 5th point: [${reg.x5}, ${reg.y5}]`);
        }
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updateContainerSize());
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateContainerSize();
  }

  private updateContainerSize(): void {
    const el = this.touchContainer?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    this.containerSize.set({ width: Math.max(0, Math.round(rect.width)), height: Math.max(0, Math.round(rect.height)) });
  }

  resetPoints(): void {
    this.points.set([]);
    localStorage.removeItem(this.storageKey);
  }

  xOf(point: unknown): number | null {
    if (!point || !Array.isArray(point) || typeof point[0] !== 'number') return null;
    return point[0] as number;
  }

  yOf(point: unknown): number | null {
    if (!point || !Array.isArray(point) || typeof point[1] !== 'number') return null;
    return point[1] as number;
  }

  ariaLabel(point: unknown, index: number): string | null {
    if (!point || !Array.isArray(point) || typeof point[0] !== 'number' || typeof point[1] !== 'number') return null;
    return `Point ${index + 1} at ${point[0]}, ${point[1]}`;
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
      const next = [...current, [x, y]] as Point[];
      // update container size when new point added (helps line rendering)
      setTimeout(() => this.updateContainerSize(), 0);
      return next;
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
