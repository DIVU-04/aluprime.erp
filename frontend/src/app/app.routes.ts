import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout.component';
import { LoginComponent } from './features/auth/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CrmComponent } from './features/crm/crm.component';
import { QuotationsComponent } from './features/quotations/quotations.component';
import { RmsComponent } from './features/rms/rms.component';
import { ConfiguratorComponent } from './features/configurator/configurator.component';
import { SurveyComponent } from './features/survey/survey.component';
import { ProjectsComponent } from './features/projects/projects.component';
import { OrdersComponent } from './features/orders/orders.component';
import { PlanningComponent } from './features/production/planning.component';
import { ShopfloorComponent } from './features/production/shopfloor.component';
import { InventoryComponent } from './features/inventory/inventory.component';
import { FgInventoryComponent } from './features/inventory/fg-inventory.component';
import { DispatchComponent } from './features/dispatch/dispatch.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'crm', component: CrmComponent },
      { path: 'qms', component: QuotationsComponent },
      { path: 'rms', component: RmsComponent },
      { path: 'configurator', component: ConfiguratorComponent },
      { path: 'survey', component: SurveyComponent },
      { path: 'projects', component: ProjectsComponent },
      { path: 'order', component: OrdersComponent },
      { path: 'planning', component: PlanningComponent },
      { path: 'shopfloor', component: ShopfloorComponent },
      { path: 'mes', redirectTo: 'shopfloor', pathMatch: 'full' },
      { path: 'inventory', component: InventoryComponent },
      { path: 'fg-inventory', component: FgInventoryComponent },
      { path: 'dispatch', component: DispatchComponent },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
