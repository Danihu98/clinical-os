import { Notice, Plugin, moment } from 'obsidian';
import { ClinicalOSData, DEFAULT_DATA } from './types';
import { CONTRIBUTION_URL } from './constants';
import { seedLibrary } from './services/library';
import { generateMonthlySummary, generatePatientRegistry } from './services/session';
import { exportPatientRecord } from './services/export';
import { PatientModal } from './modals/patient-modal';
import { HistoryModal } from './modals/history-modal';
import { SessionModal } from './modals/session-modal';
import { BoletasModal } from './modals/boletas-modal';
import { PatientSearchModal } from './modals/search-modal';
import { SafetyPlanModal } from './modals/safety-plan-modal';
import { ClinicalOSSettingTab } from './settings';

export default class ClinicalOS extends Plugin {
    data: ClinicalOSData = { ...DEFAULT_DATA };

    async onload(): Promise<void> {
        await this.loadPluginData();

        // Ribbon icons
        this.addRibbonIcon('history', 'Guardar hito clínico', async () => {
            await this.createSnapshot();
        });

        this.addRibbonIcon('calendar-plus', 'Registrar sesión', () => {
            new SessionModal(
                this.app,
                this.data,
                this.data.settings.rootFolder,
                () => this.savePluginData()
            ).open();
        });

        // --- Clinical commands ---
        this.addCommand({
            id: 'clinical-new-patient',
            name: 'Clinical: Nuevo paciente',
            callback: () => {
                new PatientModal(
                    this.app,
                    this.data.settings.rootFolder,
                    this.data.nextPatientId,
                    this.data.settings.defaultModel,
                    async (usedId: number) => {
                        this.data.nextPatientId = usedId + 1;
                        await this.savePluginData();
                        await generatePatientRegistry(this.app, this.data.settings.rootFolder);
                    }
                ).open();
            },
        });

        this.addCommand({
            id: 'clinical-search-patient',
            name: 'Clinical: Buscar paciente',
            callback: () => {
                new PatientSearchModal(
                    this.app,
                    this.data.settings.rootFolder
                ).open();
            },
        });

        this.addCommand({
            id: 'clinical-view-history',
            name: 'Clinical: Ver historial del paciente',
            callback: () => new HistoryModal(this.app).open(),
        });

        this.addCommand({
            id: 'clinical-export-record',
            name: 'Clinical: Exportar expediente',
            callback: async () => {
                try {
                    const file = await exportPatientRecord(
                        this.app,
                        this.data,
                        this.data.settings.rootFolder
                    );
                    if (file) {
                        await this.app.workspace.getLeaf().openFile(file);
                        new Notice('Expediente exportado.');
                    } else {
                        new Notice('Abre un archivo dentro de la carpeta de un paciente.');
                    }
                } catch (err) {
                    console.error('Clinical OS: Export error:', err);
                    new Notice('Error al exportar.');
                }
            },
        });

        this.addCommand({
            id: 'clinical-safety-plan',
            name: 'Clinical: Plan de seguridad',
            callback: () => {
                new SafetyPlanModal(
                    this.app,
                    this.data.settings.rootFolder
                ).open();
            },
        });

        this.addCommand({
            id: 'clinical-propose-content',
            name: 'Clinical: Proponer mejora',
            callback: async () => { await this.proposeContent(); },
        });

        // --- Administrative commands ---
        this.addCommand({
            id: 'clinical-register-session',
            name: 'Clinical: Registrar sesión',
            callback: () => {
                new SessionModal(
                    this.app,
                    this.data,
                    this.data.settings.rootFolder,
                    () => this.savePluginData()
                ).open();
            },
        });

        this.addCommand({
            id: 'clinical-pending-boletas',
            name: 'Clinical: Boletas pendientes',
            callback: () => {
                new BoletasModal(
                    this.app,
                    this.data,
                    () => this.savePluginData()
                ).open();
            },
        });

        this.addCommand({
            id: 'clinical-patient-registry',
            name: 'Clinical: Actualizar registro de pacientes',
            callback: async () => {
                try {
                    const file = await generatePatientRegistry(
                        this.app,
                        this.data.settings.rootFolder
                    );
                    await this.app.workspace.getLeaf().openFile(file);
                    new Notice('Registro de pacientes actualizado.');
                } catch (err) {
                    console.error('Clinical OS: Error updating registry:', err);
                    new Notice('Error al actualizar el registro.');
                }
            },
        });

        this.addCommand({
            id: 'clinical-monthly-summary',
            name: 'Clinical: Resumen mensual',
            callback: async () => {
                try {
                    const file = await generateMonthlySummary(
                        this.app,
                        this.data,
                        this.data.settings.rootFolder
                    );
                    await this.app.workspace.getLeaf().openFile(file);
                    new Notice('Resumen mensual generado.');
                } catch (err) {
                    console.error('Clinical OS: Error generating summary:', err);
                    new Notice('Error al generar el resumen.');
                }
            },
        });

        // Settings tab
        this.addSettingTab(new ClinicalOSSettingTab(
            this.app,
            this,
            this.data,
            () => this.savePluginData()
        ));

        // Seed library after layout is ready
        this.app.workspace.onLayoutReady(async () => {
            try {
                await seedLibrary(this.app.vault, this.data.settings.rootFolder);
            } catch (error) {
                console.error('Clinical OS: Error seeding library:', error);
            }
        });
    }

    onunload(): void {
        console.debug('Clinical OS unloaded.');
    }

    private async loadPluginData(): Promise<void> {
        const saved = await this.loadData();
        if (saved) {
            this.data = {
                ...DEFAULT_DATA,
                ...saved,
                settings: { ...DEFAULT_DATA.settings, ...(saved.settings || {}) },
                sessions: saved.sessions || [],
            };
        }
    }

    private async savePluginData(): Promise<void> {
        await this.saveData(this.data);
    }

    private async createSnapshot(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        const rootFolder = this.data.settings.rootFolder;

        if (!activeFile || activeFile.extension !== 'canvas') {
            new Notice('Abre el Canvas del paciente primero.');
            return;
        }

        if (!activeFile.path.includes(rootFolder)) {
            new Notice(`El archivo debe estar dentro de "${rootFolder}".`);
            return;
        }

        const patientFolder = activeFile.parent;
        if (!patientFolder) return;

        const historyFolder = `${patientFolder.path}/Historial`;

        if (!this.app.vault.getAbstractFileByPath(historyFolder)) {
            await this.app.vault.createFolder(historyFolder);
        }

        const timestamp = moment().format('YYYY-MM-DD_HHmm');
        const newName = `${timestamp}_${activeFile.name}`;
        await this.app.vault.copy(activeFile, `${historyFolder}/${newName}`);

        new Notice('Hito guardado.');
    }

    private async proposeContent(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === 'md') {
            try {
                const content = await this.app.vault.read(activeFile);
                await navigator.clipboard.writeText(content);
                new Notice('Contenido copiado al portapapeles.');
            } catch {
                new Notice('Error al copiar contenido.');
            }
        }
        window.open(CONTRIBUTION_URL);
    }
}
