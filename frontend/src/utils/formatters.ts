import { i18n, getCurrentLocaleTag } from "../i18n";

// Event dates are stored as UTC calendar-day boundaries (00:00:00.000Z / 23:59:59.999Z), not real
// point-in-time timestamps, so they must be displayed as their UTC calendar date. Formatting them in
// the viewer's local timezone can roll the 23:59:59.999Z end boundary into the next local day.
const formatDateInternal = (value: string) =>
  new Date(value).toLocaleDateString(getCurrentLocaleTag(), { timeZone: "UTC" });

const formatDateTimeInternal = (value: string) =>
  new Date(value).toLocaleString(getCurrentLocaleTag(), { dateStyle: "medium", timeStyle: "short" });

export const formatDate = (value?: string | null) =>
  value ? formatDateInternal(value) : i18n.global.t("common.notProvided");

export const formatUpdatedAtLabel = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return i18n.global.t("common.updatedAt", { date: formatDateInternal(value) });
};

export const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${formatDateInternal(start)}${i18n.global.t("dates.rangeSeparator")}${formatDateInternal(end)}`;
  }

  const sameDay =
    startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
    startDate.getUTCMonth() === endDate.getUTCMonth() &&
    startDate.getUTCDate() === endDate.getUTCDate();

  if (sameDay) {
    return formatDateInternal(start);
  }

  return `${formatDateInternal(start)}${i18n.global.t("dates.rangeSeparator")}${formatDateInternal(end)}`;
};

export const formatDateTime = (value: string) => formatDateTimeInternal(value);

export const formatDateTimeRange = (start: string, end: string) => formatDateRange(start, end);

export const formatOptional = (value?: string | null) => {
  if (!value || value.trim().length === 0) {
    return i18n.global.t("common.notProvided");
  }

  return value;
};

const groupDigits = (digits: string) => digits.match(/.{1,2}/g)?.join(" ") ?? digits;

export const formatPhoneNumber = (value?: string | null) => {
  if (!value || value.trim().length === 0) {
    return i18n.global.t("common.notProvided");
  }

  const trimmed = value.trim();
  const digits = trimmed.replace(/[\s.-]/g, "");

  if (/^0\d{9}$/.test(digits)) {
    return groupDigits(digits);
  }

  if (/^\+33\d{9}$/.test(digits)) {
    const rest = digits.slice(3);
    return `+33 ${rest[0]} ${groupDigits(rest.slice(1))}`;
  }

  return trimmed;
};
