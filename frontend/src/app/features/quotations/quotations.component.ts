import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-quotations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quotations.component.html',
})
export class QuotationsComponent implements OnInit {
  quotations: any[] = [];
  showForm = false;
  formData: Record<string, unknown> = { items: [] };

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<any[]>('/quotations').subscribe((d) => (this.quotations = d));
  }

  openForm(data: Record<string, unknown> = {}) {
    this.formData = { status: 'draft', items: [], ...data };
    this.showForm = true;
  }

  save() {
    const id = this.formData['id'] as string;
    const req = id
      ? this.api.put(`/quotations/${id}`, this.formData)
      : this.api.post('/quotations', this.formData);
    req.subscribe(() => {
      this.showForm = false;
      this.load();
    });
  }

  revise(id: string) {
    this.api.post(`/quotations/${id}/revise`, {}).subscribe(() => this.load());
  }

  delete(id: string) {
    if (!confirm('Delete quotation?')) return;
    this.api.delete(`/quotations/${id}`).subscribe(() => this.load());
  }

  formatCurrency(v: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
  }
}
