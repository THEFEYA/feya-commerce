import type {AiLookScene} from './aiLookPreviewPolicy.ts';

/** Exact input ordering is explicitly described to prevent swapping the human and garment references. */
const SCENE_DESCRIPTIONS:Record<AiLookScene,string>={
 studio:'Professional editorial fashion photograph on a softly blurred neutral gray cyclorama, dimensional softbox lighting with natural skin and physically plausible metallic reflections.',
 festival:'Outdoor electronic-music festival, glowing structures and far-away visitors pleasantly defocused into bokeh, natural warm late-afternoon or golden-hour light. Do not reproduce copyrighted festival branding.',
 'burning-man':'Open desert at golden hour, subtle monumental art silhouettes far behind, dry light, sandy distant landscape and tasteful depth of field. No event branding or logos.',
 stage:'Professional indoor live-stage portrait with atmospheric violet/blue lighting in the far background, soft key light on the person, audience and instruments blurred in the distance.',
 'red-carpet':'Elegant red-carpet editorial scene with understated stanchions and warm event lighting behind the person, shallow depth of field, no brand logos.'
};

export function buildAiLookPreviewPrompt(args:{
 title:string;configuration:string;color:string;scene:AiLookScene;
 referenceCount:number;
}):string{
 const scene=SCENE_DESCRIPTIONS[args.scene];
 return [
  'TASK: Make one high-quality, photorealistic PERSONALIZED VIRTUAL LOOK PREVIEW, not a new product design.',
  'INPUT IMAGE ORDER: image 1 is an approved real front/near-front FEYA PRODUCT photograph and is the authoritative design reference.',
  args.referenceCount>1?'Image 2 is an approved detail image of the exact same product, used only for material and accessory fidelity.':'',
  'After the product references, the next image shows the CUSTOMER FRONT-FACING FULL BODY, authoritative for physique, proportions, body shape, skin and pose.',
  'The final image is the CUSTOMER FACE SELFIE, authoritative for recognizable face and natural facial features.',
  'Use the customer likeness, complexion, build and body proportions without idealizing, thinning or altering their body shape.',
  'Give the person a subtle, relaxed, confident natural smile, not a giant artificial grin.',
  'Use ONLY the exact selected product and its approved visible pieces, not a different costume.',
  'Preserve the ORIGINAL wardrobe geometry from image 1: count/shape/position of pieces, bodysuit and underwear coverage, panels, cutouts, fasteners, headpiece, shoulder ornaments, wings, arm and leg components.',
  'Reproduce the material texture and reflective iridescent properties without redesigning them. Preserve selected color family EXACTLY. If a piece is not visible, do not invent it.',
  'Selected FEYA product: '+args.title+'. Selected purchasable configuration: '+args.configuration+'. Selected offered color: '+args.color+'.',
  'Do not add jewelry, footwear, wings or clothing not present in the approved reference or selected option.',
  'Pose: front-facing, head to feet visible where possible, arms gently separated from torso; flattering but truthful camera and body proportions.',
  'Hair and face: prioritize customer selfie; natural realistic skin texture, no glossy CGI look. Keep the face recognizable.',
  'Scene: '+scene,
  'Use natural realistic lighting and shallow background depth of field; wardrobe remains clearly visible and in focus.',
  'No advertising text, brand labels, watermarks, shopping UI, logos, grids, split screens, collages, before/after panels or captions.',
  'IMPORTANT: This is a conceptual image preview, not a size/fit prediction; prioritize exact material/component fidelity and honest appearance.',
 ].filter(Boolean).join('\n');
}
