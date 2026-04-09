import { App, TFile, TFolder, TAbstractFile, moment } from 'obsidian';
import { Session, ClinicalOSData } from '../types';
import { PATIENTS_SUBFOLDER, ADMIN_SUBFOLDER } from '../constants';
import { ensureFolder } from './vault-utils';

export function getPatientList(app: App, rootFolder: string): string[] {
    const patientsPath = `${rootFolder}/${PATIENTS_SUBFOLDER}`;
    const folder = app.vault.getAbstractFileByPath(patientsPath);
    if (!folder || !(folder instanceof TFolder)) return [];
    return folder.children
        .filter((c: TAbstractFile): c is TFolder => c instanceof TFolder)
        .map(c => c.name)
        .sort();
}

export function getPatientFee(app: App, rootFolder: string, patientName: string): number {
    const patientPath = `${rootFolder}/${PATIENTS_SUBFOLDER}/${patientName}`;
    const folder = app.vault.getAbstractFileByPath(patientPath);
    if (!folder || !(folder instanceof TFolder)) return 0;

    const fichaFile = folder.children.find(
        (f: TAbstractFile): f is TFile =>
            f instanceof TFile && f.name.includes('Ficha') && f.extension === 'md'
    );
    if (!fichaFile) return 0;

    const cache = app.metadataCache.getFileCache(fichaFile);
    return cache?.frontmatter?.honorarios || 0;
}

export function registerSession(
    data: ClinicalOSData,
    patientName: string,
    date: string,
    fee: number
): Session {
    const session: Session = {
        id: Date.now().toString(36),
        patientName,
        date,
        fee,
        boletaPending: true,
    };
    data.sessions.push(session);
    return session;
}

export function markBoletaEmitted(data: ClinicalOSData, sessionId: string): void {
    const session = data.sessions.find(s => s.id === sessionId);
    if (session) {
        session.boletaPending = false;
    }
}

export function getPendingBoletas(data: ClinicalOSData): Session[] {
    return data.sessions
        .filter(s => s.boletaPending)
        .sort((a, b) => a.date.localeCompare(b.date));
}

export function getSessionsByMonth(data: ClinicalOSData, yearMonth: string): Session[] {
    return data.sessions
        .filter(s => s.date.startsWith(yearMonth))
        .sort((a, b) => a.date.localeCompare(b.date));
}

export function formatCLP(amount: number): string {
    return '$' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export async function generatePatientRegistry(
    app: App,
    rootFolder: string
): Promise<TFile> {
    const patients = getPatientList(app, rootFolder);

    let md = `# Registro de pacientes\n\n`;
    md += `| ID | Paciente | Honorarios | Estado |\n`;
    md += `| -- | -------- | ---------- | ------ |\n`;

    for (const name of patients) {
        const patientPath = `${rootFolder}/${PATIENTS_SUBFOLDER}/${name}`;
        const folder = app.vault.getAbstractFileByPath(patientPath);
        let id = '-';
        let fee = 0;
        let status = '-';

        let fichaBasename = '';
        if (folder && folder instanceof TFolder) {
            const fichaFile = folder.children.find(
                (f: TAbstractFile): f is TFile =>
                    f instanceof TFile && f.name.includes('Ficha') && f.extension === 'md'
            );
            if (fichaFile) {
                fichaBasename = fichaFile.basename;
                const cache = app.metadataCache.getFileCache(fichaFile);
                const fm = cache?.frontmatter;
                if (fm) {
                    if (fm.expediente) id = String(fm.expediente);
                    if (fm.honorarios) fee = Number(fm.honorarios);
                    if (fm.status) status = String(fm.status);
                }
            }
        }

        const link = fichaBasename ? `[[${fichaBasename}\\|${name}]]` : name;
        md += `| ${id} | ${link} | ${formatCLP(fee)} | ${status} |\n`;
    }

    if (patients.length === 0) {
        md += `| - | Sin pacientes registrados | - | - |\n`;
    }

    md += `\n- **Total pacientes:** ${patients.length}\n`;
    md += `\n---\n*Actualizado el ${moment().format('DD/MM/YYYY HH:mm')}*\n`;

    const adminFolder = `${rootFolder}/${ADMIN_SUBFOLDER}`;
    await ensureFolder(app.vault, adminFolder);

    const filePath = `${adminFolder}/Registro de Pacientes.md`;
    const existing = app.vault.getAbstractFileByPath(filePath);
    if (existing instanceof TFile) {
        await app.vault.modify(existing, md);
        return existing;
    }
    return await app.vault.create(filePath, md);
}

export async function generateMonthlySummary(
    app: App,
    data: ClinicalOSData,
    rootFolder: string,
    yearMonth?: string
): Promise<TFile> {
    const ym = yearMonth || moment().format('YYYY-MM');
    const [year, month] = ym.split('-');
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthName = months[parseInt(month) - 1] || month;

    const sessions = getSessionsByMonth(data, ym);
    const totalIncome = sessions.reduce((sum, s) => sum + s.fee, 0);
    const pendingCount = sessions.filter(s => s.boletaPending).length;
    const pendingSessions = sessions.filter(s => s.boletaPending);

    // Group by patient
    const byPatient: Record<string, { count: number; total: number }> = {};
    for (const s of sessions) {
        if (!byPatient[s.patientName]) {
            byPatient[s.patientName] = { count: 0, total: 0 };
        }
        byPatient[s.patientName].count++;
        byPatient[s.patientName].total += s.fee;
    }

    let md = `# Resumen - ${monthName} ${year}\n\n`;

    // Session table
    md += `## Sesiones\n\n`;
    md += `| Fecha | Paciente | Honorarios | Boleta |\n`;
    md += `| ----- | -------- | ---------- | ------ |\n`;
    for (const s of sessions) {
        const status = s.boletaPending ? '⬜ Pendiente' : '✅ Emitida';
        md += `| ${s.date} | ${s.patientName} | ${formatCLP(s.fee)} | ${status} |\n`;
    }
    if (sessions.length === 0) {
        md += `| - | Sin sesiones registradas | - | - |\n`;
    }

    // Summary by patient
    md += `\n## Desglose por paciente\n\n`;
    md += `| Paciente | Sesiones | Total |\n`;
    md += `| -------- | -------- | ----- |\n`;
    for (const [name, info] of Object.entries(byPatient).sort((a, b) => a[0].localeCompare(b[0]))) {
        md += `| ${name} | ${info.count} | ${formatCLP(info.total)} |\n`;
    }

    // Totals
    md += `\n## Totales\n\n`;
    md += `- **Sesiones realizadas:** ${sessions.length}\n`;
    md += `- **Ingreso total:** ${formatCLP(totalIncome)}\n`;
    md += `- **Boletas pendientes:** ${pendingCount}\n`;

    // Pending boletas checklist
    if (pendingSessions.length > 0) {
        md += `\n## Boletas pendientes\n\n`;
        for (const s of pendingSessions) {
            md += `- [ ] ${s.patientName} - ${s.date} - ${formatCLP(s.fee)}\n`;
        }
    }

    md += `\n---\n*Generado el ${moment().format('DD/MM/YYYY HH:mm')}*\n`;

    // Write file
    const adminFolder = `${rootFolder}/${ADMIN_SUBFOLDER}`;
    await ensureFolder(app.vault, adminFolder);

    const filePath = `${adminFolder}/${ym}_Resumen.md`;
    const existing = app.vault.getAbstractFileByPath(filePath);
    if (existing instanceof TFile) {
        await app.vault.modify(existing, md);
        return existing;
    }
    return await app.vault.create(filePath, md);
}
