import { App, Modal, Notice, Setting, moment } from 'obsidian';
import { ClinicalOSData, ClinicalAlert } from '../types';
import { getPatientList } from '../services/session';

const SEVERITY_LABELS: Record<ClinicalAlert['severity'], string> = {
    critical: 'Crítica',
    warning: 'Importante',
    info: 'Informativa',
};

const SEVERITY_ICONS: Record<ClinicalAlert['severity'], string> = {
    critical: '[!!!]',
    warning: '[!!]',
    info: '[i]',
};

export class AlertModal extends Modal {
    private data: ClinicalOSData;
    private rootFolder: string;
    private onSave: () => Promise<void>;

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

        contentEl.createEl('h2', { text: `Alertas clínicas (${active.length} activas)` });

        if (active.length === 0) {
            contentEl.createEl('p', {
                text: 'No hay alertas activas.',
                cls: 'clinical-os-empty-state',
            });
        } else {
            const list = contentEl.createDiv({ cls: 'clinical-os-alert-list' });
            for (const alert of active.sort((a, b) => {
                const order = { critical: 0, warning: 1, info: 2 };
                return order[a.severity] - order[b.severity];
            })) {
                this.renderAlertItem(list, alert);
            }
        }

        if (resolved.length > 0) {
            const toggle = contentEl.createEl('details');
            toggle.createEl('summary', { text: `Alertas resueltas (${resolved.length})` });
            const resolvedList = toggle.createDiv({ cls: 'clinical-os-alert-list' });
            for (const alert of resolved) {
                this.renderAlertItem(resolvedList, alert);
            }
        }

        const btnDiv = contentEl.createDiv({ cls: 'clinical-os-modal-actions' });
        const addBtn = btnDiv.createEl('button', { text: 'Nueva alerta' });
        addBtn.addClass('mod-cta');
        addBtn.onclick = () => this.renderForm();
    }

    private renderAlertItem(container: HTMLElement, alert: ClinicalAlert): void {
        const item = container.createDiv({
            cls: `clinical-os-alert-item clinical-os-alert-${alert.severity}`,
        });

        if (alert.resolved) item.addClass('clinical-os-alert-resolved');

        const header = item.createDiv({ cls: 'clinical-os-alert-item-header' });
        header.createEl('span', {
            text: `${SEVERITY_ICONS[alert.severity]} ${alert.patientName}`,
            cls: 'clinical-os-alert-patient',
        });
        header.createEl('span', {
            text: SEVERITY_LABELS[alert.severity],
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
            const actions = item.createDiv({ cls: 'clinical-os-colleague-actions' });
            const resolveBtn = actions.createEl('button', { text: 'Resolver' });
            resolveBtn.onclick = async () => {
                alert.resolved = true;
                await this.onSave();
                new Notice(`Alerta resuelta: ${alert.patientName}`);
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

    private renderForm(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clinical-os-modal');
        contentEl.createEl('h2', { text: 'Nueva alerta clínica' });

        const form = { patientName: '', severity: 'warning' as ClinicalAlert['severity'], message: '' };
        const patients = getPatientList(this.app, this.rootFolder);

        new Setting(contentEl).setName('Paciente').addDropdown(dropdown => {
            dropdown.addOption('', 'Seleccionar...');
            for (const p of patients) {
                dropdown.addOption(p, p);
            }
            dropdown.onChange(v => { form.patientName = v; });
        });

        new Setting(contentEl).setName('Severidad').addDropdown(dropdown => {
            dropdown.addOption('critical', 'Crítica — Riesgo vital');
            dropdown.addOption('warning', 'Importante — Requiere atención');
            dropdown.addOption('info', 'Informativa — Para tener en cuenta');
            dropdown.setValue('warning');
            dropdown.onChange(v => { form.severity = v as ClinicalAlert['severity']; });
        });

        new Setting(contentEl).setName('Mensaje').addTextArea(text => {
            text.setPlaceholder('Ej: Riesgo suicida moderado - Plan de seguridad activo');
            text.inputEl.rows = 3;
            text.onChange(v => { form.message = v; });
        });

        const btnDiv = contentEl.createDiv({ cls: 'clinical-os-modal-actions' });

        const cancelBtn = btnDiv.createEl('button', { text: 'Cancelar' });
        cancelBtn.onclick = () => this.renderList();

        const saveBtn = btnDiv.createEl('button', { text: 'Crear alerta' });
        saveBtn.addClass('mod-cta');
        saveBtn.onclick = async () => {
            if (!form.patientName) {
                new Notice('Selecciona un paciente.');
                return;
            }
            if (!form.message.trim()) {
                new Notice('Escribe un mensaje para la alerta.');
                return;
            }

            this.data.alerts.push({
                id: Date.now().toString(),
                patientName: form.patientName,
                severity: form.severity,
                message: form.message.trim(),
                dateCreated: moment().format('YYYY-MM-DD'),
                resolved: false,
            });

            await this.onSave();
            new Notice(`Alerta creada para ${form.patientName}.`);
            this.renderList();
        };
    }
}
