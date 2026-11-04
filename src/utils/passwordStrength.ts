type StrengthLevel = "weak" | "medium" | "strong";

export function calculateStrength(password: string): { level: StrengthLevel; percentage: number } {
  const checks = [
    password.length >= 8,
    password.length >= 12,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const level = score < 3 ? "weak" : score < 5 ? "medium" : "strong";
  return { level, percentage: (score / checks.length) * 100 };
}
