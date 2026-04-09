import { App, Modal, Notice, Setting } from 'obsidian';
import { ClinicalOSData, Colleague } from '../types';

export class ColleagueNetworkModal extends Modal {
    private data: ClinicalOSData;
    private onSave: () => Promise<void>;
    private filterSpecialty = '';

    constructor(app: App, data: ClinicalOSData, onSave: () => Promise<void>) {
        super(app);
        this.data = data;
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

        contentEl.createEl('h2', { text: `Red de colegas (${this.data.colleagues.length})` });

        // Filter by specialty
        const specialties = [...new Set(this.data.colleagues.map(c => c.specialty).filter(Boolean))];
        if (specialties.length > 0) {
            new Setting(contentEl)
                .setName('Filtrar por especialidad')
                .addDropdown(dropdown => {
                    dropdown.addOption('', 'Todas');
                    for (const s of specialties.sort()) {
                        dropdown.addOption(s, s);
                    }
                    dropdown.setValue(this.filterSpecialty);
                    dropdown.onChange(value => {
                        this.filterSpecialty = value;
                        this.renderList();
                    });
                });
        }

        const filtered = this.filterSpecialty
            ? this.data.colleagues.filter(c => c.specialty === this.filterSpecialty)
            : this.data.colleagues;

        if (filtered.length === 0 && this.data.colleagues.length === 0) {
            contentEl.createEl('p', {
                text: 'No hay colegas registrados aún.',
                cls: 'clinical-os-empty-state',
            });
        } else if (filtered.length === 0) {
            contentEl.createEl('p', {
                text: 'No hay colegas con esta especialidad.',
                cls: 'clinical-os-empty-state',
            });
        } else {
            const list = contentEl.createDiv({ cls: 'clinical-os-colleague-list' });
            for (const colleague of filtered.sort((a, b) => b.trust - a.trust)) {
                this.renderColleagueCard(list, colleague);
            }
        }

        const btnDiv = contentEl.createDiv({ cls: 'clinical-os-modal-actions' });
        const addBtn = btnDiv.createEl('button', { text: 'Agregar colega' });
        addBtn.addClass('mod-cta');
        addBtn.onclick = () => this.renderForm(null);
    }

    private renderColleagueCard(container: HTMLElement, colleague: Colleague): void {
        const card = container.createDiv({ cls: 'clinical-os-colleague-card' });

        const header = card.createDiv({ cls: 'clinical-os-colleague-header' });
        header.createEl('span', { text: colleague.name, cls: 'clinical-os-colleague-name' });
        header.createEl('span', {
            text: '★'.repeat(colleague.trust) + '☆'.repeat(5 - colleague.trust),
            cls: 'clinical-os-colleague-trust',
        });

        const details = card.createDiv({ cls: 'clinical-os-colleague-details' });
        if (colleague.specialty) {
            details.createEl('span', { text: colleague.specialty });
        }
        if (colleague.orientation) {
            details.createEl('span', { text: `· ${colleague.orientation}` });
        }

        if (colleague.referralFor) {
            card.createEl('div', {
                text: `Derivar para: ${colleague.referralFor}`,
                cls: 'clinical-os-colleague-referral',
            });
        }

        const contact = card.createDiv({ cls: 'clinical-os-colleague-contact' });
        if (colleague.phone) contact.createEl('span', { text: colleague.phone });
        if (colleague.email) contact.createEl('span', { text: colleague.email });

        const actions = card.createDiv({ cls: 'clinical-os-colleague-actions' });
        const editBtn = actions.createEl('button', { text: 'Editar' });
        editBtn.onclick = () => this.renderForm(colleague);

        const delBtn = actions.createEl('button', { text: 'Eliminar' });
        delBtn.addClass('mod-warning');
        delBtn.onclick = async () => {
            this.data.colleagues = this.data.colleagues.filter(c => c.id !== colleague.id);
            await this.onSave();
            new Notice(`${colleague.name} eliminado de la red.`);
            this.renderList();
        };
    }

    private renderForm(existing: Colleague | null): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('clinical-os-modal');

        const isEdit = existing !== null;
        contentEl.createEl('h2', { text: isEdit ? 'Editar colega' : 'Agregar colega' });

        const form: Partial<Colleague> = existing
            ? { ...existing }
            : { name: '', specialty: '', orientation: '', trust: 3, referralFor: '', phone: '', email: '' };

        new Setting(contentEl).setName('Nombre').addText(text => {
            text.setValue(form.name ?? '').onChange(v => { form.name = v; });
        });

        new Setting(contentEl).setName('Especialidad').setDesc('Ej: Psiquiatría, Neuropsicología, Infanto-juvenil').addText(text => {
            text.setValue(form.specialty ?? '').onChange(v => { form.specialty = v; });
        });

        new Setting(contentEl).setName('Orientación teórica').setDesc('Ej: TCC, Sistémica, Psicodinámica').addText(text => {
            text.setValue(form.orientation ?? '').onChange(v => { form.orientation = v; });
        });

        new Setting(contentEl).setName('Confianza').setDesc('1 = no conozco bien, 5 = total confianza').addSlider(slider => {
            slider.setLimits(1, 5, 1).setValue(form.trust ?? 3).setDynamicTooltip().onChange(v => { form.trust = v; });
        });

        new Setting(contentEl).setName('Derivar para...').setDesc('Tipos de casos que le derivas').addText(text => {
            text.setValue(form.referralFor ?? '').onChange(v => { form.referralFor = v; });
        });

        new Setting(contentEl).setName('Teléfono').addText(text => {
            text.setValue(form.phone ?? '').onChange(v => { form.phone = v; });
        });

        new Setting(contentEl).setName('Email').addText(text => {
            text.setValue(form.email ?? '').onChange(v => { form.email = v; });
        });

        const btnDiv = contentEl.createDiv({ cls: 'clinical-os-modal-actions' });

        const cancelBtn = btnDiv.createEl('button', { text: 'Cancelar' });
        cancelBtn.onclick = () => this.renderList();

        const saveBtn = btnDiv.createEl('button', { text: isEdit ? 'Guardar' : 'Agregar' });
        saveBtn.addClass('mod-cta');
        saveBtn.onclick = async () => {
            if (!form.name?.trim()) {
                new Notice('El nombre es obligatorio.');
                return;
            }

            if (isEdit && existing) {
                Object.assign(existing, form);
            } else {
                this.data.colleagues.push({
                    id: Date.now().toString(),
                    name: form.name!.trim(),
                    specialty: form.specialty?.trim() ?? '',
                    orientation: form.orientation?.trim() ?? '',
                    trust: form.trust ?? 3,
                    referralFor: form.referralFor?.trim() ?? '',
                    phone: form.phone?.trim() ?? '',
                    email: form.email?.trim() ?? '',
                });
            }

            await this.onSave();
            new Notice(isEdit ? 'Colega actualizado.' : 'Colega agregado a la red.');
            this.renderList();
        };
    }
}
