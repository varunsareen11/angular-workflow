import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import {
  EFMarkerType,
  FCanvasComponent,
  FCreateConnectionEvent,
  FCreateNodeEvent,
  FExternalItem,
  FFlowModule,
  FZoomDirective,
} from '@foblex/flow';
import { SaveWorkflowModalComponent } from './save-workflow-modal/save-workflow-modal.component';
import { FormsModule } from '@angular/forms';

export type ShapeType = 'rectangle' | 'circle' | 'diamond';

export type NodeKind = 'start-event' | 'end-event' | 'gateway' | 'human-loop' | 'define-scope';

export interface SidebarItem {
  kind: NodeKind;
  name: string;
  shape: ShapeType;
  type: string;
  icon: string;        // svg path string or emoji
  iconType: 'svg' | 'emoji';
  defaultLabel: string;
  labelEditable: boolean;
}

export interface FlowNode {
  id: string;
  kind: NodeKind;
  shape: ShapeType;
  label: string;
  labelEditable: boolean;
  position: { x: number; y: number };
}

export interface FlowConnection {
  id: string;
  source: string;
  target: string;
}

interface DesignSnapshot {
  nodes: FlowNode[];
  connections: FlowConnection[];
}

const GLOBE_PATH = 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 2c1.07 0 2.48.8 3.72 3H8.28C9.52 6.8 10.93 4 12 4zm-4.27 3h8.54c.44 1.02.73 2.17.73 3H7c0-.83.29-1.98.73-3zM4.07 10h2.96C7 10.66 7 11.33 7 12s0 1.34.03 2H4.07A8 8 0 0 1 4 12c0-.69.03-1.36.07-2zm.52 6h2.55c.3 1.1.72 2.1 1.22 2.93A8.03 8.03 0 0 1 4.59 16zm3.69 0h7.44c-.5 1.5-1.2 2.6-1.72 3H9.99c-.52-.4-1.22-1.5-1.71-3zm8.58 0h2.55a8.03 8.03 0 0 1-3.77 2.93c.5-.83.92-1.83 1.22-2.93zm2.11-2h-2.96C16 13.34 16 12.67 16 12s0-1.34-.03-2h2.96c.04.64.07 1.31.07 2s-.03 1.36-.07 2zm-3.96 0H9c-.03-.66-.03-1.33 0-2h5.01c.02.67.02 1.34-.01 2z';
const USER_PATH  = 'M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z';

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    kind: 'start-event',
    name: 'Start Event',
    shape: 'circle',
    type: 'Event',
    icon: 'Start',
    iconType: 'emoji',
    defaultLabel: 'Start',
    labelEditable: true,
  },
  {
    kind: 'end-event',
    name: 'End Event',
    shape: 'circle',
    type: 'Event',
    icon: 'End',
    iconType: 'emoji',
    defaultLabel: 'End',
    labelEditable: true,
  },
  {
    kind: 'gateway',
    name: 'Gateway',
    shape: 'diamond',
    type: 'Gateway',
    icon: GLOBE_PATH,
    iconType: 'svg',
    defaultLabel: 'Gateway',
    labelEditable: false,
  },
  {
    kind: 'human-loop',
    name: 'Human in Loop',
    shape: 'rectangle',
    type: 'Human',
    icon: USER_PATH,
    iconType: 'svg',
    defaultLabel: 'Human Review',
    labelEditable: true,
  },
  {
    kind: 'define-scope',
    name: 'Define Scope',
    shape: 'rectangle',
    type: 'Scope',
    icon: USER_PATH,
    iconType: 'svg',
    defaultLabel: 'Define Scope',
    labelEditable: false,
  },
];

@Component({
  selector: 'app-design',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './design.component.html',
  styleUrl: './design.component.css',
  imports: [FFlowModule, FExternalItem, SaveWorkflowModalComponent, FormsModule],
})
export class DesignComponent {
  private readonly _canvas = viewChild(FCanvasComponent);
  private readonly _zoom = viewChild(FZoomDirective);
  protected readonly eMarkerType = EFMarkerType;
  protected isZoomEnabled = true;

  showSaveModal = signal(false);

  readonly sidebarItems = SIDEBAR_ITEMS;
  readonly shapeOptions = SIDEBAR_ITEMS;

  nodes = signal<FlowNode[]>([
    {
      id: 'node-1',
      kind: 'start-event',
      shape: 'circle',
      label: 'Start',
      labelEditable: true,
      position: { x: -120, y: -40 },
    },
    {
      id: 'node-2',
      kind: 'end-event',
      shape: 'circle',
      label: 'End',
      labelEditable: true,
      position: { x: 120, y: -40 },
    },
  ]);
  connections = signal<FlowConnection[]>([]);

  // ── Node dropdown ─────────────────────────────────────
  activeNodeId = signal<string | null>(null);

  // ── Node label editing ───────────────────────────────
  editingLabelId = signal<string | null>(null);

  focusLabel(nodeId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeNodeId.set(null);
    this.editingLabelId.set(nodeId);
  }

  commitLabel(nodeId: string, value: string): void {
    const trimmed = value.trim();
    this.nodes.update(ns =>
      ns.map(n => n.id === nodeId ? { ...n, label: trimmed || n.label } : n)
    );
    this.editingLabelId.set(null);
  }

  onLabelKeydown(nodeId: string, value: string, event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Enter') { event.preventDefault(); this.commitLabel(nodeId, value); }
    if (event.key === 'Escape') { this.editingLabelId.set(null); }
  }

  openNodeMenu(nodeId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeNodeId.update(id => id === nodeId ? null : nodeId);
  }

  addConnectedNode(sourceNodeId: string, kind: NodeKind): void {
    const source = this.nodes().find(n => n.id === sourceNodeId);
    if (!source) return;
    const def = SIDEBAR_ITEMS.find(s => s.kind === kind) ?? SIDEBAR_ITEMS[0];

    this._push();
    this._nodeIdx++;
    const newId = `node-${this._nodeIdx}`;
    const newPos = { x: source.position.x + 220, y: source.position.y };

    this.nodes.update(n => [...n, {
      id: newId,
      kind: def.kind,
      shape: def.shape,
      label: def.defaultLabel,
      labelEditable: def.labelEditable,
      position: newPos,
    }]);

    this._connIdx++;
    this.connections.update(c => [...c, {
      id: `conn-${this._connIdx}`,
      source: sourceNodeId + '-out',
      target: newId + '-in',
    }]);

    this.activeNodeId.set(null);
  }

  @HostListener('document:click')
  closeNodeMenu(): void {
    this.activeNodeId.set(null);
    this.editingLabelId.set(null);
  }
  // ─────────────────────────────────────────────────────

  private _nodeIdx = 2;
  private _connIdx = 0;

  // ── History ──────────────────────────────────────────
  private _past = signal<DesignSnapshot[]>([]);
  private _future = signal<DesignSnapshot[]>([]);

  canUndo = computed(() => this._past().length > 0);
  canRedo = computed(() => this._future().length > 0);

  private _snapshot(): DesignSnapshot {
    return {
      nodes: this.nodes().map((n) => ({ ...n, position: { ...n.position } })),
      connections: this.connections().map((c) => ({ ...c })),
    };
  }

  private _push(): void {
    this._past.update((p) => [...p, this._snapshot()]);
    this._future.set([]);
  }

  undo(): void {
    const past = this._past();
    if (!past.length) return;
    this._future.update((f) => [this._snapshot(), ...f]);
    const prev = past[past.length - 1];
    this._past.update((p) => p.slice(0, -1));
    this.nodes.set(prev.nodes);
    this.connections.set(prev.connections);
  }

  redo(): void {
    const future = this._future();
    if (!future.length) return;
    this._past.update((p) => [...p, this._snapshot()]);
    const next = future[0];
    this._future.update((f) => f.slice(1));
    this.nodes.set(next.nodes);
    this.connections.set(next.connections);
  }

  onLoaded(): void {
    this._canvas()?.resetScaleAndCenter(false);
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      this.redo();
    }
  }

  onCreateNode(event: FCreateNodeEvent): void {
    const kind = (event.data as NodeKind) ?? 'start-event';
    const def = SIDEBAR_ITEMS.find(s => s.kind === kind) ?? SIDEBAR_ITEMS[0];
    this._push();
    this._nodeIdx++;
    const id = `node-${this._nodeIdx}`;
    this.nodes.update((n) => [
      ...n,
      {
        id,
        kind: def.kind,
        shape: def.shape,
        label: def.defaultLabel,
        labelEditable: def.labelEditable,
        position: { x: event.rect.x, y: event.rect.y },
      },
    ]);
  }

  onCreateConnection(event: FCreateConnectionEvent): void {
    const target = event.fInputId;
    if (!target) return;
    this._push();
    this._connIdx++;
    this.connections.update((c) => [
      ...c,
      {
        id: `conn-${this._connIdx}`,
        source: event.fOutputId,
        target,
      },
    ]);
  }

  deleteNode(id: string): void {
    this._push();
    this.nodes.update((n) => n.filter((node) => node.id !== id));
    this.connections.update((c) =>
      c.filter((conn) => !conn.source.startsWith(id + '-') && !conn.target.startsWith(id + '-')),
    );
  }

  fitToScreen(): void {
    this._canvas()?.fitToScreen(undefined, true);
  }

  resetView(): void {
    this._canvas()?.resetScaleAndCenter(true);
  }

  onZoomIn(): void {
    this._zoom()?.zoomIn();
  }

  onZoomOut(): void {
    this._zoom()?.zoomOut();
  }

  exportJson(): void {
    const data = JSON.stringify({ nodes: this.nodes(), connections: this.connections() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importJson(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as DesignSnapshot;
        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.connections)) throw new Error();
        this._push();
        this.nodes.set(parsed.nodes);
        this.connections.set(parsed.connections);
        this._nodeIdx = parsed.nodes.reduce((max, n) => {
          const num = parseInt(n.id.replace('node-', ''), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        this._connIdx = parsed.connections.reduce((max, c) => {
          const num = parseInt(c.id.replace('conn-', ''), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        setTimeout(() => this._canvas()?.fitToScreen(undefined, true), 50);
      } catch {
        alert('Invalid JSON file.');
      }
      (event.target as HTMLInputElement).value = '';
    };
    reader.readAsText(file);
  }

  openSaveModal(): void {
    this.showSaveModal.set(true);
  }

  onWorkflowSaved(): void {
    this.showSaveModal.set(false);
  }
}