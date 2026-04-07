import { Notice, Plugin, TFile, moment } from 'obsidian';
import { ClinicalOSData, DEFAULT_DATA } from './types';
import { CONTRIBUTION_URL, PATIENTS_SUBFOLDER } from './constants';
import { seedLibrary } from './services/library';
import { generateMonthlySummary, generatePatientRegistry } from './services/session';
import { exportPatientRecord } from './services/export';
import { PatientModal } from './modals/patient-modal';
import { HistoryModal } from './modals/history-modal';
import { SessionModal } from './modals/session-modal';
import { BoletasModal } from './modals/boletas-modal';
import { PatientSearchModal } from './modals/search-modal';
import { SafetyPlanModal } from './modals/safety-plan-modal';
import { ColleagueNetworkModal } from './modals/colleague-modal';
import { AlertModal } from './modals/alert-modal';
import { seedTestData } from './services/seed-test-data';
import { ClinicalOSSettingTab } from './settings';
import { appendSessionTemplate } from './services/session-planning';

export default class ClinicalOS extends Plugin {
    data: ClinicalOSData = { ...DEFAULT_DATA };

    async onload(): Promise<void> {
        await this.loadPluginData();

        // Ribbon icons
        this.addRibbonIcon('history', 'Guardar Hito Clínico', async () => {
            await this.createSnapshot();
        });

        this.addRibbonIcon('calendar-plus', 'Registrar Sesión', () => {
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
            name: 'Clinical: Nuevo proceso',
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
            name: 'Clinical: Buscar Paciente',
            callback: () => {
                new PatientSearchModal(
                    this.app,
                    this.data.settings.rootFolder
                ).open();
            },
        });

        this.addCommand({
            id: 'clinical-view-history',
            name: 'Clinical: Ver Historial del Paciente',
            callback: () => new HistoryModal(this.app).open(),
        });

        this.addCommand({
            id: 'clinical-export-record',
            name: 'Clinical: Exportar Expediente',
            callback: async () => {
                try {
                    const file = await exportPatientRecord(
                        this.app,
                        this.data,
                        this.data.settings.rootFolder
                    );
                    if (file) {
                        this.app.workspace.getLeaf().openFile(file);
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
            name: 'Clinical: Plan de Seguridad',
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
            callback: () => this.proposeContent(),
        });

        this.addCommand({
            id: 'clinical-new-session-plan',
            name: 'Clinical: Nueva sesión (planificar)',
            callback: async () => {
                const num = await appendSessionTemplate(this.app, this.data.settings.rootFolder);
                if (num !== null) {
                    new Notice(`Sesión ${num} agregada.`);
                } else {
                    new Notice('Abre la ficha de un paciente primero.');
                }
            },
        });

        this.addCommand({
            id: 'clinical-alerts',
            name: 'Clinical: Alertas clínicas',
            callback: () => {
                new AlertModal(
                    this.app,
                    this.data,
                    this.data.settings.rootFolder,
                    () => this.savePluginData()
                ).open();
            },
        });

        this.addCommand({
            id: 'clinical-colleague-network',
            name: 'Clinical: Red de colegas',
            callback: () => {
                new ColleagueNetworkModal(
                    this.app,
                    this.data,
                    () => this.savePluginData()
                ).open();
            },
        });

        // --- Administrative commands ---
        this.addCommand({
            id: 'clinical-register-session',
            name: 'Clinical: Registrar Sesión',
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
            name: 'Clinical: Boletas Pendientes',
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
            name: 'Clinical: Actualizar Registro de Pacientes',
            callback: async () => {
                try {
                    const file = await generatePatientRegistry(
                        this.app,
                        this.data.settings.rootFolder
                    );
                    this.app.workspace.getLeaf().openFile(file);
                    new Notice('Registro de pacientes actualizado.');
                } catch (err) {
                    console.error('Clinical OS: Error updating registry:', err);
                    new Notice('Error al actualizar el registro.');
                }
            },
        });

        this.addCommand({
            id: 'clinical-monthly-summary',
            name: 'Clinical: Resumen Mensual',
            callback: async () => {
                try {
                    const file = await generateMonthlySummary(
                        this.app,
                        this.data,
                        this.data.settings.rootFolder
                    );
                    this.app.workspace.getLeaf().openFile(file);
                    new Notice('Resumen mensual generado.');
                } catch (err) {
                    console.error('Clinical OS: Error generating summary:', err);
                    new Notice('Error al generar el resumen.');
                }
            },
        });

        // --- Development ---
        this.addCommand({
            id: 'clinical-seed-test-data',
            name: 'Clinical (Dev): Cargar datos de prueba',
            callback: async () => {
                try {
                    const count = await seedTestData(this.app, this.data);
                    await this.savePluginData();
                    new Notice(`Datos de prueba cargados: ${count} pacientes, ${this.data.colleagues.length} colegas, ${this.data.alerts.filter(a => !a.resolved).length} alertas.`);
                } catch (err) {
                    console.error('Clinical OS: Error seeding test data:', err);
                    new Notice('Error al cargar datos de prueba.');
                }
            },
        });

        // Settings tab
        this.addSettingTab(new ClinicalOSSettingTab(
            this.app,
            this.manifest.id,
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

        // Show clinical alerts when opening a patient file
        this.registerEvent(
            this.app.workspace.on('file-open', (file: TFile | null) => {
                if (!file) return;
                const patientName = this.extractPatientName(file.path);
                if (!patientName) return;

                const active = this.data.alerts.filter(
                    a => a.patientName === patientName && !a.resolved
                );
                for (const alert of active) {
                    if (alert.type === 'reminder') {
                        new Notice(`[Recordatorio] ${alert.patientName}: ${alert.message}`, 6000);
                    } else {
                        const prefix = alert.severity === 'critical' ? '[ALERTA CRÍTICA]'
                            : alert.severity === 'warning' ? '[ALERTA]'
                            : '[Info]';
                        new Notice(`${prefix} ${alert.patientName}: ${alert.message}`, 8000);
                    }
                }
            })
        );
    }

    onunload(): void {
        console.debug('Clinical OS unloaded.');
    }

    private extractPatientName(filePath: string): string | null {
        const root = this.data.settings.rootFolder;
        const prefix = `${root}/${PATIENTS_SUBFOLDER}/`;
        if (!filePath.includes(prefix)) return null;
        const afterPrefix = filePath.slice(filePath.indexOf(prefix) + prefix.length);
        const patientName = afterPrefix.split('/')[0];
        return patientName || null;
    }

    private async loadPluginData(): Promise<void> {
        const saved = await this.loadData();
        if (saved) {
            this.data = {
                ...DEFAULT_DATA,
                ...saved,
                settings: { ...DEFAULT_DATA.settings, ...(saved.settings || {}) },
                sessions: saved.sessions || [],
                colleagues: saved.colleagues || [],
                alerts: saved.alerts || [],
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

    private proposeContent(): void {
        const title = encodeURIComponent('[Sugerencia] ');
        const body = encodeURIComponent(
            '## Tipo de sugerencia\n' +
            '- [ ] Nuevo concepto clínico\n' +
            '- [ ] Mejora a plantilla existente\n' +
            '- [ ] Lectura recomendada\n' +
            '- [ ] Reporte de error\n' +
            '- [ ] Otra idea\n\n' +
            '## Descripción\n\n\n' +
            '## Beneficio clínico o práctico\n\n'
        );
        window.open(`${CONTRIBUTION_URL}/new?title=${title}&body=${body}`);
    }
}
