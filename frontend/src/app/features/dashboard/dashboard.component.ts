import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

interface DashboardData {
  summary: {
    accounts: number;
    opportunities: number;
    quotations: number;
    orders: number;
    projects: number;
    batches: number;
    dispatches: number;
  };
  financials: {
    pipelineValue: number;
    quotationValue: number;
    orderValue: number;
  };
  production: {
    scheduled: number;
    inProgress: number;
    completed: number;
  };
  recentQuotations: Array<{
    id: string;
    quoteNumber: string;
    customerName: string;
    total: number;
    status: string;
  }>;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  data: DashboardData | null = null;

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.api.get<DashboardData>('/dashboard').subscribe((data) => (this.data = data));
  }

  formatCurrency(value: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
