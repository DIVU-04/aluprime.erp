import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-production',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './production.component.html',
})
export class ProductionComponent implements OnInit {
  @Input() mode: 'planning' | 'shopfloor' = 'planning';
  batches: any[] = [];
  dashboard: any = null;
  showForm = false;
  formData: Record<string, unknown> = {};

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<any[]>('/production/batches').subscribe((d) => (this.batches = d));
    this.api.get<any>('/production/dashboard').subscribe((d) => (this.dashboard = d));
  }

  openForm(data: Record<string, unknown> = {}) {
    this.formData = { status: 'scheduled', totalUnits: 0, completedUnits: 0, ...data };
    this.showForm = true;
  }

  save() {
    const id = this.formData['id'] as string;
    const req = id
      ? this.api.put(`/production/batches/${id}`, this.formData)
      : this.api.post('/production/batches', this.formData);
    req.subscribe(() => {
      this.showForm = false;
      this.load();
    });
  }

  completeUnit(id: string) {
    this.api.post(`/production/batches/${id}/complete-unit`, {}).subscribe(() => this.load());
  }

  progress(batch: any) {
    if (!batch.totalUnits) return 0;
    return Math.round((batch.completedUnits / batch.totalUnits) * 100);
  }
}
