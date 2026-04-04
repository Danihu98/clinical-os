import { App, TFile, TFolder, TAbstractFile, moment } from 'obsidian';
import { ClinicalOSData, Session } from '../types';
import { PATIENTS_SUBFOLDER } from '../constants';
import { formatCLP } from './session';

export async function exportPatientRecord(
    app: App,
    data: ClinicalOSData,
    rootFolder: string
): Promise<TFile | null> {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) return null;

    // Find the patient folder from the active file
    const patientsRoot = `${rootFolder}/${PATIENTS_SUBFOLDER}`;
    if (!activeFile.path.startsWith(patientsRoot)) return null;

    const relativePath = activeFile.path.substring(patientsRoot.length + 1);
    const patientName = relativePath.split('/')[0];
    if (!patientName) return null;

    const patientFolderPath = `${patientsRoot}/${patientName}`;
    const patientFolder = app.vault.getAbstractFileByPath(patientFolderPath);
    if (!patientFolder || !(patientFolder instanceof TFolder)) return null;

    // Find the ficha
    const fichaFile = patientFolder.children.find(
        (f: TAbstractFile): f is TFile =>
            f instanceof TFile && f.name.includes('Ficha') && f.extension === 'md'
    );

    // Read ficha content
    let fichaContent = '';
    if (fichaFile) {
        fichaContent = await app.vault.read(fichaFile);
    }

    // Get patient sessions
    const sessions = data.sessions
        .filter(s => s.patientName === patientName)
        .sort((a, b) => a.date.localeCompare(b.date));

    // Build export document
    let md = `# Expediente: ${patientName}\n`;
    md += `*Exportado el ${moment().format('DD/MM/YYYY HH:mm')}*\n\n`;
    md += `---\n\n`;

    // Ficha content (strip frontmatter)
    if (fichaContent) {
        const stripped = fichaContent.replace(/^---[\s\S]*?---\n*/, '');
        md += stripped.trim();
        md += '\n\n';
    }

    // Session history
    if (sessions.length > 0) {
        md += `---\n\n`;
        md += `## Historial de sesiones registradas\n\n`;
        md += `| # | Fecha | Honorarios | Boleta |\n`;
        md += `| - | ----- | ---------- | ------ |\n`;

        let totalFees = 0;
        sessions.forEach((s: Session, i: number) => {
            const status = s.boletaPending ? 'Pendiente' : 'Emitida';
            md += `| ${i + 1} | ${s.date} | ${formatCLP(s.fee)} | ${status} |\n`;
            totalFees += s.fee;
        });

        md += `\n`;
        md += `- **Total sesiones:** ${sessions.length}\n`;
        md += `- **Total honorarios:** ${formatCLP(totalFees)}\n`;
    }

    md += `\n---\n*Documento generado por Clinical OS*\n`;

    // Write export file
    const timestamp = moment().format('YYYY-MM-DD');
    const exportPath = `${patientFolderPath}/Exportación_${timestamp}.md`;

    const existing = app.vault.getAbstractFileByPath(exportPath);
    if (existing instanceof TFile) {
        await app.vault.modify(existing, md);
        return existing;
    }
    return await app.vault.create(exportPath, md);
}
