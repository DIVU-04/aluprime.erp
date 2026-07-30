import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-configurator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configurator.component.html',
  styleUrl: './configurator.component.scss',
})
export class ConfiguratorComponent implements OnInit {
  designs: any[] = [];
  catalog: any = null;
  design: {
    id?: string;
    name: string;
    productType: string;
    system: string;
    width: number;
    height: number;
    panels: number;
    openingType: string;
    glassType: string;
    color: string;
    hardware: string;
  } = {
    name: 'New Design',
    productType: 'Window',
    system: 'uPVC',
    width: 1200,
    height: 1500,
    panels: 2,
    openingType: 'Casement',
    glassType: 'Double Glazed',
    color: 'White',
    hardware: 'Standard',
  };
  estimate: any = null;

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.api.get<any[]>('/configurator/designs').subscribe((d) => (this.designs = d));
    this.api.get<any>('/configurator/catalog').subscribe((d) => (this.catalog = d));
    this.calculateEstimate();
  }

  calculateEstimate() {
    this.api.post<any>('/configurator/estimate', this.design).subscribe((e) => (this.estimate = e));
  }

  onDesignChange() {
    this.calculateEstimate();
  }

  saveDesign() {
    const id = this.design.id;
    const req = id
      ? this.api.put(`/configurator/designs/${id}`, this.design)
      : this.api.post('/configurator/designs', this.design);
    req.subscribe((saved: any) => {
      this.design = { ...saved };
      this.api.get<any[]>('/configurator/designs').subscribe((d) => (this.designs = d));
    });
  }

  loadDesign(d: any) {
    this.design = {
      id: d.id,
      name: d.name,
      productType: d.productType,
      system: d.system,
      width: d.width,
      height: d.height,
      panels: d.panels,
      openingType: d.openingType,
      glassType: d.glassType,
      color: d.color,
      hardware: d.hardware,
    };
    this.calculateEstimate();
  }

  formatCurrency(v: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
  }

  panelArray(count: number): number[] {
    return Array.from({ length: count || 1 }, (_, i) => i);
  }
}
