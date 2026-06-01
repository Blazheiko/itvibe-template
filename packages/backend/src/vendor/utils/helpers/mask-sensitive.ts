function repeatMask(length: number): string {
  return "*".repeat(Math.max(3, length));
}

export function maskPhoneForLogs(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits === "") {
    return "[redacted-phone]";
  }

  if (digits.length <= 4) {
    return `${trimmed.startsWith("+") ? "+" : ""}${repeatMask(digits.length)}`;
  }

  const keepPrefixLength = trimmed.startsWith("+")
    ? Math.min(2, digits.length - 2)
    : 0;
  const prefix = `${trimmed.startsWith("+") ? "+" : ""}${digits.slice(0, keepPrefixLength)}`;
  const suffix = digits.slice(-2);
  const hiddenLength = digits.length - keepPrefixLength - suffix.length;

  return `${prefix}${repeatMask(hiddenLength)}${suffix}`;
}

export function maskEmailForLogs(email: string): string {
  const normalized = email.trim().toLowerCase();
  const [localPart, domainPart] = normalized.split("@");

  if (
    localPart === undefined ||
    domainPart === undefined ||
    localPart === "" ||
    domainPart === ""
  ) {
    return "[redacted-email]";
  }

  const domainLabels = domainPart.split(".");
  const primaryDomain = domainLabels[0] ?? "";
  const tldSuffix =
    domainLabels.length > 1 ? `.${domainLabels.slice(1).join(".")}` : "";

  const maskedLocal =
    localPart.length <= 2
      ? `${localPart[0] ?? "*"}${repeatMask(localPart.length)}`
      : `${localPart[0]}${repeatMask(localPart.length - 2)}${localPart.at(-1) ?? ""}`;

  const maskedDomain =
    primaryDomain.length <= 2
      ? `${primaryDomain[0] ?? "*"}${repeatMask(primaryDomain.length)}`
      : `${primaryDomain[0]}${repeatMask(primaryDomain.length - 2)}${primaryDomain.at(-1) ?? ""}`;

  return `${maskedLocal}@${maskedDomain}${tldSuffix}`;
}
