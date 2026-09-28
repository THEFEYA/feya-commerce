export const HOME_PRESENTATION_VERSION = 'feya-home-visual-v1';

export const HOME_PRESENTATION = {
  heroProductId: '043406cd-0a96-45c5-8796-57c5cc4b276e',
  pieceTiles: [
    { code: 'full-looks', label: 'Full Looks', href: '/shop?piece=Full%20Look', productId: '0403df9f-3ff9-498d-b3d9-69ad64b3dd4c' },
    { code: 'bodysuits', label: 'Bodysuits', href: '/collections/bodysuits', productId: '65e36680-71ca-44ba-9873-f7c962928642' },
    { code: 'shoulders', label: 'Shoulders', href: '/collections/shoulder-armor', productId: '043406cd-0a96-45c5-8796-57c5cc4b276e' },
    { code: 'headpieces', label: 'Headpieces', href: '/collections/costume-headpieces', productId: '3ff937a2-838f-4986-be64-07b11faf8d17' },
    { code: 'masks', label: 'Masks', href: '/collections/costume-masks', productId: '6ddd240e-01ae-4ac8-800e-3a14dbac64a0' },
    { code: 'skirts', label: 'Skirts', href: '/shop?piece=Skirt', productId: '04099215-8328-4238-82dd-876bc3f2afdb' },
  ],
  eventTiles: [
    { code: 'festival', eyebrow: 'Event', label: 'Festival Outfits', href: '/collections/festival-outfits', productId: '0403df9f-3ff9-498d-b3d9-69ad64b3dd4c', description: 'Statement pieces for festival nights, from complete looks to individual components.', shortcuts: [{ label: 'Rave', href: '/collections/rave-outfits' }, { label: 'Burning Man', href: '/collections/burning-man-looks' }] },
    { code: 'stage', eyebrow: 'Performance', label: 'Stage & Fashion', href: '/collections/stage-outfits', productId: '12111ddc-2364-4861-bd93-4bbc27ae4b28', description: 'High-impact pieces for stage, fashion shows and camera-facing performance.', shortcuts: [{ label: 'Showgirl', href: '/shop?performance=Showgirl' }, { label: 'Drag Queen', href: '/shop?performance=Drag%20Queen' }, { label: 'Go-Go Dancer', href: '/shop?dance=Go-Go%20Dancer' }, { label: 'Pole Dancer', href: '/shop?dance=Pole%20Dancer' }] },
    { code: 'halloween', eyebrow: 'Event', label: 'Halloween', href: '/shop?event=Halloween', productId: '340b160f-93e3-4389-866f-df79cc14dea8', description: 'Dark silhouettes, horns, masks and costume-led statement pieces.' },
    { code: 'cosplay', eyebrow: 'Event', label: 'Cosplay', href: '/shop?event=Cosplay', productId: '74634519-add3-490f-8ef3-3b4d74a7ca7d', description: 'Character-led armor, headpieces, wings and full-look styling.' },
  ],
  lookTiles: [
    { code: 'gilded-showgirl', axis: 'Performance · Showgirl', label: 'Gilded Showgirl', productId: '12111ddc-2364-4861-bd93-4bbc27ae4b28' },
    { code: 'chrome-warrior', axis: 'Persona · Warrior', label: 'Chrome Warrior', productId: '5f0df65c-4b04-4905-80c5-53bd7e807063' },
  ],
  selectedProductIds: [
    '45c4d5e0-0e96-4b14-a993-35a6ebc75170',
    '65e36680-71ca-44ba-9873-f7c962928642',
    '3ff937a2-838f-4986-be64-07b11faf8d17',
    '7bf47f01-8114-4e8f-ba96-632f0fdd8d7d',
    '31bde143-e483-454b-a397-14bcffa47f20',
    '74634519-add3-490f-8ef3-3b4d74a7ca7d',
    '1eb4b55c-dedf-4399-92fd-c94c8d962091',
    '32b1e29b-d709-4e00-a95c-6ad0b4c92704',
  ],
  findTiles: [
    { code: 'futuristic', axis: 'Style', label: 'Futuristic', href: '/shop?style=Futuristic', productId: '1ff57e72-8360-4f9c-8e9c-768b66fe29e5' },
    { code: 'cyberpunk', axis: 'Style', label: 'Cyberpunk', href: '/shop?style=Cyberpunk', productId: '2973f3ae-6097-49c0-ab91-21a9697560cc' },
    { code: 'showgirl', axis: 'Performance', label: 'Showgirl', href: '/shop?performance=Showgirl', productId: '12111ddc-2364-4861-bd93-4bbc27ae4b28' },
    { code: 'warrior', axis: 'Persona', label: 'Warrior', href: '/shop?persona=Warrior', productId: '679c975c-b309-49dc-9207-f89fc96b84d1' },
  ],
} as const;

export function homePresentationProductIds() {
  return Array.from(new Set([
    HOME_PRESENTATION.heroProductId,
    ...HOME_PRESENTATION.pieceTiles.map((item) => item.productId),
    ...HOME_PRESENTATION.eventTiles.map((item) => item.productId),
    ...HOME_PRESENTATION.lookTiles.map((item) => item.productId),
    ...HOME_PRESENTATION.selectedProductIds,
    ...HOME_PRESENTATION.findTiles.map((item) => item.productId),
  ]));
}
