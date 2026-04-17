const mediaMap: Record<string, number> = {
  'dumbbell_kneeling_single_arm_row.mp4': require('../../assets/media/back/dumbbell_kneeling_single_arm_row.mp4'),
  'dumbbell_laying_incline_row.mp4': require('../../assets/media/back/dumbbell_laying_incline_row.mp4'),
  'dumbbell_curl.mp4': require('../../assets/media/biceps/dumbbell_curl.mp4'),
  'dumbbell_single_arm_preacher_curl.mp4': require('../../assets/media/biceps/dumbbell_single_arm_preacher_curl.mp4'),
  'dumbbell_bench_press.mp4': require('../../assets/media/chest/dumbbell_bench_press.mp4'),
  'dumbbell_chest_fly.mp4': require('../../assets/media/chest/dumbbell_chest_fly.mp4'),
  'dumbbell_incline_bench_press.mp4': require('../../assets/media/chest/dumbbell_incline_bench_press.mp4'),
  'dumbbell_incline_chest_flys.mp4': require('../../assets/media/chest/dumbbell_incline_chest_flys.mp4'),
  'dumbbell_front_raise.mp4': require('../../assets/media/shoulder/dumbbell_front_raise.mp4'),
  'dumbbell_lateral_raise.mp4': require('../../assets/media/shoulder/dumbbell_lateral_raise.mp4'),
  'dumbbell_overhead_tricep_extension.mp4': require('../../assets/media/triceps/dumbbell_overhead_tricep_extension.mp4'),
  'dumbbell_skullcrusher.mp4': require('../../assets/media/triceps/dumbbell_skullcrusher.mp4'),
};

export function resolveMedia(filename: string | null): number | null {
  if (!filename) {
    return null;
  }
  return mediaMap[filename] ?? null;
}
