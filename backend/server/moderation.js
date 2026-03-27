const banned = ['sex', 'xxx', 'nude', 'porn'];
export function moderateText(text) {
  const lower = text.toLowerCase();
  const found = banned.find(w => lower.includes(w));
  return { clean: !found, reason: found || null };
}
