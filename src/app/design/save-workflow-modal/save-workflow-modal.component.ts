import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FlowConnection, FlowNode } from '../design.component';

export interface WorkflowPayload {
  name: string;
  description: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
}

@Component({
  selector: 'app-save-workflow-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './save-workflow-modal.component.html',
  styleUrl: './save-workflow-modal.component.css',
})
export class SaveWorkflowModalComponent implements OnInit {
  private readonly _http = inject(HttpClient);

  @Input() nodes: FlowNode[] = [];
  @Input() connections: FlowConnection[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<WorkflowPayload>();

  name = signal('');
  description = signal('');
  saving = signal(false);
  error = signal('');

  nameError = signal('');

  ngOnInit(): void {}

  onNameChange(value: string): void {
    this.name.set(value);
    if (value.trim()) this.nameError.set('');
  }

  onDescriptionChange(value: string): void {
    this.description.set(value);
  }

  onSave(): void {
    if (!this.name().trim()) {
      this.nameError.set('Name is required.');
      return;
    }

    const payload: WorkflowPayload = {
      name: this.name().trim(),
      description: this.description().trim(),
      nodes: this.nodes,
      connections: this.connections,
    };

    this.saving.set(true);
    this.error.set('');

    // Replace with your actual API endpoint
    this._http.post('/api/workflows', payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit(payload);
        this.closed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(err.message ?? 'Failed to save workflow. Please try again.');
      },
    });
  }

  onCancel(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onCancel();
    }
  }
}
