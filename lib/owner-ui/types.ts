export type OwnerAttentionVM = {
  id: string;
  sourceCode?: string | null;
  priority: string;
  priorityLabel: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  typeLabel: string;
  title: string;
  whyNow: string;
  requiredAction: string;
  statusLabel: string;
  updatedAt?: string | null;
  dueAt?: string | null;
};

export type OwnerWorkItemVM = {
  id: string;
  code: string;
  title: string;
  purpose: string;
  status: string;
  statusLabel: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  priority: string;
  priorityLabel: string;
  ownerLabel: string;
  currentStep?: string | null;
  waitReason?: string | null;
  blockedReason?: string | null;
  updatedAt?: string | null;
};

export type OwnerSignalVM = {
  id: string;
  code: string;
  title: string;
  summary: string;
  recommendedAction: string;
  priority: string;
  priorityLabel: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  ownerLabel: string;
  statusLabel: string;
};

export type RoleStatusVM = {
  code: string;
  name: string;
  status: string;
  statusLabel: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  autonomyLabel: string;
  summary: string;
  blockedCapabilityCount: number;
  availableCapabilityCount: number;
  requiredCapabilityCount: number;
};
