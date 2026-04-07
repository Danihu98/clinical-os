export type ProcessType =
    | 'individual'
    | 'child'
    | 'couple'
    | 'family'
    | 'group'
    | 'supervision';

export const PROCESS_TYPE_LABELS: Record<ProcessType, string> = {
    individual: 'Psicoterapia individual (adulto)',
    child: 'Psicoterapia individual (infanto-juvenil)',
    couple: 'Terapia de pareja',
    family: 'Terapia familiar',
    group: 'Terapia grupal',
    supervision: 'Supervisión clínica',
};

export interface ClinicalOSSettings {
    rootFolder: string;
    defaultModel: string;
    defaultFee: number;
}

export const DEFAULT_SETTINGS: ClinicalOSSettings = {
    rootFolder: 'Espacio Clínico',
    defaultModel: '',
    defaultFee: 0,
};

export interface Session {
    id: string;
    patientName: string;
    date: string;       // YYYY-MM-DD
    fee: number;
    boletaPending: boolean;
}

export interface Colleague {
    id: string;
    name: string;
    specialty: string;
    orientation: string;
    trust: number;           // 1-5
    referralFor: string;
    phone: string;
    email: string;
}

export interface ClinicalAlert {
    id: string;
    patientName: string;
    type: 'alert' | 'reminder';
    severity: 'critical' | 'warning' | 'info';  // only used when type === 'alert'
    message: string;
    dateCreated: string;   // YYYY-MM-DD
    resolved: boolean;
}

export interface ClinicalOSData {
    nextPatientId: number;
    settings: ClinicalOSSettings;
    sessions: Session[];
    colleagues: Colleague[];
    alerts: ClinicalAlert[];
}

export const DEFAULT_DATA: ClinicalOSData = {
    nextPatientId: 1,
    settings: { ...DEFAULT_SETTINGS },
    sessions: [],
    colleagues: [],
    alerts: [],
};
