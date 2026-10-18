// Czech lives at the root; the other landing languages under their own path.
export function match(param: string) {
  return param === 'sk' || param === 'en';
}
