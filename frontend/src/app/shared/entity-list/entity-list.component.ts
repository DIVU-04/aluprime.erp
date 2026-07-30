import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

export interface EntityColumn {
  key: string;
  label: string;
  type?: 'text' | 'currency' | 'badge' | 'date';
}

export interface EntityField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: string[];
}

@Component({
  selector: 'app-entity-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './entity-list.component.html',
})
export class EntityListComponent implements OnInit {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() apiPath = '';
  @Input() columns: EntityColumn[] = [];
  @Input() fields: EntityField[] = [];
  @Input() defaults: Record<string, unknown> = {};

  items: any[] = [];
  showForm = false;
  formData: Record<string, unknown> = {};

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<any[]>(this.apiPath).subscribe((d) => (this.items = d));
  }

  openForm(data: Record<string, unknown> = {}) {
    this.formData = { ...this.defaults, ...data };
    this.showForm = true;
  }

  save() {
    const id = this.formData['id'] as string;
    const req = id
      ? this.api.put(`${this.apiPath}/${id}`, this.formData)
      : this.api.post(this.apiPath, this.formData);
    req.subscribe(() => {
      this.showForm = false;
      this.load();
    });
  }

  delete(id: string) {
    if (!confirm('Delete this record?')) return;
    this.api.delete(`${this.apiPath}/${id}`).subscribe(() => this.load());
  }

  getValue(item: any, key: string) {
    return key.split('.').reduce((obj, k) => obj?.[k], item);
  }

  formatCurrency(v: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);
  }
}
