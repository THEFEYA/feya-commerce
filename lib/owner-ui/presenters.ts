import {
  attentionTypeLabel,
  ownerToneForPriority,
  ownerToneForStatus,
  priorityLabel,
  roleLabel,
  signalCopy,
  statusLabel,
} from './terminology';
import type { OwnerAttentionVM, OwnerSignalVM, OwnerWorkItemVM, RoleStatusVM } from './types';

type Row = Record<string, unknown>;

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function number(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function presentOwnerAttention(row: Row): OwnerAttentionVM {
  const sourceCode = text(row.source_code) || null;
  const copy = signalCopy(sourceCode, {
    title: row.title,
    summary: row.summary,
    action: row.required_action,
  });

  return {
    id: text(row.attention_id),
    sourceCode,
    priority: text(row.priority, 'P2'),
    priorityLabel: priorityLabel(row.priority),
    tone: ownerToneForPriority(row.priority),
    typeLabel: attentionTypeLabel(row.attention_type),
    title: copy.title,
    whyNow: copy.summary,
    requiredAction: copy.action,
    statusLabel: statusLabel(row.attention_status),
    updatedAt: text(row.updated_at) || null,
    dueAt: text(row.due_at || row.expires_at) || null,
  };
}

export function presentSignal(row: Row): OwnerSignalVM {
  const code = text(row.signal_code);
  const copy = signalCopy(code, {
    title: row.title,
    summary: row.summary,
    action: row.next_action,
  });

  return {
    id: text(row.signal_fingerprint, code),
    code,
    title: copy.title,
    summary: copy.summary,
    recommendedAction: copy.action,
    priority: text(row.priority, 'P3'),
    priorityLabel: priorityLabel(row.priority),
    tone: ownerToneForPriority(row.priority),
    ownerLabel: roleLabel(row.accountable_domain),
    statusLabel: statusLabel(row.signal_state),
  };
}

export function presentWorkItem(row: Row): OwnerWorkItemVM {
  const status = text(row.workflow_status) || text(row.case_status, 'OPEN');
  return {
    id: text(row.case_id),
    code: text(row.case_code),
    title: text(row.title, 'Работа FEYA'),
    purpose: text(row.business_question, 'Проверить ситуацию и определить следующий шаг.'),
    status,
    statusLabel: statusLabel(status),
    tone: ownerToneForStatus(status),
    priority: text(row.priority, 'P3'),
    priorityLabel: priorityLabel(row.priority),
    ownerLabel: roleLabel(row.current_accountable_domain),
    currentStep: text(row.current_step_code) || null,
    waitReason: text(row.wait_reason) || null,
    blockedReason: text(row.blocked_reason) || null,
    updatedAt: text(row.workflow_updated_at || row.updated_at) || null,
  };
}

export function presentRole(row: Row): RoleStatusVM {
  const status = text(row.runtime_status, 'INACTIVE');
  const autonomy = text(row.autonomy_ceiling);
  const autonomyLabel =
    autonomy === 'OBSERVE_ONLY'
      ? 'Только наблюдение'
      : autonomy === 'PROPOSE_ONLY'
        ? 'Может предлагать'
        : autonomy === 'SHADOW_ACTIONS'
          ? 'Работает в безопасном режиме'
          : autonomy === 'CONTROLLED_ACTIONS'
            ? 'Может выполнять разрешённые действия'
            : statusLabel(autonomy);

  return {
    code: text(row.role_code),
    name: roleLabel(row.role_code),
    status,
    statusLabel: statusLabel(status),
    tone: ownerToneForStatus(status),
    autonomyLabel,
    blockedCapabilityCount: number(row.blocked_capability_count),
    availableCapabilityCount: number(row.fully_available_capability_count),
    requiredCapabilityCount: number(row.required_capability_count),
  };
}

export function formatRelativeTime(value: unknown) {
  if (!value) return 'время не указано';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'время не указано';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 2) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  return `${days} дн назад`;
}
