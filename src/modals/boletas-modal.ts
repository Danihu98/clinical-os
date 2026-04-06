import { App, Modal, Notice } from 'obsidian';
import { ClinicalOSData } from '../types';
import { getPendingBoletas, markBoletaEmitted, formatCLP } from '../services/session';

export class BoletasModal extends Modal {
    private data: ClinicalOSData;
    private onSave: () => Promise<void>;

    constructor(app: App, data: ClinicalOSData, onSave: () => Promise<void>) {
        super(app);
        this.data = data;
        this.onSave = onSave;
    }

    onOpen(): void {
        this.renderContent();
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private renderContent(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clinical-os-modal');

        const pending = getPendingBoletas(this.data);

        contentEl.createEl('h2', { text: `Boletas pendientes (${pending.length})` });

        if (pending.length === 0) {
            contentEl.createEl('p', {
                text: 'No hay boletas pendientes.',
                cls: 'clinical-os-empty-state',
            });
            return;
        }

        const totalPending = pending.reduce((sum, s) => sum + s.fee, 0);

        const list = contentEl.createEl('div', { cls: 'clinical-os-boletas-list' });

        for (const session of pending) {
            const item = list.createDiv({ cls: 'clinical-os-boleta-item' });

            const info = item.createDiv({ cls: 'clinical-os-boleta-info' });
            info.createEl('span', {
                text: session.patientName,
                cls: 'clinical-os-boleta-name',
            });
            info.createEl('span', {
                text: `${session.date}  ·  ${formatCLP(session.fee)}`,
                cls: 'clinical-os-boleta-detail',
            });

            const btn = item.createEl('button', { text: 'Emitida' });
            btn.addClass('mod-cta');
            btn.addClass('clinical-os-boleta-btn');
            btn.onclick = async () => {
                markBoletaEmitted(this.data, session.id);
                await this.onSave();
                new Notice(`Boleta marcada: ${session.patientName}`);
                this.renderContent();
            };
        }

        const footer = contentEl.createDiv({ cls: 'clinical-os-boletas-footer' });
        footer.createEl('span', {
            text: `Total pendiente: ${formatCLP(totalPending)}`,
        });
    }
}
