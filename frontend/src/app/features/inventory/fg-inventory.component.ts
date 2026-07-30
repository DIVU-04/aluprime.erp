import { Component } from '@angular/core';
import { InventoryComponent } from '../inventory/inventory.component';

@Component({
  selector: 'app-fg-inventory',
  standalone: true,
  imports: [InventoryComponent],
  template: `
    <app-inventory
      inventoryType="finished"
      title="Finished Goods Inventory"
      subtitle="Track manufactured window and door stock"
    />
  `,
})
export class FgInventoryComponent {}
