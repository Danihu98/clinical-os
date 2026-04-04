import { App, TFile, TFolder, TAbstractFile, moment } from 'obsidian';
import { LIBRARY_CONTENT } from '../generated/library-content';
import { PATIENTS_SUBFOLDER } from '../constants';

export async function createSafetyPlan(
    app: App,
    rootFolder: string,
    patientName: string
): Promise<TFile | null> {
    const vault = app.vault;
    const patientPath = `${rootFolder}/${PATIENTS_SUBFOLDER}/${patientName}`;
    const folder = vault.getAbstractFileByPath(patientPath);

    if (!folder || !(folder instanceof TFolder)) return null;

    // Read professional name from the patient's ficha frontmatter
    let profesional = '';
    const fichaFile = folder.children.find(
        (f: TAbstractFile): f is TFile =>
            f instanceof TFile && f.name.includes('Ficha') && f.extension === 'md'
    );
    if (fichaFile) {
        const content = await vault.read(fichaFile);
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
            const yml = fmMatch[1];
            const profMatch = yml.match(/profesional:\s*"?([^"\n]+)"?/);
            if (profMatch) profesional = profMatch[1].trim();
        }
    }

    // Load template from library content
    const templateKey = Object.keys(LIBRARY_CONTENT).find(k =>
        k.includes('Plantilla_Plan_Seguridad')
    );

    let noteContent = templateKey ? LIBRARY_CONTENT[templateKey] : '';

    if (!noteContent) {
        noteContent = `# Plan de Seguridad\n\n**Paciente:** ${patientName}\n**Fecha:** ${moment().format('DD/MM/YYYY')}`;
    }

    noteContent = noteContent
        .replace(/\{\{NOMBRE\}\}/g, patientName)
        .replace(/\{\{FECHA\}\}/g, moment().format('DD/MM/YYYY'))
        .replace(/\{\{PROFESIONAL\}\}/g, profesional || '_______________');

    const fileName = `Plan_de_Seguridad_${patientName.replace(/[\\/:*?"<>|]/g, '')}.md`;
    const filePath = `${patientPath}/${fileName}`;

    // If the plan already exists, open the existing one
    const existing = vault.getAbstractFileByPath(filePath);
    if (existing instanceof TFile) {
        return existing;
    }

    return await vault.create(filePath, noteContent);
}
