import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-crm',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm.component.html',
})
export class CrmComponent implements OnInit {
  activeTab: 'accounts' | 'contacts' | 'opportunities' = 'accounts';
  accounts: any[] = [];
  contacts: any[] = [];
  opportunities: any[] = [];
  dashboard: any = null;
  showForm = false;
  formData: Record<string, unknown> = {};

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.api.get<any[]>('/crm/accounts').subscribe((d) => (this.accounts = d));
    this.api.get<any[]>('/crm/contacts').subscribe((d) => (this.contacts = d));
    this.api.get<any[]>('/crm/opportunities').subscribe((d) => (this.opportunities = d));
    this.api.get<any>('/crm/dashboard').subscribe((d) => (this.dashboard = d));
  }

  openForm(data: Record<string, unknown> = {}) {
    this.formData = { ...data };
    this.showForm = true;
  }

  save() {
    const paths: Record<string, string> = {
      accounts: '/crm/accounts',
      contacts: '/crm/contacts',
      opportunities: '/crm/opportunities',
    };
    const path = paths[this.activeTab];
    const id = this.formData['id'] as string;
    const req = id
      ? this.api.put(`${path}/${id}`, this.formData)
      : this.api.post(path, this.formData);
    req.subscribe(() => {
      this.showForm = false;
      this.loadAll();
    });
  }

  delete(id: string) {
    if (!confirm('Delete this record?')) return;
    this.api.delete(`/crm/${this.activeTab}/${id}`).subscribe(() => this.loadAll());
  }

  formatCurrency(v: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
  }
}
