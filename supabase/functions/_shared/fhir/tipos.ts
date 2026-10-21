/**
 * Subconjunto tipado de HL7 FHIR R4 (4.0.1) que usa CitasYA (ADR-0009).
 *
 * Solo declara los elementos que produce el mapeador o que se leen de las
 * respuestas del servidor. Los nombres, la cardinalidad y los códigos de los
 * valores con vinculación obligatoria («required») siguen la especificación:
 * https://hl7.org/fhir/R4/
 *
 * El archivo no depende de Deno ni de Node: lo importan la Edge Function
 * `fhir-sync`, las pruebas unitarias y las pruebas de interoperabilidad.
 */

// ─── Tipos de datos ─────────────────────────────────────────────────────────

export interface Coding {
  readonly system?: string;
  readonly code?: string;
  readonly display?: string;
}

export interface CodeableConcept {
  readonly coding?: readonly Coding[];
  readonly text?: string;
}

export interface Identifier {
  readonly use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  readonly system?: string;
  readonly value?: string;
}

export interface Reference {
  readonly reference?: string;
  readonly display?: string;
}

export interface Period {
  readonly start?: string;
  readonly end?: string;
}

export interface HumanName {
  readonly text?: string;
}

export interface Address {
  readonly text?: string;
  readonly city?: string;
  readonly country?: string;
}

export interface Meta {
  readonly versionId?: string;
  readonly lastUpdated?: string;
  readonly security?: readonly Coding[];
}

interface RecursoBase {
  readonly id?: string;
  readonly meta?: Meta;
}

// ─── Recursos ───────────────────────────────────────────────────────────────

export interface Organization extends RecursoBase {
  readonly resourceType: 'Organization';
  readonly identifier?: readonly Identifier[];
  readonly active?: boolean;
  readonly type?: readonly CodeableConcept[];
  readonly name?: string;
}

export interface Location extends RecursoBase {
  readonly resourceType: 'Location';
  readonly identifier?: readonly Identifier[];
  readonly status?: 'active' | 'suspended' | 'inactive';
  readonly name?: string;
  readonly mode?: 'instance' | 'kind';
  readonly address?: Address;
  readonly managingOrganization?: Reference;
}

export interface Practitioner extends RecursoBase {
  readonly resourceType: 'Practitioner';
  readonly identifier?: readonly Identifier[];
  readonly active?: boolean;
  readonly name?: readonly HumanName[];
}

export type DiaSemana = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface PractitionerRole extends RecursoBase {
  readonly resourceType: 'PractitionerRole';
  readonly active?: boolean;
  readonly practitioner?: Reference;
  readonly organization?: Reference;
  readonly specialty?: readonly CodeableConcept[];
  readonly location?: readonly Reference[];
  readonly availableTime?: readonly { readonly daysOfWeek?: readonly DiaSemana[] }[];
}

export interface Schedule extends RecursoBase {
  readonly resourceType: 'Schedule';
  readonly active?: boolean;
  readonly serviceType?: readonly CodeableConcept[];
  readonly actor: readonly Reference[];
  readonly planningHorizon?: Period;
}

/** Vinculación obligatoria: http://hl7.org/fhir/ValueSet/slotstatus */
export type EstadoSlot = 'busy' | 'free' | 'busy-unavailable' | 'busy-tentative' | 'entered-in-error';

export interface Slot extends RecursoBase {
  readonly resourceType: 'Slot';
  readonly serviceType?: readonly CodeableConcept[];
  readonly schedule: Reference;
  readonly status: EstadoSlot;
  readonly start: string;
  readonly end: string;
}

export interface Patient extends RecursoBase {
  readonly resourceType: 'Patient';
  readonly identifier?: readonly Identifier[];
  readonly active?: boolean;
}

/** Vinculación obligatoria: http://hl7.org/fhir/ValueSet/appointmentstatus */
export type EstadoAppointment =
  | 'proposed' | 'pending' | 'booked' | 'arrived' | 'fulfilled'
  | 'cancelled' | 'noshow' | 'entered-in-error' | 'checked-in' | 'waitlist';

export interface AppointmentParticipant {
  readonly actor?: Reference;
  readonly status: 'accepted' | 'declined' | 'tentative' | 'needs-action';
}

export interface Appointment extends RecursoBase {
  readonly resourceType: 'Appointment';
  readonly identifier?: readonly Identifier[];
  readonly status: EstadoAppointment;
  readonly cancelationReason?: CodeableConcept;
  readonly serviceType?: readonly CodeableConcept[];
  readonly appointmentType?: CodeableConcept;
  readonly start?: string;
  readonly end?: string;
  readonly minutesDuration?: number;
  readonly slot?: readonly Reference[];
  readonly created?: string;
  readonly participant: readonly AppointmentParticipant[];
}

export interface OperationOutcomeIssue {
  readonly severity: 'fatal' | 'error' | 'warning' | 'information';
  readonly code: string;
  readonly diagnostics?: string;
  readonly expression?: readonly string[];
}

export interface OperationOutcome extends RecursoBase {
  readonly resourceType: 'OperationOutcome';
  readonly issue: readonly OperationOutcomeIssue[];
}

export interface CapabilityStatement extends RecursoBase {
  readonly resourceType: 'CapabilityStatement';
  readonly fhirVersion?: string;
  readonly rest?: readonly {
    readonly mode?: string;
    readonly resource?: readonly {
      readonly type: string;
      readonly interaction?: readonly { readonly code: string }[];
    }[];
  }[];
}

export type RecursoClinico =
  | Organization | Location | Practitioner | PractitionerRole
  | Schedule | Slot | Patient | Appointment;

export type TipoRecurso = RecursoClinico['resourceType'];

// ─── Bundle ─────────────────────────────────────────────────────────────────

export interface BundleEntryRequest {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly url: string;
  readonly ifMatch?: string;
}

export interface BundleEntryResponse {
  readonly status: string;
  readonly location?: string;
  readonly etag?: string;
  readonly outcome?: OperationOutcome;
}

export interface BundleEntry<R = RecursoClinico> {
  readonly fullUrl?: string;
  readonly resource?: R;
  readonly request?: BundleEntryRequest;
  readonly response?: BundleEntryResponse;
}

export interface Bundle<R = RecursoClinico> extends RecursoBase {
  readonly resourceType: 'Bundle';
  readonly type: 'transaction' | 'transaction-response' | 'searchset' | 'batch' | 'batch-response';
  readonly total?: number;
  readonly entry?: readonly BundleEntry<R>[];
}
