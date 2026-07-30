import { Component } from '@angular/core';
import { EntityListComponent } from '../../shared/entity-list/entity-list.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [EntityListComponent],
  template: `
    <app-entity-list
      title="Sales Orders"
      subtitle="Manage confirmed sales orders"
      apiPath="/orders"
      [columns]="[
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        { key: 'totalAmount', label: 'Amount', type: 'currency' },
        { key: 'status', label: 'Status', type: 'badge' },
        { key: 'orderDate', label: 'Order Date' },
        { key: 'deliveryDate', label: 'Delivery' }
      ]"
      [fields]="[
        { key: 'customerName', label: 'Customer' },
        { key: 'totalAmount', label: 'Total Amount', type: 'number' },
        { key: 'status', label: 'Status', type: 'select', options: ['confirmed', 'in_production', 'ready', 'delivered'] },
        { key: 'orderDate', label: 'Order Date', type: 'date' },
        { key: 'deliveryDate', label: 'Delivery Date', type: 'date' },
        { key: 'notes', label: 'Notes' }
      ]"
      [defaults]="{ status: 'confirmed' }"
    />
  `,
})
export class OrdersComponent {}
