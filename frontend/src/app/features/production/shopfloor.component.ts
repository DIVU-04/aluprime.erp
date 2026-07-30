import { Component } from '@angular/core';
import { ProductionComponent } from '../production/production.component';

@Component({
  selector: 'app-shopfloor',
  standalone: true,
  imports: [ProductionComponent],
  template: `<app-production mode="shopfloor" />`,
})
export class ShopfloorComponent {}
