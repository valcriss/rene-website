import { i18n, getCurrentLocaleTag } from "../i18n";

const formatDateInternal = (value: string) => new Date(value).toLocaleDateString(getCurrentLocaleTag());

const formatDateTimeInternal = (value: string) =>
  new Date(value).toLocaleString(getCurrentLocaleTag(), { dateStyle: "medium", timeStyle: "short" });

export const formatDate = (value: string) => formatDateInternal(value);

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
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

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
