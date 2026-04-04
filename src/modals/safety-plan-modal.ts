import { App, FuzzySuggestModal, Notice } from 'obsidian';
import { getPatientList } from '../services/session';
import { createSafetyPlan } from '../services/safety-plan';

export class SafetyPlanModal extends FuzzySuggestModal<string> {
    private rootFolder: string;

    constructor(app: App, rootFolder: string) {
        super(app);
        this.rootFolder = rootFolder;
        this.setPlaceholder('Seleccionar paciente para el Plan de Seguridad...');
    }

    getItems(): string[] {
        return getPatientList(this.app, this.rootFolder);
    }

    getItemText(item: string): string {
        return item;
    }

    async onChooseItem(item: string): Promise<void> {
        try {
            const file = await createSafetyPlan(this.app, this.rootFolder, item);
            if (file) {
                this.app.workspace.getLeaf().openFile(file);
                new Notice(`Plan de Seguridad creado para ${item}.`);
            } else {
                new Notice('No se encontró la carpeta del paciente.');
            }
        } catch (err) {
            console.error('Clinical OS: Error creating safety plan:', err);
            new Notice('Error al crear el Plan de Seguridad.');
        }
    }
}
