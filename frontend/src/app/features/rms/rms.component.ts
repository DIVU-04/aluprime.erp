import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-rms',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h2>Rate Management (RMS)</h2>
      <p class="text-muted">System rates and cost head configuration</p>
    </div>
    <div class="row g-3">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">System Rates (per sqm)</div>
          <div class="card-body">
            <table class="table table-sm">
              <tr><td>uPVC Standard</td><td class="text-end">₹8,500</td></tr>
              <tr><td>uPVC Premium</td><td class="text-end">₹10,500</td></tr>
              <tr><td>Aluminium Standard</td><td class="text-end">₹12,000</td></tr>
              <tr><td>Aluminium Thermal Break</td><td class="text-end">₹15,500</td></tr>
            </table>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">Cost Heads</div>
          <div class="card-body">
            <table class="table table-sm">
              <tr><td>Profile Material</td><td class="text-end">Auto-calculated</td></tr>
              <tr><td>Glass</td><td class="text-end">₹2,500/sqm</td></tr>
              <tr><td>Hardware</td><td class="text-end">₹1,500/panel</td></tr>
              <tr><td>Fabrication Labor</td><td class="text-end">₹800/sqm</td></tr>
              <tr><td>Installation</td><td class="text-end">₹500/sqm</td></tr>
            </table>
          </div>
        </div>
      </div>
      <div class="col-12" *ngIf="catalog">
        <div class="card">
          <div class="card-header">Product Catalog</div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-3" *ngFor="let key of catalogKeys">
                <h6 class="text-capitalize">{{ key }}</h6>
                <ul class="list-unstyled small">
                  <li *ngFor="let item of catalog[key]">• {{ item }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RmsComponent implements OnInit {
  catalog: Record<string, string[]> | null = null;
  catalogKeys: string[] = [];

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.api.get<Record<string, string[]>>('/configurator/catalog').subscribe((d) => {
      this.catalog = d;
      this.catalogKeys = Object.keys(d);
    });
  }
}
