import { App, Modal, Notice, Setting, moment } from 'obsidian';
import { ClinicalOSData } from '../types';
import { getPatientList, getPatientFee, registerSession, formatCLP } from '../services/session';

export class SessionModal extends Modal {
    private data: ClinicalOSData;
    private rootFolder: string;
    private onSave: () => Promise<void>;

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
        const { contentEl } = this;
        contentEl.addClass('clinical-os-modal');
        contentEl.createEl('h2', { text: 'Registrar Sesión' });

        const patients = getPatientList(this.app, this.rootFolder);

        if (patients.length === 0) {
            contentEl.createEl('p', {
                text: 'No hay pacientes registrados. Crea un paciente primero.',
                cls: 'clinical-os-empty-state',
            });
            return;
        }

        // Patient selector
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

        // Date
        new Setting(contentEl)
            .setName('Fecha')
            .addText(text => {
                text.setValue(this.sessionDate)
                    .setPlaceholder('YYYY-MM-DD')
                    .onChange(value => { this.sessionDate = value; });
                text.inputEl.type = 'date';
            });

        // Fee
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

        // Actions
        const btnDiv = contentEl.createDiv({ cls: 'clinical-os-modal-actions' });
        const btn = btnDiv.createEl('button', { text: 'Registrar' });
        btn.addClass('mod-cta');
        btn.onclick = () => this.handleRegister();
    }

    onClose(): void {
        this.contentEl.empty();
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

        new Notice(`Sesión registrada: ${this.selectedPatient} - ${formatCLP(this.sessionFee)}`);
        this.close();
    }
}
