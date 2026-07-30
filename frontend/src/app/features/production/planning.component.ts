import { Component } from '@angular/core';
import { ProductionComponent } from '../production/production.component';

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [ProductionComponent],
  template: `<app-production mode="planning" />`,
})
export class PlanningComponent {}
