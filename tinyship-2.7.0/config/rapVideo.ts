/** Public product settings. Provider credentials remain server-only. */
export const RAP_VIDEO_TEMPLATE = 'rap-duo-v1' as const;
export const RAP_VIDEO_DURATION = 12;
export const RAP_VIDEO_RESOLUTION = '768p竖(768*1376)' as const;
export const RAP_VIDEO_WORKFLOW_ID = 'minimax_h3_803' as const;
export const RAP_VIDEO_MODE = '高质模式' as const;
export const RAP_VIDEO_MAX_TOPIC_LENGTH = 240;

export const RAP_VIDEO_SCENES = [
  { id: 'hotel-lobby', name: 'Hotel Lobby', description: 'Warm lighting, a lounge booth, and a hanging microphone.', image: '/images/rap/scenes/hotel-lobby.jpg' },
  { id: 'luxury-lobby', name: 'Luxury Lobby', description: 'Marble floors, golden lights, and a polished entrance.', image: '/images/rap/scenes/luxury-lobby.jpg' },
  { id: 'studio-booth', name: 'Studio Booth', description: 'A recording booth, studio microphones, and purple accent lights.', image: '/images/rap/scenes/studio-booth.jpg' },
  { id: 'street-cypher', name: 'Street Cypher', description: 'An urban corner at dusk with a relaxed cypher atmosphere.', image: '/images/rap/scenes/street-cypher.jpg' },
] as const;

export type RapVideoSceneId = (typeof RAP_VIDEO_SCENES)[number]['id'];
