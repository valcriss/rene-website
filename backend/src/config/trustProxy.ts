const maximumTrustedProxyHops = 3;

export const getTrustedProxyHops = (value = process.env.TRUST_PROXY_HOPS): number => {
  if (!value?.trim()) return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > maximumTrustedProxyHops) return 0;
  return parsed;
};
