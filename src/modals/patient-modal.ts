import { App, Modal, Notice, Setting } from 'obsidian';
import { ProcessType, PROCESS_TYPE_LABELS } from '../types';
import { detectCanvasModels, createPatient, ProcessExtraData } from '../services/patient';

export class PatientModal extends Modal {
    private rootFolder: string;
    private nextPatientId: number;
    private onCreated: (usedId: number) => Promise<void>;

    private processType: ProcessType = 'individual';
    private patientName = '';
    private selectedModel = '';
    private availableModels: Record<string, string> = {};
    private extraData: ProcessExtraData = {};

    constructor(
        app: App,
        rootFolder: string,
        nextPatientId: number,
        defaultModel: string,
        onCreated: (usedId: number) => Promise<void>
    ) {
        super(app);
        this.rootFolder = rootFolder;
        this.nextPatientId = nextPatientId;
        this.onCreated = onCreated;
        this.availableModels = detectCanvasModels(app, rootFolder);

        const modelNames = Object.keys(this.availableModels);
        if (defaultModel && modelNames.includes(defaultModel)) {
            this.selectedModel = defaultModel;
        } else if (modelNames.length > 0) {
            this.selectedModel = modelNames[0];
        }
    }

    onOpen(): void {
        this.renderTypeSelection();
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private renderTypeSelection(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clinical-os-modal');
        contentEl.createEl('h2', { text: 'Nuevo proceso' });

        contentEl.createEl('p', {
            text: `ID: ${String(this.nextPatientId).padStart(3, '0')}`,
            cls: 'clinical-os-id-badge',
        });

        new Setting(contentEl)
            .setName('Tipo de proceso')
            .addDropdown(dropdown => {
                for (const [key, label] of Object.entries(PROCESS_TYPE_LABELS)) {
                    dropdown.addOption(key, label);
                }
                dropdown.setValue(this.processType);
                dropdown.onChange(v => { this.processType = v as ProcessType; });
            });

        const btnDiv = contentEl.createDiv({ cls: 'clinical-os-modal-actions' });
        const btn = btnDiv.createEl('button', { text: 'Continuar' });
        btn.addClass('mod-cta');
        btn.onclick = () => this.renderProcessForm();
    }

    private renderProcessForm(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clinical-os-modal');

        const typeLabel = PROCESS_TYPE_LABELS[this.processType];
        contentEl.createEl('h2', { text: typeLabel });

        contentEl.createEl('p', {
            text: `ID: ${String(this.nextPatientId).padStart(3, '0')}`,
            cls: 'clinical-os-id-badge',
        });

        this.extraData = {};

        // Name field — label changes based on process type
        const nameLabel = this.processType === 'group' ? 'Nombre del grupo'
            : this.processType === 'supervision' ? 'Nombre del proceso'
            : this.processType === 'couple' ? 'Nombre del proceso (ej: Pareja López-García)'
            : this.processType === 'family' ? 'Nombre del proceso (ej: Familia González)'
            : 'Nombre del paciente';

        const namePlaceholder = this.processType === 'group' ? 'Ej: Grupo habilidades sociales'
            : this.processType === 'supervision' ? 'Ej: Supervisión equipo APS'
            : this.processType === 'couple' ? 'Ej: Pareja López-García'
            : this.processType === 'family' ? 'Ej: Familia González'
            : 'Ej: Ana López';

        new Setting(contentEl)
            .setName(nameLabel)
            .addText(text => {
                text.setPlaceholder(namePlaceholder)
                    .setValue(this.patientName)
                    .onChange(v => { this.patientName = v; });
                text.inputEl.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && this.processType === 'individual') {
                        this.handleCreate();
                    }
                });
                setTimeout(() => text.inputEl.focus(), 50);
            });

        // Type-specific fields
        switch (this.processType) {
            case 'child':
                this.renderChildFields(contentEl);
                break;
            case 'couple':
                this.renderCoupleFields(contentEl);
                break;
            case 'family':
                this.renderFamilyFields(contentEl);
                break;
            case 'group':
                this.renderGroupFields(contentEl);
                break;
            case 'supervision':
                this.renderSupervisionFields(contentEl);
                break;
        }

        // Clinical model selector
        if (Object.keys(this.availableModels).length > 0) {
            new Setting(contentEl)
                .setName('Modelo clínico')
                .setDesc('Selecciona la base teórica')
                .addDropdown(dropdown => {
                    for (const modelName of Object.keys(this.availableModels)) {
                        dropdown.addOption(modelName, modelName);
                    }
                    if (this.selectedModel) dropdown.setValue(this.selectedModel);
                    dropdown.onChange(v => { this.selectedModel = v; });
                });
        }

        // Action buttons
        const btnDiv = contentEl.createDiv({ cls: 'clinical-os-modal-actions' });

        const backBtn = btnDiv.createEl('button', { text: 'Volver' });
        backBtn.onclick = () => this.renderTypeSelection();

        const createBtn = btnDiv.createEl('button', { text: 'Crear expediente' });
        createBtn.addClass('mod-cta');
        createBtn.onclick = () => this.handleCreate();
    }

    private renderChildFields(container: HTMLElement): void {
        new Setting(container).setName('Adulto responsable').setHeading();

        new Setting(container).setName('Nombre').addText(text => {
            text.setPlaceholder('Nombre del tutor/cuidador')
                .onChange(v => { this.extraData.guardianName = v; });
        });
        new Setting(container).setName('RUT').addText(text => {
            text.setPlaceholder('12.345.678-9')
                .onChange(v => { this.extraData.guardianRut = v; });
        });
        new Setting(container).setName('Teléfono').addText(text => {
            text.setPlaceholder('+56 9 ...')
                .onChange(v => { this.extraData.guardianPhone = v; });
        });
        new Setting(container).setName('Correo electrónico').addText(text => {
            text.setPlaceholder('correo@mail.com')
                .onChange(v => { this.extraData.guardianEmail = v; });
        });
    }

    private renderCoupleFields(container: HTMLElement): void {
        new Setting(container).setName('Datos de la pareja').setHeading();

        new Setting(container).setName('Nombre paciente 2').addText(text => {
            text.setPlaceholder('Nombre de la otra persona')
                .onChange(v => { this.extraData.partnerName = v; });
        });
        new Setting(container).setName('Responsable de pago').addDropdown(dropdown => {
            dropdown.addOption('', 'Sin definir');
            dropdown.addOption('ambos', 'Ambos');
            dropdown.addOption('paciente1', 'Paciente 1');
            dropdown.addOption('paciente2', 'Paciente 2');
            dropdown.onChange(v => { this.extraData.payer = v; });
        });
    }

    private renderFamilyFields(container: HTMLElement): void {
        new Setting(container).setName('Datos de la familia').setHeading();

        new Setting(container).setName('Paciente índice').addText(text => {
            text.setPlaceholder('Nombre del paciente índice')
                .onChange(v => { this.extraData.indexPatient = v; });
        });
        new Setting(container).setName('Miembros de la familia').setDesc('Un miembro por línea').addTextArea(text => {
            text.setPlaceholder('- Nombre (edad), rol\n- Nombre (edad), rol')
                .onChange(v => { this.extraData.familyMembers = v; });
            text.inputEl.rows = 4;
        });
    }

    private renderGroupFields(container: HTMLElement): void {
        new Setting(container).setName('Datos del grupo').setHeading();

        new Setting(container).setName('Integrantes').setDesc('Un integrante por línea').addTextArea(text => {
            text.setPlaceholder('- Nombre\n- Nombre\n- Nombre')
                .onChange(v => { this.extraData.groupMembers = v; });
            text.inputEl.rows = 4;
        });
    }

    private renderSupervisionFields(container: HTMLElement): void {
        new Setting(container).setName('Datos de supervisión').setHeading();

        new Setting(container).setName('Supervisados').setDesc('Un supervisado por línea').addTextArea(text => {
            text.setPlaceholder('- Nombre\n- Nombre')
                .onChange(v => { this.extraData.supervisees = v; });
            text.inputEl.rows = 4;
        });
    }

    private async handleCreate(): Promise<void> {
        if (!this.patientName.trim()) {
            new Notice('Escribe un nombre.');
            return;
        }

        try {
            const noteFile = await createPatient(this.app, {
                name: this.patientName.trim(),
                processType: this.processType,
                selectedModel: this.selectedModel,
                rootFolder: this.rootFolder,
                nextId: this.nextPatientId,
                extraData: this.extraData,
            });

            if (noteFile) {
                await this.onCreated(this.nextPatientId);
                await this.app.workspace.getLeaf().openFile(noteFile);
                new Notice(`Proceso creado: ${this.patientName.trim()}`);
            } else {
                new Notice('Este proceso ya existe.');
            }
        } catch (err) {
            console.error('Clinical OS: Error creating process:', err);
            new Notice('Error al crear el expediente.');
        }

        this.close();
    }
}
