export type HealthResult = { score: number; label: string; color: 'green' | 'amber' | 'red' };

export function parseDateLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function computeHealthScore(item: {
  condition: string | null;
  status: string;
  nextServiceDate: string | null;
  warrantyExpiry: string | null;
  expectedLifespanYears: number | null;
  acquiredDate: string | null;
}): HealthResult {
  let score = 100;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (item.condition === 'sederhana') score -= 20;
  else if (item.condition === 'rosak') score -= 50;

  if (item.status === 'rosak') score -= 30;
  else if (item.status === 'dalam_servis') score -= 10;

  if (item.nextServiceDate) {
    const svc = parseDateLocal(item.nextServiceDate);
    const diffDays = Math.ceil((svc.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) score -= 25;
    else if (diffDays <= 7) score -= 10;
  }

  if (item.warrantyExpiry) {
    const exp = parseDateLocal(item.warrantyExpiry);
    if (exp < today) score -= 5;
  }

  if (item.expectedLifespanYears && item.acquiredDate) {
    const acquired = parseDateLocal(item.acquiredDate);
    const lifespanMs = item.expectedLifespanYears * 365.25 * 86400000;
    const ageMs = today.getTime() - acquired.getTime();
    const lifeFraction = ageMs / lifespanMs;
    if (lifeFraction >= 1) score -= 20;
    else if (lifeFraction >= 0.8) score -= 10;
  }

  const clamped = Math.max(0, Math.min(100, score));
  const color = clamped >= 70 ? 'green' : clamped >= 40 ? 'amber' : 'red';
  const label = clamped >= 70 ? 'Baik' : clamped >= 40 ? 'Sederhana' : 'Lemah';
  return { score: clamped, label, color };
}
