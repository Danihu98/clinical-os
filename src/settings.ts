import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { ClinicalOSData } from './types';
import { detectCanvasModels } from './services/patient';

export class ClinicalOSSettingTab extends PluginSettingTab {
    private data: ClinicalOSData;
    private onSave: () => Promise<void>;

    constructor(app: App, plugin: Plugin, data: ClinicalOSData, onSave: () => Promise<void>) {
        super(app, plugin);
        this.data = data;
        this.onSave = onSave;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl).setName('Clinical OS').setHeading();

        new Setting(containerEl)
            .setName('Carpeta raíz')
            .setDesc('Nombre de la carpeta principal donde se guarda todo el contenido clínico.')
            .addText(text => text
                .setPlaceholder('Espacio Clínico')
                .setValue(this.data.settings.rootFolder)
                .onChange(async (value) => {
                    this.data.settings.rootFolder = value || 'Espacio Clínico';
                    await this.onSave();
                }));

        const models = detectCanvasModels(this.app, this.data.settings.rootFolder);
        const modelNames = Object.keys(models);

        new Setting(containerEl)
            .setName('Honorarios por defecto')
            .setDesc('Monto preseleccionado al registrar una sesión (0 = sin valor por defecto).')
            .addText(text => {
                text.setPlaceholder('Ej: 50000')
                    .setValue(this.data.settings.defaultFee > 0 ? this.data.settings.defaultFee.toString() : '')
                    .onChange(async (value) => {
                        this.data.settings.defaultFee = parseInt(value.replace(/\D/g, ''), 10) || 0;
                        await this.onSave();
                    });
                text.inputEl.inputMode = 'numeric';
            });

        if (modelNames.length > 0) {
            new Setting(containerEl)
                .setName('Modelo clínico por defecto')
                .setDesc('Modelo teórico preseleccionado al crear un nuevo paciente.')
                .addDropdown(dropdown => {
                    for (const name of modelNames) {
                        dropdown.addOption(name, name);
                    }
                    if (this.data.settings.defaultModel) {
                        dropdown.setValue(this.data.settings.defaultModel);
                    }
                    dropdown.onChange(async (value) => {
                        this.data.settings.defaultModel = value;
                        await this.onSave();
                    });
                });
        }

        new Setting(containerEl).setName('Información').setHeading();
        containerEl.createEl('p', {
            text: `Próximo ID de paciente: ${String(this.data.nextPatientId).padStart(3, '0')}`,
            cls: 'setting-item-description',
        });
    }
}
