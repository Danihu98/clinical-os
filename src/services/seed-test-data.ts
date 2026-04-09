import { App, moment } from 'obsidian';
import { ClinicalOSData, Colleague, ClinicalAlert } from '../types';
import { createPatient } from './patient';

interface TestPatient {
    name: string;
    age: string;
    gender: string;
    phone: string;
    email: string;
    fee: number;
    status: 'coordinando' | 'en proceso' | 'alta' | 'abandono';
    motivo: string;
    sessions: number;         // how many past sessions to generate
    pendingBoletas: number;   // how many of those sessions have pending boletas
}

const TEST_PATIENTS: TestPatient[] = [
    {
        name: 'Catalina Reyes', age: '28', gender: 'Femenino',
        phone: '+56 9 1234 5678', email: 'catalina.reyes@mail.com',
        fee: 45000, status: 'en proceso', motivo: 'Trastorno de ansiedad generalizada',
        sessions: 8, pendingBoletas: 2,
    },
    {
        name: 'Matías Fuentes', age: '35', gender: 'Masculino',
        phone: '+56 9 2345 6789', email: 'matias.fuentes@mail.com',
        fee: 50000, status: 'en proceso', motivo: 'Episodio depresivo moderado',
        sessions: 12, pendingBoletas: 1,
    },
    {
        name: 'Valentina Soto', age: '22', gender: 'Femenino',
        phone: '+56 9 3456 7890', email: 'valentina.soto@mail.com',
        fee: 35000, status: 'en proceso', motivo: 'Duelo patológico',
        sessions: 5, pendingBoletas: 3,
    },
    {
        name: 'Sebastián Muñoz', age: '41', gender: 'Masculino',
        phone: '+56 9 4567 8901', email: 'sebastian.munoz@mail.com',
        fee: 50000, status: 'en proceso', motivo: 'Trastorno obsesivo compulsivo',
        sessions: 15, pendingBoletas: 0,
    },
    {
        name: 'Francisca Torres', age: '19', gender: 'Femenino',
        phone: '+56 9 5678 9012', email: 'francisca.torres@mail.com',
        fee: 30000, status: 'en proceso', motivo: 'Crisis de pánico recurrente',
        sessions: 3, pendingBoletas: 1,
    },
    {
        name: 'Diego Hernández', age: '52', gender: 'Masculino',
        phone: '+56 9 6789 0123', email: 'diego.hernandez@mail.com',
        fee: 55000, status: 'en proceso', motivo: 'Burnout laboral severo',
        sessions: 10, pendingBoletas: 2,
    },
    {
        name: 'Isidora Contreras', age: '31', gender: 'Femenino',
        phone: '+56 9 7890 1234', email: 'isidora.contreras@mail.com',
        fee: 45000, status: 'alta', motivo: 'Fobia social',
        sessions: 20, pendingBoletas: 0,
    },
    {
        name: 'Tomás Araya', age: '26', gender: 'Masculino',
        phone: '+56 9 8901 2345', email: 'tomas.araya@mail.com',
        fee: 40000, status: 'en proceso', motivo: 'TEPT por accidente de tránsito',
        sessions: 7, pendingBoletas: 2,
    },
    {
        name: 'Javiera Espinoza', age: '38', gender: 'Femenino',
        phone: '+56 9 9012 3456', email: 'javiera.espinoza@mail.com',
        fee: 50000, status: 'en proceso', motivo: 'Trastorno de personalidad límite',
        sessions: 25, pendingBoletas: 1,
    },
    {
        name: 'Nicolás Vergara', age: '45', gender: 'Masculino',
        phone: '+56 9 0123 4567', email: 'nicolas.vergara@mail.com',
        fee: 45000, status: 'abandono', motivo: 'Problemas de pareja',
        sessions: 4, pendingBoletas: 2,
    },
    {
        name: 'Camila Rojas', age: '17', gender: 'Femenino',
        phone: '+56 9 1111 2222', email: 'camila.rojas@mail.com',
        fee: 35000, status: 'coordinando', motivo: 'Autolesiones no suicidas',
        sessions: 0, pendingBoletas: 0,
    },
    {
        name: 'Felipe Morales', age: '60', gender: 'Masculino',
        phone: '+56 9 3333 4444', email: 'felipe.morales@mail.com',
        fee: 50000, status: 'en proceso', motivo: 'Duelo por jubilación, insomnio',
        sessions: 6, pendingBoletas: 0,
    },
    {
        name: 'Antonia Vargas', age: '24', gender: 'Femenino',
        phone: '+56 9 5555 6666', email: 'antonia.vargas@mail.com',
        fee: 40000, status: 'en proceso', motivo: 'Trastorno alimentario (bulimia)',
        sessions: 9, pendingBoletas: 3,
    },
    {
        name: 'Martín Olivares', age: '33', gender: 'Masculino',
        phone: '+56 9 7777 8888', email: 'martin.olivares@mail.com',
        fee: 45000, status: 'en proceso', motivo: 'Adicción a sustancias (alcohol)',
        sessions: 11, pendingBoletas: 1,
    },
    {
        name: 'Constanza Peña', age: '29', gender: 'Femenino',
        phone: '+56 9 9999 0000', email: 'constanza.pena@mail.com',
        fee: 45000, status: 'en proceso', motivo: 'Ansiedad y síntomas somáticos',
        sessions: 6, pendingBoletas: 2,
    },
];

const TEST_COLLEAGUES: Colleague[] = [
    {
        id: 'test-col-1', name: 'Dra. María José López',
        specialty: 'Psiquiatría adulto', orientation: 'Biológica',
        trust: 5, referralFor: 'Medicación, episodios psicóticos, depresión severa',
        phone: '+56 9 1122 3344', email: 'mj.lopez@clinica.cl',
    },
    {
        id: 'test-col-2', name: 'Ps. Andrés Figueroa',
        specialty: 'Neuropsicología', orientation: 'Cognitiva',
        trust: 4, referralFor: 'Evaluación neurocognitiva, TDAH, deterioro cognitivo',
        phone: '+56 9 2233 4455', email: 'a.figueroa@neuro.cl',
    },
    {
        id: 'test-col-3', name: 'Ps. Carolina Bravo',
        specialty: 'Infanto-juvenil', orientation: 'Sistémica',
        trust: 5, referralFor: 'Terapia de juego, problemas conductuales en niños',
        phone: '+56 9 3344 5566', email: 'c.bravo@mail.com',
    },
    {
        id: 'test-col-4', name: 'Dr. Roberto Arancibia',
        specialty: 'Psiquiatría infantil', orientation: 'Biológica',
        trust: 3, referralFor: 'Medicación infantil, TEA, TDAH',
        phone: '+56 9 4455 6677', email: 'r.arancibia@hospital.cl',
    },
    {
        id: 'test-col-5', name: 'Ps. Macarena Díaz',
        specialty: 'Trauma', orientation: 'EMDR',
        trust: 4, referralFor: 'TEPT complejo, abuso sexual, trauma temprano',
        phone: '+56 9 5566 7788', email: 'mdiaz.emdr@mail.com',
    },
    {
        id: 'test-col-6', name: 'Ps. Ignacio Cárdenas',
        specialty: 'Adicciones', orientation: 'TCC / Entrevista motivacional',
        trust: 4, referralFor: 'Abuso de sustancias, alcoholismo, ludopatía',
        phone: '+56 9 6677 8899', email: 'i.cardenas@centro.cl',
    },
];

const TEST_ALERTS: ClinicalAlert[] = [
    {
        id: 'test-alert-1', patientName: 'Camila Rojas', type: 'alert',
        severity: 'critical', message: 'Riesgo suicida moderado — Activar plan de seguridad. Contactar padres si no asiste.',
        dateCreated: '2026-03-28', resolved: false,
    },
    {
        id: 'test-alert-2', patientName: 'Javiera Espinoza', type: 'alert',
        severity: 'warning', message: 'Ideación suicida pasiva reportada en sesión 24. Monitorear en próxima sesión.',
        dateCreated: '2026-04-02', resolved: false,
    },
    {
        id: 'test-alert-3', patientName: 'Antonia Vargas', type: 'alert',
        severity: 'warning', message: 'Pérdida de peso significativa. Coordinar con nutricionista.',
        dateCreated: '2026-03-15', resolved: false,
    },
    {
        id: 'test-alert-4', patientName: 'Martín Olivares', type: 'alert',
        severity: 'info', message: 'Derivado a Ps. Ignacio Cárdenas para intervención conjunta en adicciones.',
        dateCreated: '2026-04-01', resolved: false,
    },
    {
        id: 'test-alert-5', patientName: 'Tomás Araya', type: 'alert',
        severity: 'warning', message: 'Flashbacks frecuentes. Evaluar derivación a EMDR.',
        dateCreated: '2026-03-20', resolved: false,
    },
    {
        id: 'test-alert-6', patientName: 'Catalina Reyes', type: 'alert',
        severity: 'info', message: 'Paciente viaja al extranjero en mayo. Planificar sesiones online.',
        dateCreated: '2026-04-05', resolved: false,
    },
    {
        id: 'test-reminder-1', patientName: 'Sebastián Muñoz', type: 'reminder',
        severity: 'info', message: 'Revisar objetivos terapéuticos — lleva 15 sesiones, evaluar reformulación.',
        dateCreated: '2026-04-03', resolved: false,
    },
    {
        id: 'test-reminder-2', patientName: 'Isidora Contreras', type: 'reminder',
        severity: 'info', message: 'Preparar informe de alta para próxima sesión.',
        dateCreated: '2026-04-04', resolved: false,
    },
    {
        id: 'test-reminder-3', patientName: 'Diego Hernández', type: 'reminder',
        severity: 'info', message: 'Solicitar certificado médico de licencia laboral para adjuntar al expediente.',
        dateCreated: '2026-04-01', resolved: false,
    },
];

function generateSessionDate(sessionsAgo: number): string {
    return moment().subtract(sessionsAgo * 7, 'days').format('YYYY-MM-DD');
}

function buildFilledFicha(patient: TestPatient, id: string, fecha: string): string {
    let content = `---\ntitle: "${patient.name}"\ncreated: "${fecha}"\ntags:\nstatus: ${patient.status}\nexpediente: "${id}"\nhonorarios: ${patient.fee}\n---\n\n`;
    content += `# Ficha de identificación de Paciente\n\n`;
    content += `- **Nombre completo:** ${patient.name}\n`;
    content += `- **Edad:** ${patient.age}\n`;
    content += `- **Género:** ${patient.gender}\n`;
    content += `- **Teléfono:** ${patient.phone}\n`;
    content += `- **Correo electrónico:** ${patient.email}\n`;
    content += `- **Dirección:** Santiago, Chile\n`;
    content += `- **Fecha de registro:** ${fecha}\n`;
    content += `- **Número de expediente:** ${id}\n\n`;
    content += `---\n\n`;
    content += `# Antecedentes relevantes\n\n`;
    content += `- **Motivo de consulta:** ${patient.motivo}\n`;
    content += `- **Historial médico relevante:** Sin antecedentes médicos relevantes\n`;
    content += `- **Procesos psicoterapéuticos previos:** No refiere\n`;
    content += `- **Notas adicionales:**\n\n`;
    content += `---\n\n`;

    // Add session headers for testing the session planning feature
    for (let i = 1; i <= patient.sessions; i++) {
        const sessionDate = generateSessionDate(patient.sessions - i);
        content += `# Sesión ${i}\n`;
        content += `**Fecha:** ${sessionDate}\n\n`;
        content += `## Notas de sesión\n\n`;
        content += `Sesión de prueba #${i}.\n\n`;
    }

    return content;
}

export async function seedTestData(app: App, data: ClinicalOSData): Promise<number> {
    const rootFolder = data.settings.rootFolder;
    let created = 0;

    for (let i = 0; i < TEST_PATIENTS.length; i++) {
        const patient = TEST_PATIENTS[i];
        const patientId = data.nextPatientId + i;

        // Create patient folder and canvas via existing service
        const file = await createPatient(app, {
            name: patient.name,
            processType: 'individual',
            selectedModel: '',
            rootFolder,
            nextId: patientId,
        });

        if (!file) continue; // Patient already exists

        // Overwrite the ficha with filled-in data
        const id = String(patientId).padStart(3, '0');
        const fecha = moment().subtract((TEST_PATIENTS.length - i) * 14, 'days').format('DD/MM/YYYY');
        const filledContent = buildFilledFicha(patient, id, fecha);
        await app.vault.modify(file, filledContent);

        // Generate sessions in plugin data
        for (let s = 0; s < patient.sessions; s++) {
            const sessionDate = generateSessionDate(patient.sessions - s);
            const isPending = s >= (patient.sessions - patient.pendingBoletas);
            data.sessions.push({
                id: `test-${patientId}-${s}`,
                patientName: patient.name,
                date: sessionDate,
                fee: patient.fee,
                boletaPending: isPending,
            });
        }

        created++;
    }

    // Update next patient ID
    data.nextPatientId += TEST_PATIENTS.length;

    // Add test colleagues
    for (const colleague of TEST_COLLEAGUES) {
        if (!data.colleagues.find(c => c.id === colleague.id)) {
            data.colleagues.push({ ...colleague });
        }
    }

    // Add test alerts
    for (const alert of TEST_ALERTS) {
        if (!data.alerts.find(a => a.id === alert.id)) {
            data.alerts.push({ ...alert });
        }
    }

    return created;
}
