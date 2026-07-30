import { Component } from '@angular/core';
import { EntityListComponent } from '../../shared/entity-list/entity-list.component';

@Component({
  selector: 'app-survey',
  standalone: true,
  imports: [EntityListComponent],
  template: `
    <app-entity-list
      title="Site Survey"
      subtitle="Pre-production site surveys and measurements"
      apiPath="/survey"
      [columns]="[
        { key: 'siteName', label: 'Site' },
        { key: 'siteAddress', label: 'Address' },
        { key: 'surveyorName', label: 'Surveyor' },
        { key: 'surveyDate', label: 'Date' },
        { key: 'status', label: 'Status', type: 'badge' }
      ]"
      [fields]="[
        { key: 'siteName', label: 'Site Name' },
        { key: 'siteAddress', label: 'Address' },
        { key: 'surveyorName', label: 'Surveyor' },
        { key: 'surveyDate', label: 'Survey Date', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', options: ['scheduled', 'in_progress', 'completed'] },
        { key: 'notes', label: 'Notes' }
      ]"
      [defaults]="{ status: 'scheduled' }"
    />
  `,
})
export class SurveyComponent {}
