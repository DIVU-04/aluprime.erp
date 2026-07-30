import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  section?: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  sidebarCollapsed = false;

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'bi-speedometer2', route: '/dashboard', section: 'Main' },
    { label: 'CRM', icon: 'bi-people', route: '/crm', section: 'Sales' },
    { label: 'Quotations (QMS)', icon: 'bi-file-earmark-text', route: '/qms', section: 'Sales' },
    { label: 'Rate Management (RMS)', icon: 'bi-currency-dollar', route: '/rms', section: 'Sales' },
    { label: 'Design Configurator', icon: 'bi-box', route: '/configurator', section: 'Design' },
    { label: 'Survey', icon: 'bi-clipboard-check', route: '/survey', section: 'Projects' },
    { label: 'Projects', icon: 'bi-building', route: '/projects', section: 'Projects' },
    { label: 'Sales Orders', icon: 'bi-cart-check', route: '/order', section: 'Projects' },
    { label: 'Production Planning', icon: 'bi-calendar3', route: '/planning', section: 'Production' },
    { label: 'Shop Floor (MES)', icon: 'bi-gear-wide-connected', route: '/shopfloor', section: 'Production' },
    { label: 'Raw Inventory', icon: 'bi-boxes', route: '/inventory', section: 'Inventory' },
    { label: 'FG Inventory', icon: 'bi-box-seam', route: '/fg-inventory', section: 'Inventory' },
    { label: 'Dispatch', icon: 'bi-truck', route: '/dispatch', section: 'Logistics' },
  ];

  constructor(public readonly auth: AuthService) {}

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout() {
    this.auth.logout();
  }

  get sections(): string[] {
    return [...new Set(this.navItems.map((i) => i.section || 'Other'))];
  }

  itemsForSection(section: string) {
    return this.navItems.filter((i) => (i.section || 'Other') === section);
  }
}
