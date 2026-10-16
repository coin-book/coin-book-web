import type { components } from './api-types';

type Schemas = components['schemas'];

export type Amount = Schemas['Amount'];
export type Account = Schemas['Account'];
export type Transaction = Schemas['Transaction'];
export type Category = Schemas['Category'];
export type BudgetGroup = Schemas['BudgetGroup'];
export type Rule = Schemas['Rule'];
export type BudgetMonth = Schemas['BudgetMonth'];
export type BudgetLine = Schemas['BudgetLine'];
export type MonthlyReport = Schemas['MonthlyReport'];
export type ImportResult = Schemas['ImportResult'];
export type ImportBatch = Schemas['ImportBatch'];
export type AgentToken = Schemas['AgentToken'];
export type AuditEntry = Schemas['AuditEntry'];
export type AmbiguousTransfer = Schemas['AmbiguousTransfer'];
export type Triage = Schemas['TriageOutputBody'];
export type Problem = Schemas['Problem'];
