import { defineParams } from '@sveltejs/kit/params';

// Czech lives at the root; the other landing languages under their own path.
function matchLanding(param: string) {
  return param === 'sk' || param === 'en';
}

export const params = defineParams({
  landing: (param) => (matchLanding(param) ? param : undefined),
});
