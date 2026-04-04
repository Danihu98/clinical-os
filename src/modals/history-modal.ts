import { App, Modal, TFile, TFolder, TAbstractFile } from 'obsidian';

export class HistoryModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.addClass('clinical-os-modal');
        contentEl.createEl('h2', { text: 'Historial de Cambios' });

        const activeFile = this.app.workspace.getActiveFile();

        if (!activeFile || !activeFile.parent || !activeFile.path.includes('Pacientes')) {
            contentEl.createEl('p', {
                text: 'Por favor, abre la ficha de un paciente.',
                cls: 'clinical-os-empty-state',
            });
            return;
        }

        const historyPath = `${activeFile.parent.path}/Historial`;
        const historyFolder = this.app.vault.getAbstractFileByPath(historyPath);

        if (!historyFolder || !(historyFolder instanceof TFolder) || historyFolder.children.length === 0) {
            contentEl.createEl('p', {
                text: 'No hay hitos guardados.',
                cls: 'clinical-os-empty-state',
            });
            return;
        }

        const files = historyFolder.children
            .filter((f: TAbstractFile): f is TFile => f instanceof TFile)
            .sort((a, b) => b.name.localeCompare(a.name));

        const list = contentEl.createEl('ul', { cls: 'clinical-os-history-list' });

        for (const file of files) {
            const item = list.createEl('li', { cls: 'clinical-os-history-item' });

            const datePart = file.name.substring(0, 15);
            const label = this.formatSnapshotName(datePart);

            item.createEl('span', { text: label, cls: 'clinical-os-history-date' });
            item.createEl('span', { text: file.name, cls: 'clinical-os-history-file' });

            item.onclick = () => {
                this.app.workspace.getLeaf(true).openFile(file);
                this.close();
            };
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private formatSnapshotName(raw: string): string {
        // "2024-03-15_1430" -> "15 Mar 2024 - 14:30"
        const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})$/);
        if (!match) return raw;
        const [, year, month, day, hour, min] = match;
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${day} ${months[parseInt(month) - 1]} ${year} - ${hour}:${min}`;
    }
}
