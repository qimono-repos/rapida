import { Component, ElementRef, ViewChild, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {
  @ViewChild('touchContainer', { static: true }) touchContainer!: ElementRef<HTMLElement>;

  points = signal<Array<[number, number]>>([]);
  pointPayload = computed(() => ({ points: this.points() }));
  canCapture = computed(() => this.points().length < 4);

  constructor() {
    effect(() => {
      if (this.points().length === 4) {
        const payload = JSON.stringify(this.pointPayload(), null, 2);
        console.debug('Captured points JSON payload:', payload);
        console.log(payload);
      }
    });
  }

  onTap(event: PointerEvent): void {
    if (!this.canCapture()) {
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
}
