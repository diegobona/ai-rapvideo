/** Public product settings. Provider credentials remain server-only. */
export const RAP_VIDEO_TEMPLATE = 'rap-duo-v1' as const;
export const RAP_VIDEO_DURATION = 12;
export const RAP_VIDEO_RESOLUTION = '768p竖(768*1376)' as const;
export const RAP_VIDEO_WORKFLOW_ID = 'minimax_h3_803' as const;
export const RAP_VIDEO_MODE = '高质模式' as const;
export const RAP_VIDEO_MAX_TOPIC_LENGTH = 240;

export const RAP_VIDEO_SCENES = [
  { id: 'hotel-lobby', name: 'Orange Studio', description: 'A seamless orange studio backdrop and one hanging microphone.', image: '/images/examples/rap-orange-studio.jpg', referenceImage: '/images/rap/scenes/references/hotel-lobby.jpg' },
  { id: 'luxury-lobby', name: 'Luxury Lobby', description: 'Marble floors, golden lights, and one hanging microphone.', image: '/images/rap/scenes/luxury-lobby.jpg', referenceImage: '/images/rap/scenes/references/luxury-lobby.jpg' },
  { id: 'studio-booth', name: 'Studio Booth', description: 'A recording booth, one hanging microphone, and purple accent lights.', image: '/images/rap/scenes/studio-booth.jpg', referenceImage: '/images/rap/scenes/references/studio-booth.jpg' },
  { id: 'street-cypher', name: 'Street Cypher', description: 'An urban corner at dusk with one hanging microphone.', image: '/images/rap/scenes/street-cypher.jpg', referenceImage: '/images/rap/scenes/references/street-cypher.jpg' },
] as const;

export type RapVideoSceneId = (typeof RAP_VIDEO_SCENES)[number]['id'];
