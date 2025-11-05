import { ApplicationRef, Component, inject, NgZone, signal } from '@angular/core';

@Component({
  selector: 'zone-root',
  standalone: true,
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  /**
   * Represents the progress of an ongoing task, expressed as a percentage.
   * This signal is periodically updated during execution to reflect progress
   * and trigger UI updates when running inside Angular’s zone.
   */
  readonly progress = signal<number>(0);

  /**
   * Indicates whether a background task is currently running.
   * Used to show or hide loading indicators in the UI.
   */
  readonly loading = signal<boolean>(false);

  /**
   * Reflects whether the current code execution is happening
   * inside Angular’s change detection zone.
   * 
   * - `true`: Currently within Angular's zone — change detection will run.
   * - `false`: Outside Angular's zone — UI updates are not automatically triggered.
   */
  readonly inAngularZone = signal<boolean>(true);

  /**
   * Reference to the root Angular application instance.
   * 
   * Used here to override the default `tick()` method, allowing
   * visibility into when Angular performs a change detection cycle.
   */
  private readonly _appRef = inject(ApplicationRef);

  /**
   * Provides programmatic control over Angular’s zone.
   * 
   * Used to:
   * - Execute heavy or repetitive operations **outside the Angular zone** (avoiding unnecessary re-renders).
   * - Re-enter Angular’s zone **only when UI updates are needed**.
   */
  private readonly _ngZone = inject(NgZone);

  constructor() {
    this.watchTicks();  // Observe Angular’s change detection cycles
    this.checkZone();   // Initialize the current zone state
  }

  /**
   * Monkey-patches Angular’s `ApplicationRef.tick()` method to log
   * every time Angular runs its change detection mechanism.
   * 
   * This helps developers visualize the frequency and timing
   * of Angular’s automatic UI updates.
   */
  watchTicks(): void {
    const originalTick = this._appRef.tick.bind(this._appRef);
    this._appRef.tick = () => {
      console.log('%c🌀 Angular change detection tick', 'color: cyan;');
      originalTick();
    };
  }

  /**
   * Checks whether the current execution context is inside Angular’s zone
   * and updates the `inAngularZone` signal accordingly.
   * 
   * This provides a live indicator of whether the component’s logic
   * is currently under Angular’s automatic change detection scope.
   */
  checkZone(): void {
    this.inAngularZone.set(NgZone.isInAngularZone());
  }

  /**
   * Executes a simulated heavy computation loop outside Angular’s zone
   * to prevent triggering change detection on every iteration.
   * 
   * The function periodically re-enters Angular’s zone (via `NgZone.run`)
   * every 500 iterations to update the UI with the current progress.
   * 
   * This pattern demonstrates **fine-grained control** over Angular’s
   * change detection system — ideal for performance-sensitive operations
   * like animations, data processing, or long-running tasks.
   */
  runOutsideAngular(): void {
    this._ngZone.runOutsideAngular(() => {
      console.log('%c⏳ Running heavy task outside Angular zone...', 'color: orange;');
      this.checkZone();
      this.loading.set(true);
      this.progress.set(0);

      let i: number = 0;
      const total: number = 3000; // Total iterations (simulated workload)

      /**
       * Recursive loop that performs incremental work.
       * Uses `requestAnimationFrame()` to keep the UI responsive
       * while simulating an asynchronous heavy computation.
       */
      const step = () => {
        i++;
        this.checkZone();

        // Every 500 iterations, re-enter Angular zone to update UI progress
        if (i % 500 === 0) {
          const percent = Math.round((i / total) * 100);
          this._ngZone.run(() => {
            console.log('%c🏗 Updating inside Angular zone...', 'color: lightgreen;');
            this.progress.set(percent);
            this.checkZone();
            setTimeout(() => { }, 300); // Small artificial delay for visualization
          });
        }

        // Continue processing until all iterations complete
        if (i < total) {
          window.requestAnimationFrame(step);
        } else {
          // Final update and cleanup upon task completion
          this._ngZone.run(() => {
            console.log('%c✅ Task completed inside Angular zone!', 'color: green;');
            this.loading.set(false);
            this.progress.set(100);
            this.checkZone();
          });
        }
      };

      step();
    });
  }
}
