import { App, Modal, Notice, Setting, moment } from 'obsidian';
import { ClinicalOSData, ClinicalAlert } from '../types';
import { getPatientList } from '../services/session';

const SEVERITY_LABELS: Record<ClinicalAlert['severity'], string> = {
    critical: 'Crítica',
    warning: 'Importante',
    info: 'Informativa',
};

export class AlertModal extends Modal {
    private data: ClinicalOSData;
    private rootFolder: string;
    private onSave: () => Promise<void>;
    private viewFilter: 'all' | 'alert' | 'reminder' = 'all';

    constructor(app: App, data: ClinicalOSData, rootFolder: string, onSave: () => Promise<void>) {
        super(app);
        this.data = data;
        this.rootFolder = rootFolder;
        this.onSave = onSave;
    }

    onOpen(): void {
        this.renderList();
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private renderList(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clinical-os-modal');

        const active = this.data.alerts.filter(a => !a.resolved);
        const resolved = this.data.alerts.filter(a => a.resolved);

        const activeAlerts = active.filter(a => (a.type ?? 'alert') === 'alert');
        const activeReminders = active.filter(a => a.type === 'reminder');

        contentEl.createEl('h2', {
            text: `Alertas y recordatorios (${activeAlerts.length} alertas, ${activeReminders.length} recordatorios)`,
        });

        // Filter tabs
        const tabs = contentEl.createDiv({ cls: 'clinical-os-tabs' });
        const filters: { key: typeof this.viewFilter; label: string }[] = [
            { key: 'all', label: 'Todos' },
            { key: 'alert', label: `Alertas (${activeAlerts.length})` },
            { key: 'reminder', label: `Recordatorios (${activeReminders.length})` },
        ];
        for (const f of filters) {
            const tab = tabs.createEl('button', { text: f.label, cls: 'clinical-os-tab' });
            if (this.viewFilter === f.key) tab.addClass('clinical-os-tab-active');
            tab.onclick = () => {
                this.viewFilter = f.key;
                this.renderList();
            };
        }

        // Filtered active items
        const filtered = this.viewFilter === 'all'
            ? active
            : active.filter(a => (a.type ?? 'alert') === this.viewFilter);

        if (filtered.length === 0) {
            contentEl.createEl('p', {
                text: this.viewFilter === 'all'
                    ? 'No hay alertas ni recordatorios activos.'
                    : this.viewFilter === 'alert'
                        ? 'No hay alertas activas.'
                        : 'No hay recordatorios activos.',
                cls: 'clinical-os-empty-state',
            });
        } else {
            const list = contentEl.createDiv({ cls: 'clinical-os-alert-list' });
            // Sort: alerts by severity first, then reminders
            const sorted = filtered.sort((a, b) => {
                const typeOrder = { alert: 0, reminder: 1 };
                const tA = typeOrder[(a.type ?? 'alert') as keyof typeof typeOrder];
                const tB = typeOrder[(b.type ?? 'alert') as keyof typeof typeOrder];
                if (tA !== tB) return tA - tB;
                if ((a.type ?? 'alert') === 'alert') {
                    const sevOrder = { critical: 0, warning: 1, info: 2 };
                    return sevOrder[a.severity] - sevOrder[b.severity];
                }
                return a.dateCreated.localeCompare(b.dateCreated);
            });
            for (const item of sorted) {
                this.renderItem(list, item);
            }
        }

        if (resolved.length > 0) {
            const toggle = contentEl.createEl('details');
            toggle.createEl('summary', { text: `Resueltos (${resolved.length})` });
            const resolvedList = toggle.createDiv({ cls: 'clinical-os-alert-list' });
            for (const item of resolved) {
                this.renderItem(resolvedList, item);
            }
        }

        // Action buttons
        const btnDiv = contentEl.createDiv({ cls: 'clinical-os-modal-actions' });
        const alertBtn = btnDiv.createEl('button', { text: 'Nueva alerta' });
        alertBtn.onclick = () => this.renderForm('alert');

        const reminderBtn = btnDiv.createEl('button', { text: 'Nuevo recordatorio' });
        reminderBtn.addClass('mod-cta');
        reminderBtn.onclick = () => this.renderForm('reminder');
    }

    private renderItem(container: HTMLElement, alert: ClinicalAlert): void {
        const isReminder = alert.type === 'reminder';
        const cssType = isReminder ? 'clinical-os-alert-reminder' : `clinical-os-alert-${alert.severity}`;
        const item = container.createDiv({
            cls: `clinical-os-alert-item ${cssType}`,
        });

        if (alert.resolved) item.addClass('clinical-os-alert-resolved');

        const header = item.createDiv({ cls: 'clinical-os-alert-item-header' });
        const icon = isReminder ? '[Recordatorio]'
            : alert.severity === 'critical' ? '[!!!]'
            : alert.severity === 'warning' ? '[!!]'
            : '[i]';
        header.createEl('span', {
            text: `${icon} ${alert.patientName}`,
            cls: 'clinical-os-alert-patient',
        });

        const label = isReminder ? 'Recordatorio' : SEVERITY_LABELS[alert.severity];
        header.createEl('span', {
            text: label,
            cls: 'clinical-os-alert-severity',
        });

        item.createEl('div', {
            text: alert.message,
            cls: 'clinical-os-alert-message',
        });

        item.createEl('div', {
            text: alert.dateCreated,
            cls: 'clinical-os-alert-date',
        });

        if (!alert.resolved) {
            const actions = item.createDiv({ cls: 'clinical-os-alert-actions' });
            const resolveBtn = actions.createEl('button', {
                text: isReminder ? 'Listo' : 'Resolver',
            });
            resolveBtn.onclick = async () => {
                alert.resolved = true;
                await this.onSave();
                new Notice(isReminder
                    ? `Recordatorio completado: ${alert.patientName}`
                    : `Alerta resuelta: ${alert.patientName}`);
                this.renderList();
            };

            const deleteBtn = actions.createEl('button', { text: 'Eliminar' });
            deleteBtn.addClass('mod-warning');
            deleteBtn.onclick = async () => {
                this.data.alerts = this.data.alerts.filter(a => a.id !== alert.id);
                await this.onSave();
                this.renderList();
            };
        }
    }

    private renderForm(type: 'alert' | 'reminder'): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clinical-os-modal');

        const isReminder = type === 'reminder';
        contentEl.createEl('h2', {
            text: isReminder ? 'Nuevo recordatorio' : 'Nueva alerta clínica',
        });

        const form = {
            patientName: '',
            severity: 'warning' as ClinicalAlert['severity'],
            message: '',
        };
        const patients = getPatientList(this.app, this.rootFolder);

        new Setting(contentEl).setName('Paciente').addDropdown(dropdown => {
            dropdown.addOption('', 'Seleccionar...');
            for (const p of patients) {
                dropdown.addOption(p, p);
            }
            dropdown.onChange(v => { form.patientName = v; });
        });

        if (!isReminder) {
            new Setting(contentEl).setName('Severidad').addDropdown(dropdown => {
                dropdown.addOption('critical', 'Crítica — Riesgo vital');
                dropdown.addOption('warning', 'Importante — Requiere atención');
                dropdown.addOption('info', 'Informativa — Para tener en cuenta');
                dropdown.setValue('warning');
                dropdown.onChange(v => { form.severity = v as ClinicalAlert['severity']; });
            });
        }

        new Setting(contentEl).setName('Mensaje').addTextArea(text => {
            text.setPlaceholder(isReminder
                ? 'Ej: Revisar objetivos terapéuticos en próxima sesión'
                : 'Ej: Riesgo suicida moderado - Plan de seguridad activo');
            text.inputEl.rows = 3;
            text.onChange(v => { form.message = v; });
        });

        const btnDiv = contentEl.createDiv({ cls: 'clinical-os-modal-actions' });

        const cancelBtn = btnDiv.createEl('button', { text: 'Cancelar' });
        cancelBtn.onclick = () => this.renderList();

        const saveBtn = btnDiv.createEl('button', {
            text: isReminder ? 'Crear recordatorio' : 'Crear alerta',
        });
        saveBtn.addClass('mod-cta');
        saveBtn.onclick = async () => {
            if (!form.patientName) {
                new Notice('Selecciona un paciente.');
                return;
            }
            if (!form.message.trim()) {
                new Notice('Escribe un mensaje.');
                return;
            }

            this.data.alerts.push({
                id: Date.now().toString(),
                type,
                patientName: form.patientName,
                severity: isReminder ? 'info' : form.severity,
                message: form.message.trim(),
                dateCreated: moment().format('YYYY-MM-DD'),
                resolved: false,
            });

            await this.onSave();
            new Notice(isReminder
                ? `Recordatorio creado para ${form.patientName}.`
                : `Alerta creada para ${form.patientName}.`);
            this.renderList();
        };
    }
}
