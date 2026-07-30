import { Component } from '@angular/core';
import { EntityListComponent } from '../../shared/entity-list/entity-list.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [EntityListComponent],
  template: `
    <app-entity-list
      title="Projects"
      subtitle="Manage fenestration projects"
      apiPath="/projects"
      [columns]="[
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
        { key: 'customerName', label: 'Customer' },
        { key: 'status', label: 'Status', type: 'badge' },
        { key: 'projectManager', label: 'Manager' }
      ]"
      [fields]="[
        { key: 'name', label: 'Project Name' },
        { key: 'customerName', label: 'Customer' },
        { key: 'siteAddress', label: 'Site Address' },
        { key: 'status', label: 'Status', type: 'select', options: ['planning', 'in_progress', 'completed', 'on_hold'] },
        { key: 'projectManager', label: 'Project Manager' },
        { key: 'startDate', label: 'Start Date', type: 'date' },
        { key: 'targetCompletionDate', label: 'Target Date', type: 'date' }
      ]"
      [defaults]="{ status: 'planning' }"
    />
  `,
})
export class ProjectsComponent {}
