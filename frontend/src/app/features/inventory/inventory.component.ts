import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html',
})
export class InventoryComponent implements OnInit {
  @Input() inventoryType = 'raw';
  @Input() title = 'Inventory';
  @Input() subtitle = 'Manage stock levels';

  items: any[] = [];
  showForm = false;
  formData: Record<string, unknown> = {};

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<any[]>(`/inventory?type=${this.inventoryType}`).subscribe((d) => (this.items = d));
  }

  openForm(data: Record<string, unknown> = {}) {
    this.formData = { inventoryType: this.inventoryType, ...data };
    this.showForm = true;
  }

  save() {
    const id = this.formData['id'] as string;
    const req = id
      ? this.api.put(`/inventory/${id}`, this.formData)
      : this.api.post('/inventory', this.formData);
    req.subscribe(() => {
      this.showForm = false;
      this.load();
    });
  }

  adjustStock(id: string, qty: number) {
    this.api.post(`/inventory/${id}/adjust`, { quantity: qty }).subscribe(() => this.load());
  }

  delete(id: string) {
    if (!confirm('Delete item?')) return;
    this.api.delete(`/inventory/${id}`).subscribe(() => this.load());
  }

  isLowStock(item: any) {
    return Number(item.quantityOnHand) <= Number(item.reorderLevel);
  }
}
