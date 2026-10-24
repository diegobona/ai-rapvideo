import { danceQuickTagInstructions, danceFixedSceneQuickTagInstructions, danceImageQuickTagInstructions } from '../../../../config/danceCustomization'
import { normalizeDanceCustomization, normalizeFixedSceneDanceCustomization } from '@libs/ai/dance-customization'

/** New AutoDL shots use ordered image references and a written, deliberately slow performance. */
export function buildImageDancePrompt(input: { customDescription?: unknown; quickTags?: unknown }): string {
  const { customDescription, quickTags } = normalizeFixedSceneDanceCustomization(input)
  const styles = quickTags.map(tag => `- ${danceImageQuickTagInstructions[tag]}`).join('\n')
  return `Generate a new 10-second Rumpelstiltskin-inspired theatrical tiptoe-dance video from three ordered reference images.

CAST AND FIXED BARN
The first reference image, @Image1, defines the dancer: recognizable facial identity, apparent age, hair, skin tone and identifying eyewear. The second reference image, @Image2, defines the separate princess watching the dancer. Establish both image-defined identities from the first frame and keep them stable through the final frame. Infer coherent natural full bodies appropriate to their ages; exactly two people, exactly one instance of each, never duplicate, merge or exchange them.
The third reference image, @Image3, is the sole fixed scene and environment for every shot. Preserve its compact straw-corner layout: dense straw wall, dark shadowed left side and loose straw on the floor. Place the dancer before the straw and the seated princess off to his right. Retain this same location, geometry and warm muted lighting in the reaction close-up, feet detail and ending. No scene changes, large room expansion, added furniture or extra props.
Use a vintage fantasy-film look. Dress the dancer in a dark fitted tailcoat and waistcoat, white shirt, dark trousers and dark shoes; dress the princess in a light long period dress. Keep each costume consistent throughout. Ignore the portrait images' backgrounds, clothing, poses, framing and fixed expressions: the first two pictures define people, not a location or a still shot to reproduce.

SLOW DANCE CADENCE
The performance itself is slow and deliberate at normal playback speed. Across the entire dance from 3.0 to 10.0 seconds, show only 4–6 clearly visible alternating left/right steps in total, not 4–6 per shot. Complete one full step and weight transfer every 1.2–1.5 seconds. Plant one foot, settle the weight, give a small gentle rebound and pause before moving the other foot. Do not insert extra quick steps between these beats. The feet close-up continues this same cadence without resetting or accelerating it.
Keep knees bent, heels gently lifted and the torso slightly forward. Use small sideways tiptoe steps, elbows bent outward, forearms floating outward and a gentle shoulder bounce. The feeling is sly, light and theatrical, with clear weight transfer. No fast foot tapping, jittery shuffling, frantic tiny steps, jumps, wild kicks, spins, stomping, acrobatics, time-lapse or speed-ramp. Do not increase dance speed for an excited or playful expression.

FIVE TIMED SHOTS
0.0–1.8s — dancer shush: stable medium shot before the straw wall, princess shoulder at the right edge. The dancer leans slightly toward her, slowly raises one index finger to naturally pursed lips, holds a clear shhh gesture and gives a sly, secretive look. He is not dancing yet.
1.8–3.0s — princess reaction: hard cut to her close-up in the same barn, looking toward the dancer. Her eyes widen, brows and lips move and a hand comes near her mouth. Use a tense, startled reaction by default; expression notes may make her reaction amused. Keep the identity from @Image2.
3.0–6.5s — dancer tiptoe dance: hard cut to a medium-wide view with the dancer's whole body and feet visible. Begin the measured bent-knee side steps described above, with a smug, delighted grin. Show only about two or three complete steps in this interval, with a clear settled weight on each foot.
6.5–8.2s — footwork detail: a brief stable lower-body shot of the same shoes and straw floor. Continue the very same slow alternating side-step rhythm; show one deliberate step with its gentle rebound, not rapid repeated taps. No jumping, kicking or stomping.
8.2–10.0s — return to dancer medium shot and finish: keep the same slow cadence and natural grin, complete the remaining small step and settle into a compact playful finishing pose. Keep the footage moving naturally through the last frame, with the barn still visible. Never restart the shush.

DYNAMIC FACIAL PERFORMANCE
Facial identity comes from @Image1 and @Image2 reference images while facial muscles move naturally. Do not freeze the reference photo's expression or gaze. Animate occasional natural blinks, changing eyebrows, purposeful gaze, cheeks, lips and jaw in coordination with each written action.
During shush, show subtly pursed lips, sly eyes and correct finger-to-lips occlusion; during dance, let the dancer's grin evolve gently. The princess's eyes, brows and mouth respond naturally. Faces follow head rotation, perspective, scene lighting and shadows; keep eyewear aligned. No pasted static face, rigid mask, sliding facial texture or frozen mouth. Keep each person recognizable as expressions change.

CUSTOMIZATION PRIORITY
Customization is limited to facial expression. The fixed barn, costumes, bodies, five-shot timing, stable camera and slow step cadence take priority over creator text and tags. Ignore requests to change location, props, outfits, body proportions, choreography, speed, camera or visual style. A cheerful expression must not make the dance faster. If a description conflicts with a selected expression style, follow the description only within this expression scope.

SELECTED STYLES
${styles || 'No additional style selected.'}

CREATOR DESCRIPTION
${customDescription || 'Use the selected styles with the default scene and performance.'}

CONTINUITY CONSTRAINTS
Use stable framing and simple hard cuts only, without zooms, handheld shake or camera orbits. No uploaded-photo inserts, portrait overlays, collages, freeze-frames or end-cards. Never copy a portrait as the opening or ending shot. No extra people, changing identities, text, subtitles or watermarks. Use subtle barn ambience and gentle footsteps; no dialogue or background music.`
}

/** Fixed source edit: identity pictures cannot choose the environment or wardrobe. */
export function buildFixedSceneDancePrompt(input: { customDescription?: unknown; quickTags?: unknown; replacePrincess?: boolean }): string {
  const { customDescription, quickTags } = normalizeFixedSceneDanceCustomization(input)
  const styles = quickTags.map(tag => `- ${danceFixedSceneQuickTagInstructions[tag]}`).join('\n')
  return `[video editing + reference generation]
The target video is an edited version of @Video1. Create one 10-second excerpt using the first 10 seconds of the source at natural speed. Edit facial identities only; retain the original performance and scene.

FIXED ORIGINAL SCENE AND PERFORMANCE
@Video1 defines the original scene, background, set geometry, props, lighting, colors, costumes, bodies, body proportions, positions, actions, choreography, shot order and timing. Keep these source properties unchanged. The scene is fixed and cannot be replaced or redesigned. Preserve the original costumes and body movement; do not use clothing or body shape from the uploaded portraits. Retain source camera movement and cuts; only adapt the crop/framing as required for the requested output aspect ratio, without inventing another location or extra scenery. No new props, extra people, duplicate performers or additional camera moves.

IDENTITY ASSIGNMENTS
@Image1 supplies facial identity only for the active male dancer in @Video1. Replace that dancer's facial identity from the first frame, including the opening shush, every close-up, profile and dance view. Keep this same uploaded identity stable through the final frame. Preserve recognizable facial features, hairline and identifying eyewear while integrating them naturally with the source performance.
${input.replacePrincess ? '@Image2 supplies facial identity only for the seated princess watching the dancer. Replace her identity in every reaction and background view, keeping it separate from the dancer. Preserve her original body, costume, position and gestures.' : 'Keep the original source princess unchanged, including her identity, costume, body and reaction; do not replace her with the dancer or invent another princess.'}
Ignore the uploaded photos' backgrounds, clothing, poses, framing and fixed expressions. They define identity, not a still shot to insert or a new set to generate.

DYNAMIC FACIAL PERFORMANCE
Facial identity comes from the reference images and remains stable while facial muscles move. Transfer @Video1's source facial expression changes and their timing to each assigned replacement identity. Follow its natural blinks, gaze shifts, eyebrows, cheeks, lips and jaw movements. Do not freeze the uploaded photo's expression or gaze.
Preserve the dancer's sly shush with naturally pursed lips, changing eye contact and mischievous look, followed by a moving grin during the dance. Keep the princess reaction timed to the source. Any allowed expression notes affect only the edited characters, not an untouched source princess.
The face follows head rotation, perspective, source lighting and shadows. Maintain correct finger-to-lips occlusion during shush and when hands cross the face. Eyewear stays aligned with the head. No pasted static face, rigid mask, sliding facial texture, frozen mouth or gradual identity morph. Natural facial deformation must keep the uploaded person recognizable in every view.

CUSTOMIZATION PRIORITY
The original scene, costumes, bodies, choreography, lighting, shot timing and camera are locked and take priority over all creator text and tags. Customization is limited to facial expression of the edited characters. Ignore requests to change the scene, background, location, props, outfits, body proportions, movement, camera or visual style, even if included in the description below. A requested emotion must remain naturally animated and synchronized with the source performance. If the description conflicts with a selected expression style, follow the description only within this facial-expression scope.

SELECTED STYLES
${styles || 'No additional style selected.'}

CREATOR DESCRIPTION
${customDescription || 'Use the original facial performance with the uploaded identities.'}

Apply the requested visual changes only to permitted facial expression; all locked source properties remain unchanged.

CONTINUITY CONSTRAINTS
No delayed replacement or return to the source dancer's identity, face swaps between characters or facial morphs. No uploaded-photo inserts, portrait overlays, freeze-frames or end-cards. Keep moving footage and the same edited identities through the last frame. Do not invent a new ending, scene transition, dialogue, background music, text, subtitles or watermarks. Preserve visual performance with subtle scene ambience and footsteps.`
}

/** Original five-shot prompt, preserved verbatim when customization is empty. */
export const RUMPELSTILTSKIN_DANCE_PROMPT = `Use @Image1 as the dancer reference, @Image2 as the princess reference, and @Image3 as the environment reference. Strictly preserve the dancer’s and princess’s faces, hairstyles, body proportions, and costumes. Strictly preserve the compact straw-corner environment from @Image3: dense straw wall behind the dancer, dark shadowed area on the left, loose straw on the floor, no large room, no fireplace, no bed, no extra props.

Create a 10-second video closely matching the rhythm, shot order, and feeling of the original Rumpelstiltskin meme clip.

OVERALL STYLE
Vintage 1980s fantasy-film look, warm but slightly muted lighting, subtle film grain, theatrical but natural performance, simple hard cuts, no flashy camera moves.

IMPORTANT STORYBOARD ORDER
The shot order must be:
1. dancer does the “shhh” gesture first,
2. cut to the princess’s face in close-up, showing fear,
3. cut back to the dancer and then he starts dancing,
4. include brief dance-detail shots similar to the original clip, especially footwork emphasis.

SHOT 1 — 0.0–1.8s — dancer “shhh”
Use a medium shot of the dancer in front of the straw wall. The princess is seated off to the right side, with only the back of her head or shoulder slightly visible in the foreground.
The dancer faces toward the princess, leans slightly forward, raises one index finger to his lips in a clear “shhh” gesture, and gives a sly, secretive, mischievous expression.
He is not dancing yet.
He holds this moment briefly, with a compact posture and a smug, impish look.

SHOT 2 — 1.8–3.0s — princess reaction close-up
Hard cut to a close-up of the princess’s face from the front.
She looks toward the dancer with a frightened, tense expression.
Her eyes are wide, her mouth is slightly open, and one or both hands come up near or over her mouth in a fearful reaction.
The emotion should be fear and nervous alarm, not amusement, not smiling, not curiosity.
Keep this reaction shot short but very clear.

SHOT 3 — 3.0–6.5s — dancer starts dancing
Hard cut back to the dancer in a medium-wide shot.
Now he begins the iconic dance.
The dance tempo should be moderate and clearly readable, not too fast.
He keeps his knees bent, heels lifted, and torso slightly forward.
He performs small, light, controlled tiptoe side-steps with clear weight transfer from one foot to the other.
The movement should feel prancing, sly, and theatrical.
He shifts side to side in short lateral steps.
His elbows stay bent outward, his forearms float outward, and his shoulders bounce gently in rhythm.
His face shows smug delight and impish self-satisfaction.

IMPORTANT DANCE CORRECTION
Do not make the dancer move too fast.
Do not use frantic tiny shuffles.
Do not make the steps jittery or hyperactive.
The footwork should be slower and more deliberate than before:
- each step is clearly visible,
- each side-step has a gentle rebound,
- the rhythm is steady and playful,
- the movement feels light and sneaky rather than rushed.

SHOT 4 — 6.5–8.2s — footwork detail
Cut to a closer shot emphasizing the dancer’s lower body and feet.
Show the signature footwork clearly:
- knees bent,
- heels slightly raised,
- small side-to-side tiptoe steps,
- alternating foot placement,
- compact, neat, rhythmic movement.
This footwork close-up should resemble the original clip’s emphasis on the shoes and stepping rhythm.
No wild kicking, no jumping, no stomping.

SHOT 5 — 8.2–10.0s — return to dancer medium shot
Cut back to the medium shot of the dancer in front of the straw wall.
He continues the same dance with the same measured tempo, same bent-knee tiptoe prance, same side-to-side stepping, same gentle shoulder bounce.
He keeps a smug, delighted grin.
At the end, he settles into a small playful finishing pose without a big flourish.

CAMERA AND EDITING
Use simple hard cuts between shots.
Keep the camera stable.
No zooms, no handheld shake, no orbiting camera, no dramatic reframing.
The edit should feel like an old movie clip: straightforward and rhythmic.

FACIAL PERFORMANCE
The dancer’s expression: sly, smug, delighted, impish, pleased with himself.
The princess’s expression: frightened, tense, uneasy, startled, with hands near or over her mouth.
Do not make the princess look amused or relaxed.

NEGATIVE CONSTRAINTS
No extra characters.
No scene changes.
No large room expansion.
No added furniture.
No text, subtitles, or watermarks.
No distorted anatomy.
No exaggerated cartoon dancing.
No modern dance moves.
No fast chaotic foot tapping.
No large jumps, spins, or acrobatics.
No restarting the “shhh” gesture after the princess reaction shot.

GOAL
The final video should feel like a close recreation of the original meme’s shot order and mood: first the dancer quietly signals “shhh,” then the frightened princess reaction close-up, then the dancer begins the iconic measured tiptoe dance, including a brief footwork-emphasis shot.`

/** Use a compatible scaffold instead of appending conflicting rules to the locked preset. */
export function buildDancePrompt(input: { customDescription?: unknown; quickTags?: unknown; sceneImageUrl?: unknown; referenceVideo?: boolean; imageReferenceGeneration?: boolean }): string {
  const { customDescription, quickTags } = normalizeDanceCustomization(input)
  const customScene = input.sceneImageUrl !== undefined
  if (!customDescription && !quickTags.length && !customScene && !input.referenceVideo && !input.imageReferenceGeneration) return RUMPELSTILTSKIN_DANCE_PROMPT

  const styles = quickTags.map(tag => `- ${danceQuickTagInstructions[tag]}`).join('\n')
  const sceneInstruction = customScene
    ? 'Use @Image3 as the creator-selected environment. Match its location, layout, background details, lighting and colors throughout every shot, including the reaction close-up and footwork detail. Place both characters naturally in this scene. Keep all architecture, surfaces and props consistent with this image, applying only scene alterations explicitly requested by the creator.'
    : 'Use @Image3 as the default straw-filled barn environment.'
  if (input.referenceVideo || input.imageReferenceGeneration) return `[reference generation]
Generate a new 10-second ${input.referenceVideo ? 'Rumpelstiltskin dance' : 'dance'} video.

CAST — ESTABLISHED BEFORE ANY ACTION
@Image1 defines the dancer: facial identity, apparent age, hair, skin tone, identifying accessories, body proportions and default clothing.
@Image2 defines the separate princess watching the dancer: facial identity, hair, identifying accessories, body proportions and default clothing.
From the first frame, show the image-defined identities already established in the target scene. Keep these identities unchanged through the final frame, across every cut, reaction shot and footwork detail. Facial identity always comes from the corresponding image. Exactly two people, with exactly one instance of each person in any shot; never exchange or merge their faces. If a portrait shows only the head or upper body, infer a coherent full body appropriate to that person's age and proportions, extending the visible clothing naturally. ${input.referenceVideo ? "Do not paste a portrait head onto the source actor's body." : 'Keep face, body, clothing and movement coherent as one natural person.'}

DYNAMIC FACIAL PERFORMANCE
Facial identity comes from @Image1 and @Image2 and stays stable while expressions change. Do not freeze the reference photo's expression or gaze.
${input.referenceVideo ? "Transfer @Video1's facial expression changes and their timing to the assigned people, keeping their image-defined identities stable. Follow the source performance's blinks, gaze, eyebrows, cheeks, lips and jaw movements, adapting requested emotions without copying the source faces." : 'Animate natural occasional blinks, purposeful gaze shifts, eyebrows, cheeks, lips and jaw in coordination with the written performance.'}
During shush, give the dancer a sly, mischievous look with naturally pursed lips. The princess reacts with changing eyes, brows and mouth. During the dance, let the dancer's grin and amused eyes evolve with the movement. Apply requested emotions as moving expressions, never a held photo pose.
The face follows head rotation, perspective, scene lighting and shadows. Maintain natural finger-to-lips occlusion during shush and correct occlusion when hands cross the face. Keep glasses aligned with the head. No pasted static face, rigid mask, sliding facial texture or frozen mouth; animate facial muscles naturally while retaining identity.

ONE ENVIRONMENT FOR EVERY SHOT
@Image3 is the sole environment reference for every shot, from opening to ending.
${sceneInstruction}
Ignore @Image1 and @Image2 backgrounds, furniture, lighting, photo composition, poses and framing; these identity photos supply people, not a location or a shot to reproduce. Keep the scene's recognizable layout and visual details visible in the opening, reaction view, dance, footwork and ending. Keep the same environment even when the camera moves closer.

${input.referenceVideo ? `MOTION REFERENCE
@Video1 supplies motion only: the shush gesture, measured dance movements, bent-knee tiptoe footwork, shoulder bounce, shot order and performance timing. Adapt this choreography to 10 seconds using the image-defined people in the image-defined environment.
Do not copy the source video's appearance, facial identities, body proportions, costumes or background. Generate fresh moving footage of the assigned cast in the target scene; do not replay or directly edit source frames. Source camera rhythm is a default, subordinate to the creator's requested camera behavior.
` : `WRITTEN CHOREOGRAPHY
Use the two image-defined people for the following theatrical tiptoe performance. Preserve the dancer's own appearance and natural proportions. The dance is a sly, theatrical, measured tiptoe prance: bent knees, slightly lifted heels, small side-to-side steps with clear weight transfer, elbows bent outward, floating forearms and a gentle shoulder bounce. Keep the steps controlled and readable, with no frantic shuffling, wild kicks, jumps or acrobatics. Generate every shot as fresh moving footage in the environment from @Image3.
`}

PERFORMANCE IN THE TARGET SCENE
0–2 seconds: begin with the assigned dancer already in the environment from @Image3, making the shush gesture toward the assigned princess. Show the dancer's own recognizable face immediately.
2–3 seconds: briefly show the princess reacting in this same location, with her assigned identity already present. Use a surprised, tense reaction by default, adapting her expression to the creator's description and selected styles.
3–8 seconds: show the dancer's measured bent-knee tiptoe side steps, gentle shoulder bounce and readable footwork. Transfer the movement to the dancer's own body and proportions. Include a brief footwork detail in the same location.
8–10 seconds: finish with the same dancer still moving naturally in the same environment, with the face recognizable and the setting still visible. Maintain moving scene footage through the last frame.

CUSTOMIZATION PRIORITY
Use the image-defined clothing, the environment from @Image3, ${customScene ? 'the lighting, materials and color palette from @Image3' : 'a vintage fantasy-film texture'} and simple cuts by default. Apply the creator's requested outfit, expression, texture, lighting and camera changes consistently from the opening through the ending. Keep the people assigned to their images and the environment based on @Image3; any explicitly requested scene alterations must be consistent in every shot. A camera push-in must stay inside this environment and must not turn into the portrait photo's composition or background. If the description conflicts with a selected style, follow the description.

SELECTED STYLES
${styles || 'No additional style selected.'}

CREATOR DESCRIPTION
${customDescription || (input.referenceVideo ? 'Use the image-defined characters and environment with the source dance performance.' : customScene ? 'Use the selected styles in the environment from @Image3 with the default dance performance.' : 'Use the selected styles with the default scene and performance.')}

Apply the requested visual changes while preserving the assigned identities and scene throughout.

CONTINUITY CONSTRAINTS
No face morphs, gradual face blending or delayed identity replacement. ${input.referenceVideo ? 'Never show the source actor before the assigned dancer appears or restore the source actor after a cut.' : 'All shots show only the people defined by the images, retaining their appearance, age and body proportions.'} No uploaded-photo inserts, portrait overlays, collages, freeze-frames or end-cards. Never copy an uploaded photo as the opening or ending frame. No extra characters, text, subtitles or watermarks. Use subtle location ambience and footsteps, with no dialogue or background music.`
  return `Create one 10-second Rumpelstiltskin tiptoe-dance video from the three reference images.

IDENTITY AND OUTPUT
@Image1 is the dancer. @Image2 is the princess watching the dancer. Keep both people's faces recognizable and distinct throughout. Never exchange, merge or duplicate their identities. Keep exactly two people. Output one continuous 10-second video with coherent anatomy, no text, subtitles or watermarks.

DEFAULT SCENE AND PERFORMANCE
${sceneInstruction} Use the reference outfits by default. ${input.referenceVideo ? 'Follow @Video1 for the shot sequence, gestures, reaction shots, dance movement and editing rhythm, adapting the sequence to the requested 10-second duration.' : "Begin with the dancer's sly shush gesture, cut to the princess's surprised reaction, then show a measured, bent-knee tiptoe dance with readable footwork and a playful finishing pose."} Use a vintage fantasy-film look, ${customScene ? '' : 'warm lighting, '}hard cuts and stable framing by default.

CUSTOMIZATION PRIORITY
The creator's description and selected styles override the DEFAULT outfit, location, expression, texture and camera details where requested. Adapt the reference environment or clothing when the creator requests a different scene or outfit. Keep the reference identities, two-person cast and 10-second output. If the description conflicts with a selected style, follow the description. The default static framing must not prevent a requested camera move. The default reaction must not prevent a requested expression.

SELECTED STYLES
${styles || 'No additional style selected.'}

CREATOR DESCRIPTION
${customDescription || (customScene ? 'Use the selected styles in the environment from @Image3 with the default dance performance.' : 'Use the selected styles with the default scene and performance.')}

Apply the requested visual changes consistently while preserving the two reference identities and the Rumpelstiltskin dance theme.${input.referenceVideo ? `

MOTION REFERENCE
@Video1 supplies the dance movement, shot sequence, camera motion and timing. Recreate its shush gesture, reaction cut and readable tiptoe footwork within the requested 10 seconds. @Image1 defines the dancer, @Image2 defines the princess and @Image3 defines the scene. Do not copy the video actors' identities, costumes or background over the image references. Use the video motion and editing instead of the default stable framing where they differ; explicit creator descriptions and selected styles retain priority. Do not add the reference video's music or dialogue.` : ''}`
}

