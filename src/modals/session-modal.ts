import { App, Modal, Notice, Setting, moment } from 'obsidian';
import { ClinicalOSData } from '../types';
import { getPatientList, getPatientFee, registerSession, formatCLP } from '../services/session';

export class SessionModal extends Modal {
    private data: ClinicalOSData;
    private rootFolder: string;
    private onSave: () => Promise<void>;

    private totalSessions = 1;
    private currentSession = 0;
    private registered: string[] = [];

    private selectedPatient = '';
    private sessionDate = '';
    private sessionFee = 0;
    private feeInput: HTMLInputElement | null = null;

    constructor(app: App, data: ClinicalOSData, rootFolder: string, onSave: () => Promise<void>) {
        super(app);
        this.data = data;
        this.rootFolder = rootFolder;
        this.onSave = onSave;
        this.sessionDate = moment().format('YYYY-MM-DD');
    }

    onOpen(): void {
        this.renderCountStep();
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private renderCountStep(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clinical-os-modal');
        contentEl.createEl('h2', { text: 'Registrar sesiones' });

        new Setting(contentEl)
            .setName('Cantidad de sesiones a registrar')
            .addText(text => {
                text.setValue('1')
                    .setPlaceholder('1')
                    .onChange(v => {
                        const num = parseInt(v, 10);
                        this.totalSessions = (num > 0) ? num : 1;
                    });
                text.inputEl.type = 'number';
                text.inputEl.min = '1';
                text.inputEl.style.width = '60px';
            });

        const btnDiv = contentEl.createDiv({ cls: 'clinical-os-modal-actions' });
        const btn = btnDiv.createEl('button', { text: 'Continuar' });
        btn.addClass('mod-cta');
        btn.onclick = () => {
            this.currentSession = 0;
            this.registered = [];
            this.renderSessionForm();
        };
    }

    private renderSessionForm(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clinical-os-modal');

        const label = this.totalSessions > 1
            ? `Registrar sesión (${this.currentSession + 1} de ${this.totalSessions})`
            : 'Registrar sesión';
        contentEl.createEl('h2', { text: label });

        const patients = getPatientList(this.app, this.rootFolder);

        if (patients.length === 0) {
            contentEl.createEl('p', {
                text: 'No hay pacientes registrados. Crea un paciente primero.',
                cls: 'clinical-os-empty-state',
            });
            return;
        }

        // Reset form fields for this session
        this.selectedPatient = '';
        this.sessionFee = 0;
        this.sessionDate = moment().format('YYYY-MM-DD');
        this.feeInput = null;

        new Setting(contentEl)
            .setName('Paciente')
            .addDropdown(dropdown => {
                dropdown.addOption('', '-- Seleccionar --');
                for (const name of patients) {
                    dropdown.addOption(name, name);
                }
                dropdown.onChange(value => {
                    this.selectedPatient = value;
                    if (value) {
                        const patientFee = getPatientFee(this.app, this.rootFolder, value);
                        const fee = patientFee > 0 ? patientFee : this.data.settings.defaultFee;
                        this.sessionFee = fee;
                        if (this.feeInput) {
                            this.feeInput.value = fee > 0 ? fee.toString() : '';
                        }
                    }
                });
            });

        new Setting(contentEl)
            .setName('Fecha')
            .addText(text => {
                text.setValue(this.sessionDate)
                    .setPlaceholder('YYYY-MM-DD')
                    .onChange(value => { this.sessionDate = value; });
                text.inputEl.type = 'date';
            });

        new Setting(contentEl)
            .setName('Honorarios')
            .setDesc('Monto en pesos chilenos')
            .addText(text => {
                text.setPlaceholder('Ej: 50000')
                    .onChange(value => {
                        this.sessionFee = parseInt(value.replace(/\D/g, ''), 10) || 0;
                    });
                this.feeInput = text.inputEl;
                this.feeInput.inputMode = 'numeric';
            });

        const btnDiv = contentEl.createDiv({ cls: 'clinical-os-modal-actions' });
        const btn = btnDiv.createEl('button', { text: 'Registrar' });
        btn.addClass('mod-cta');
        btn.onclick = () => this.handleRegister();
    }

    private async handleRegister(): Promise<void> {
        if (!this.selectedPatient) {
            new Notice('Selecciona un paciente.');
            return;
        }
        if (!this.sessionDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            new Notice('Fecha inválida. Usa formato YYYY-MM-DD.');
            return;
        }
        if (this.sessionFee < 0) {
            new Notice('El monto no puede ser negativo.');
            return;
        }

        registerSession(this.data, this.selectedPatient, this.sessionDate, this.sessionFee);
        await this.onSave();

        this.registered.push(`${this.selectedPatient} - ${formatCLP(this.sessionFee)}`);
        this.currentSession++;

        if (this.currentSession < this.totalSessions) {
            new Notice(`Sesión ${this.currentSession} de ${this.totalSessions} registrada.`);
            this.renderSessionForm();
        } else {
            if (this.totalSessions === 1) {
                new Notice(`Sesión registrada: ${this.registered[0]}`);
            } else {
                new Notice(`${this.totalSessions} sesiones registradas.`);
            }
            this.close();
        }
    }
}
