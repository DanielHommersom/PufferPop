/** Game canvas dimensions (9:16 portrait) */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 854;

/** Puffer fish base size */
export const FISH_BASE_RADIUS = 18;
/** Maximum inflate increment on top of base radius */
export const FISH_MAX_INFLATE = 14;

/** How fast the fish inflates per frame */
export const INFLATE_SPEED = 0.35;
/** How fast the fish deflates per frame */
export const DEFLATE_SPEED = 0.28;

/** Downward gravity per frame */
export const GRAVITY = 0.16;
/** Maximum upward velocity (negative = up) */
export const MAX_VEL_UP = -5;
/** Maximum downward velocity */
export const MAX_VEL_DOWN = 4;

// ── Progressive difficulty ────────────────────────────────────────────────────

/** Starting gap between the coral columns (wide – easy). */
export const GAP_SIZE_INITIAL = 230;
/** Minimum gap reached at full difficulty. */
export const GAP_SIZE_MIN = 130;

/** Starting obstacle speed (slow – easy). */
export const OBSTACLE_SPEED_INITIAL = 1.4;
/** Maximum obstacle speed reached at full difficulty. */
export const OBSTACLE_SPEED_MAX = 3.2;

/** Starting spawn interval in ms (more breathing room). */
export const SPAWN_INTERVAL_INITIAL = 2400;
/** Minimum spawn interval in ms at full difficulty. */
export const SPAWN_INTERVAL_MIN = 1300;

/** Score at which full difficulty is reached (linear ramp). */
export const DIFFICULTY_RAMP_SCORE = 30;

/** @deprecated Use GAP_SIZE_MIN – kept only for backwards compat. */
export const GAP_SIZE = GAP_SIZE_MIN;
/** @deprecated Use OBSTACLE_SPEED_INITIAL – kept only for backwards compat. */
export const OBSTACLE_SPEED = OBSTACLE_SPEED_INITIAL;
/** @deprecated Use SPAWN_INTERVAL_INITIAL – kept only for backwards compat. */
export const SPAWN_INTERVAL = SPAWN_INTERVAL_INITIAL;

/** Inflate level thresholds for colour changes */
export const INFLATE_THRESHOLD_WARNING = FISH_MAX_INFLATE * 0.5;
export const INFLATE_THRESHOLD_DANGER = FISH_MAX_INFLATE * 0.8;

/** Body colours based on inflate state */
export const INFLATE_COLORS: { safe: number; warning: number; danger: number } = {
    safe: 0xf4a832,
    warning: 0xf07820,
    danger: 0xe83820,
};

/** Coral colours */
export const CORAL_BASE_COLOR = 0x1e7a3c;
export const CORAL_HIGHLIGHT_COLOR = 0x28a050;
export const CORAL_SPINE_COLOR = 0x8b2020;
