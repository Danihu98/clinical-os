# Clinical OS

A local-first clinical operating system for psychologists, built as an [Obsidian](https://obsidian.md) plugin.

Manage patients, build visual case formulations, track sessions and fees, and keep a full clinical history -- all 100% offline and private.

## Features

### Patient Management

- **One-click patient creation** -- generates a standardized folder structure with a unique case ID (e.g., `001`, `015`), a clinical file (Ficha), and a visual formulation board (Canvas).
- **Fuzzy search** -- find any patient instantly with `Clinical: Buscar Paciente`.
- **Patient registry** -- auto-generated table of all patients with IDs, fees, and status.

### Visual Case Formulation

- **Multi-model support** -- choose from built-in theoretical models (Tolin, ACT, Basic CBT) or create your own Canvas templates.
- **Clinical snapshots** -- save timestamped copies of your formulation board to track how your understanding of the case evolves over time.
- **Snapshot history** -- browse and open past snapshots with `Clinical: Ver Historial del Paciente`.

### Session & Fee Tracking

- **Session registration** -- log each session with patient, date, and fee. Auto-fills fees from the patient's file or your default fee setting.
- **Invoice tracking (Boletas)** -- see all pending invoices at a glance and mark them as emitted one by one.
- **Monthly summary** -- generate a detailed report with session tables, per-patient breakdowns, totals, and a pending invoices checklist.

### Clinical Tools

- **Safety plan** -- create a structured safety plan for any patient from a customizable template.
- **Patient record export** -- export a patient's full clinical file plus session history into a single document.
- **Knowledge base** -- the plugin seeds your vault with clinical concepts (cognitive restructuring, functional analysis, automatic thoughts, etc.) ready to be linked in your notes.

## Installation

### From Obsidian Community Plugins

1. Open **Settings > Community Plugins > Browse**.
2. Search for **Clinical OS**.
3. Click **Install**, then **Enable**.

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Danihu98/clinical-os/releases).
2. Create a folder called `clinical-os` inside your vault's `.obsidian/plugins/` directory.
3. Place the downloaded files in that folder.
4. Restart Obsidian and enable the plugin in **Settings > Community Plugins**.

## Usage

All commands are available via the Command Palette (`Ctrl/Cmd + P`):

| Command | Description |
| --- | --- |
| `Clinical: Nuevo Paciente` | Create a new patient with case ID and formulation board |
| `Clinical: Buscar Paciente` | Fuzzy search across all patients |
| `Clinical: Registrar Sesion` | Log a session with date and fee |
| `Clinical: Boletas Pendientes` | View and manage pending invoices |
| `Clinical: Resumen Mensual` | Generate a monthly summary report |
| `Clinical: Exportar Expediente` | Export a patient's full record |
| `Clinical: Ver Historial del Paciente` | Browse formulation snapshots |
| `Clinical: Plan de Seguridad` | Create a safety plan for a patient |
| `Clinical: Actualizar Registro de Pacientes` | Refresh the patient registry table |

You can also use the **ribbon icons** on the left sidebar for quick access to session registration and clinical snapshots.

## Settings

| Setting | Description |
| --- | --- |
| **Root folder** | Name of the main folder for all clinical content (default: `Espacio Clinico`) |
| **Default fee** | Pre-filled fee amount when registering sessions |
| **Default clinical model** | Theoretical model pre-selected when creating new patients |

## Privacy

This plugin works **entirely offline**. No patient data ever leaves your computer. There are no cloud connections, no external APIs, no telemetry. You own your data.

## Contributing

Have a better definition for a clinical concept? A Canvas template for a different therapeutic model?

1. Open the note you want to propose in Obsidian.
2. Run `Clinical: Proponer mejora` -- your note content is copied to the clipboard.
3. Submit it as an issue or pull request on GitHub.

Approved contributions ship in the next update for all users.

## License

[MIT](LICENSE)
