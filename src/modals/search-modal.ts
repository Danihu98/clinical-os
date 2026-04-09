import { App, FuzzySuggestModal } from 'obsidian';
import { getPatientList } from '../services/session';
import { findPatientFicha } from '../services/patient';

export class PatientSearchModal extends FuzzySuggestModal<string> {
    private rootFolder: string;

    constructor(app: App, rootFolder: string) {
        super(app);
        this.rootFolder = rootFolder;
        this.setPlaceholder('Buscar paciente...');
    }

    getItems(): string[] {
        return getPatientList(this.app, this.rootFolder);
    }

    getItemText(item: string): string {
        return item;
    }

    onChooseItem(item: string): void {
        const ficha = findPatientFicha(this.app, this.rootFolder, item);
        if (ficha) {
            void this.app.workspace.getLeaf().openFile(ficha);
        }
    }
}
