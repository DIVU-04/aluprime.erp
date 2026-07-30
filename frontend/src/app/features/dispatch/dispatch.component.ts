import { Component } from '@angular/core';
import { EntityListComponent } from '../../shared/entity-list/entity-list.component';

@Component({
  selector: 'app-dispatch',
  standalone: true,
  imports: [EntityListComponent],
  template: `
    <app-entity-list
      title="Dispatch Management"
      subtitle="Track dispatches and deliveries"
      apiPath="/dispatch"
      [columns]="[
        { key: 'dispatchNumber', label: 'Dispatch #' },
        { key: 'destination', label: 'Destination' },
        { key: 'dispatchDate', label: 'Date' },
        { key: 'totalItems', label: 'Items' },
        { key: 'status', label: 'Status', type: 'badge' },
        { key: 'vehicleNumber', label: 'Vehicle' }
      ]"
      [fields]="[
        { key: 'destination', label: 'Destination' },
        { key: 'dispatchDate', label: 'Dispatch Date', type: 'date' },
        { key: 'vehicleNumber', label: 'Vehicle Number' },
        { key: 'driverName', label: 'Driver' },
        { key: 'totalItems', label: 'Total Items', type: 'number' },
        { key: 'status', label: 'Status', type: 'select', options: ['pending', 'in_transit', 'delivered'] },
        { key: 'notes', label: 'Notes' }
      ]"
      [defaults]="{ status: 'pending' }"
    />
  `,
})
export class DispatchComponent {}
