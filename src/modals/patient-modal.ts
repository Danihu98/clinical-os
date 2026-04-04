import { App, Modal, Notice, Setting } from 'obsidian';
import { detectCanvasModels, createPatient } from '../services/patient';

export class PatientModal extends Modal {
    private rootFolder: string;
    private nextPatientId: number;
    private onCreated: (usedId: number) => Promise<void>;

    private patientName = '';
    private selectedModel = '';
    private availableModels: Record<string, string> = {};

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
        const { contentEl } = this;
        contentEl.addClass('clinical-os-modal');
        contentEl.createEl('h2', { text: 'Nuevo Expediente' });

        const idDisplay = contentEl.createEl('p', {
            text: `ID: ${String(this.nextPatientId).padStart(3, '0')}`,
            cls: 'clinical-os-id-badge',
        });

        new Setting(contentEl)
            .setName('Nombre del Paciente')
            .addText(text => {
                text.setPlaceholder('Ej: Ana López')
                    .onChange(value => { this.patientName = value; });
                text.inputEl.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handleCreate();
                });
                // Auto-focus
                setTimeout(() => text.inputEl.focus(), 50);
            });

        if (Object.keys(this.availableModels).length > 0) {
            new Setting(contentEl)
                .setName('Modelo Clínico')
                .setDesc('Selecciona la base teórica')
                .addDropdown(dropdown => {
                    for (const modelName of Object.keys(this.availableModels)) {
                        dropdown.addOption(modelName, modelName);
                    }
                    if (this.selectedModel) {
                        dropdown.setValue(this.selectedModel);
                    }
                    dropdown.onChange(value => { this.selectedModel = value; });
                });
        }

        const btnDiv = contentEl.createDiv({ cls: 'clinical-os-modal-actions' });

        const btn = btnDiv.createEl('button', { text: 'Crear Expediente' });
        btn.addClass('mod-cta');
        btn.onclick = () => this.handleCreate();
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private async handleCreate(): Promise<void> {
        if (!this.patientName.trim()) {
            new Notice('Escribe un nombre.');
            return;
        }

        try {
            const noteFile = await createPatient(this.app, {
                name: this.patientName.trim(),
                selectedModel: this.selectedModel,
                rootFolder: this.rootFolder,
                nextId: this.nextPatientId,
            });

            if (noteFile) {
                await this.onCreated(this.nextPatientId);
                this.app.workspace.getLeaf().openFile(noteFile);
                new Notice(`Paciente creado: ${this.patientName.trim()}`);
            } else {
                new Notice('Este paciente ya existe.');
            }
        } catch (err) {
            console.error('Clinical OS: Error creating patient:', err);
            new Notice('Error al crear el expediente.');
        }

        this.close();
    }
}
