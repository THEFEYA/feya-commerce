-- Tighten exact release identity: page movement or any pinned draft update must fail closed.

alter table public.feya_storefront_approved_product_bindings_v1
  add column if not exists draft_updated_at_snapshot timestamptz,
  add column if not exists url_path_snapshot text;

with expected(canonical_product_id,draft_updated_at_snapshot,url_path_snapshot) as (
  values
('0395cb11-424f-407f-a849-7ee3b617ab57'::uuid,'2026-09-20T22:04:21.616961+00:00'::timestamptz,'/shop/gold-futuristic-armor-set-choker-collar-shoulder-armor-and-arm-bracers-performance-outfit-4511817111'),
('0403df9f-3ff9-498d-b3d9-69ad64b3dd4c'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/cosmic-festival-outfit-with-top-skirt-metallic-costume-set-party-rave-wear-unique-futuristic-outfit-cyber-punk-clothing-accessories-4367470907'),
('04099215-8328-4238-82dd-876bc3f2afdb'::uuid,'2026-09-18T16:37:17.254821+00:00'::timestamptz,'/shop/white-festival-outfit-leather-harness-with-shoulders-leg-garters-and-open-skirt-desert-rave-wea-4341850172'),
('043406cd-0a96-45c5-8796-57c5cc4b276e'::uuid,'2026-09-18T11:21:13.256957+00:00'::timestamptz,'/shop/golden-amazon-armor-costume-set-metallic-shoulder-armour-arms-covers-futuristic-outfit-cosplay-accessories-burning-man-costume-set-1890268726'),
('057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/festival-couple-costume-set-golden-leather-outfits-for-men-women-futuristic-costume-burning-man-wear-metallic-armor-rave-outfits-1765624488'),
('067628e8-3ecd-4979-8501-6da61ca2f51a'::uuid,'2026-09-18T11:21:13.256957+00:00'::timestamptz,'/shop/metallic-fringe-harness-set-top-skirt-fashion-festival-clothing-chrome-rave-outfit-1890025125'),
('098044e5-c452-4c52-a0a4-2b29120196e8'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/red-martian-costume-set-shoulders-top-leg-covers-skirt-red-latex-outfit-futuristic-women-s-alian-cosplay-space-armor-wear-1764774832'),
('09d41ed1-51be-43b0-aace-fc80e6e50f99'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/full-body-armor-costume-set-arm-leg-covers-for-burning-man-outfit-apocalyptic-robot-wear-metallic-cyborg-costume-futuristic-cosplay-1879373624'),
('09f51ad4-6b90-4311-aa5a-54f91cf4b7bf'::uuid,'2026-09-20T23:20:10.998932+00:00'::timestamptz,'/shop/gogo-costume-set-bodysuit-skirt-leg-covers-for-futuristic-dance-fashion-outfit-pj-showgirl-4389332118'),
('0b7e5ccd-f5a3-4dd7-877f-1e21fbda9486'::uuid,'2026-09-21T14:06:55.740589+00:00'::timestamptz,'/shop/warrior-princess-outfit-golden-armor-costume-set-cyberpunk-rave-outfit-4482426736'),
('0e75d2f2-c345-440e-88e4-333b63caed09'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/mirror-leggings-bodysuit-for-dance-performance-or-show-parties-mirror-leg-covers-body-suit-outfit-mirror-costume-women-stage-clothing-1807552560'),
('103ff46a-892a-4961-80b1-e6996727c395'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/chrome-futuristic-clothing-set-silver-festival-dress-showgirl-wear-luxury-cosmic-look-metallic-dance-outfit-carnival-costume-4337148159'),
('11bb0057-8c1f-4347-8c03-46856df0653c'::uuid,'2026-09-20T21:17:46.829103+00:00'::timestamptz,'/shop/rave-festival-full-body-harness-adjustable-vegan-leather-straps-outfit-for-shows-performance-wear-edgy-fashion-body-belts-4316539455'),
('11d2b7ca-3a13-4bcb-b1f2-b91565a20e7e'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/best-festival-outfit-with-top-shoulders-skirt-metallic-harness-set-rave-wear-unique-festival-harness-rave-outfit-festival-accessories-1900339755'),
('12111ddc-2364-4861-bd93-4bbc27ae4b28'::uuid,'2026-09-20T15:50:33.862541+00:00'::timestamptz,'/shop/showgirl-outfit-top-with-shoulders-skirt-party-stage-wear-unique-futuristic-outfit-performance-dance-clothing-4390447995'),
('12a0faf1-9c3c-44e2-bbf1-1583ac309a46'::uuid,'2026-09-20T21:17:46.829103+00:00'::timestamptz,'/shop/futuristic-cosplay-headpiece-festival-headdress-cyber-punk-wings-holographic-bodysuit-leg-covers-for-rave-festivals-and-burning-man-1890691940'),
('13300fb8-c39d-476f-9485-75747c4e6599'::uuid,'2026-09-21T13:28:18.678631+00:00'::timestamptz,'/shop/men-s-silver-robot-armor-futuristic-cyborg-outfit-4506732837'),
('158e7824-4876-4991-b506-e3f6f4aa8371'::uuid,'2026-09-18T14:30:11.31377+00:00'::timestamptz,'/shop/metallic-futuristic-clothing-set-top-skirt-chrome-festival-dress-showgirl-wear-4507727106'),
('17de9c7b-53d0-4a7d-90d0-3e79f26e3489'::uuid,'2026-09-18T12:36:15.466691+00:00'::timestamptz,'/shop/futuristic-stripper-outfit-silver-pole-wear-exotic-dance-costume-women-s-performance-clothing-1893491509'),
('187f01a3-40e0-4820-b3aa-1bccc1eea6d2'::uuid,'2026-09-18T11:50:22.744097+00:00'::timestamptz,'/shop/holographic-festival-outfit-with-top-panties-futuristic-harness-women-s-rave-wear-hologram-dance-outfit-festival-leather-accessories-4391585601'),
('1a8545eb-f997-4ddf-b6c9-c3c0afa1bd7c'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/festival-outfit-with-golden-feathers-leather-crown-headpiece-top-skirt-costume-set-rave-and-party-wear-unique-fashion-wear-gold-1823064231'),
('1af7458c-aaff-4460-a874-45c9ad4ccb8c'::uuid,'2026-09-18T14:30:11.31377+00:00'::timestamptz,'/shop/show-party-costume-set-bodysuit-and-helmet-with-horns-metalic-leg-garters-gold-body-chain-outfit-showgirl-cosplay-costume-4296965812'),
('1dbf149a-739c-4afa-ba59-3b5f99acfb77'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/black-leather-bodysuit-latex-bodysuit-drag-queen-costume-halloween-body-suit-witch-cosplay-outfit-dark-queen-party-bodysuit-1884800699'),
('1eb4b55c-dedf-4399-92fd-c94c8d962091'::uuid,'2026-09-18T16:37:17.254821+00:00'::timestamptz,'/shop/desert-warrior-men-s-costume-burning-man-gold-armor-outfit-rave-festival-fashion-steampunk-leather-shoulders-futuristic-dune-wear-4326178885'),
('1fc815c5-0165-468a-a6d8-e91c1cefcd61'::uuid,'2026-09-18T13:47:08.788447+00:00'::timestamptz,'/shop/futuristic-female-costume-set-festival-cosmic-wear-stage-costume-outfit-4475485632'),
('1ff57e72-8360-4f9c-8e9c-768b66fe29e5'::uuid,'2026-09-18T13:17:47.376053+00:00'::timestamptz,'/shop/red-futuristic-costume-for-women-cosmic-fashion-outfit-4456615683'),
('256c75b4-f378-4b21-8321-9d5766bd209c'::uuid,'2026-09-18T16:37:17.254821+00:00'::timestamptz,'/shop/holographic-costume-set-with-top-skirt-sparkling-rave-outfit-iridescent-stage-costume-leather-party-wear-showgirl-clothing-4333358949'),
('27786636-7021-4809-8e81-7f566a3436ae'::uuid,'2026-09-20T20:45:44.472494+00:00'::timestamptz,'/shop/red-leather-dragon-cosplay-sexy-latex-halloween-outfit-with-festival-armor-shoudelrs-bodysuit-leather-gloves-spine-tail-costume-1852762562'),
('28c6558b-2738-4c60-ad55-6d4dbd14d698'::uuid,'2026-09-23T16:11:10.061039+00:00'::timestamptz,'/shop/golden-festival-outfit-leather-harness-top-with-shoulders-open-skirt-fashion-rave-wear-burning-man-clothing-for-women-metallic-costume-4342129698'),
('28c84d65-57b4-4b83-a2bc-6e4370ac188a'::uuid,'2026-09-18T17:39:45.172643+00:00'::timestamptz,'/shop/futuristic-metallic-top-and-belt-cyber-stage-costume-set-4374165306'),
('2973f3ae-6097-49c0-ab91-21a9697560cc'::uuid,'2026-09-18T12:36:15.466691+00:00'::timestamptz,'/shop/cyberpunk-armor-set-silver-leather-shoulders-arm-bracelets-burning-man-outfit-4456102467'),
('29ebbf71-cd02-42fb-8372-55002ca56495'::uuid,'2026-09-20T13:21:25.629016+00:00'::timestamptz,'/shop/incredible-fashion-armored-wear-set-choker-bra-shoulders-belt-garters-shining-golden-suit-women-unique-futuristic-outfit-luxury-costume-1862235439'),
('2a39f8ec-b5c3-403c-8f1a-7e10bb0ab829'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/dark-witch-exclusive-halloween-costume-crown-headpiece-leather-bodysuit-garters-shoulder-cape-and-leg-covers-for-bold-cosplay-outfit-1785419292'),
('2b8d122f-5830-4bc6-8e11-7e3ae594c9b2'::uuid,'2026-09-18T11:21:13.256957+00:00'::timestamptz,'/shop/festival-headpiece-with-golden-feathers-leather-crown-headdress-stage-top-skirt-costume-set-rave-party-wear-fashion-carnival-dress-1890486664'),
('3013d058-8299-4c10-ba42-3c553799255b'::uuid,'2026-09-20T16:40:44.040086+00:00'::timestamptz,'/shop/glaxy-festival-clothes-metallic-top-skirt-silver-costume-set-for-rave-wear-alien-clothes-unique-futuristic-outfit-cosmic-clothing-1858323533'),
('31bde143-e483-454b-a397-14bcffa47f20'::uuid,'2026-09-21T14:06:55.740589+00:00'::timestamptz,'/shop/silver-spine-tail-costume-futuristic-bones-outfit-cyber-punk-accessories-4487555033'),
('32b1e29b-d709-4e00-a95c-6ad0b4c92704'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/black-leather-halloween-costume-set-glam-punk-outfit-shoulder-top-and-mini-skirt-goth-garters-panties-costume-party-wear-4373243487'),
('32b51b28-0570-49af-90f5-7bfdd7da5148'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/festival-armored-costume-set-arm-leg-covers-for-burning-man-outfit-apocalyptic-costume-metallic-cyborg-costume-futuristic-armor-wear-1879391644'),
('330fd9bc-f3d0-4eec-8e98-b36fb490b486'::uuid,'2026-09-21T16:19:29.820811+00:00'::timestamptz,'/shop/gold-festival-costume-with-top-skirt-dance-performance-wear-futuristic-apocalypse-festival-harness-1831762819'),
('340b160f-93e3-4389-866f-df79cc14dea8'::uuid,'2026-09-20T23:20:10.998932+00:00'::timestamptz,'/shop/dark-witch-cosplay-costume-set-leather-horns-corset-spine-women-s-latex-halloween-outfit-festival-headpiece-carnivals-clothing-black-1865813989'),
('39d33dfd-1a01-458a-94c7-8372f344bce5'::uuid,'2026-09-23T17:08:48.855885+00:00'::timestamptz,'/shop/cyber-punk-armor-set-shoulders-bracelets-leather-skirt-goth-rave-outfit-burning-man-mad-max-apocalypse-futuristic-festivals-armours-1863228028'),
('3a006050-ab78-4b4d-9964-ed8c9f32e923'::uuid,'2026-09-20T17:37:25.429419+00:00'::timestamptz,'/shop/men-s-silver-robot-arm-armor-futuristic-cyborg-sleeves-festival-wear-4463955343'),
('3ba4ec57-7b0f-41ea-911d-5988b5088f1b'::uuid,'2026-09-18T17:39:45.172643+00:00'::timestamptz,'/shop/men-s-burning-man-outfit-gold-leather-chest-harness-rave-festival-fashion-wear-4496005817'),
('3c08ea9c-76a9-4079-bc08-58fa8a831019'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/best-futuristic-costume-set-festival-armored-outfit-metallic-rave-wear-silver-cosmic-clothing-cyber-armor-burning-man-party-wear-1892925089'),
('3cffa988-7f84-4fbf-b6e2-67a6164f7dc2'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/best-festival-outfit-with-one-shoulders-skirt-unique-rave-harness-armor-outfit-4490122240'),
('3ec78c4d-7cdb-4628-aa3b-083acefcbe45'::uuid,'2026-09-23T17:08:48.855885+00:00'::timestamptz,'/shop/luxury-steam-punk-outfit-futuristic-shoulders-bodysuit-garters-for-festival-burning-man-cyber-punk-wear-cosmic-dance-costume-4377579894'),
('3ff937a2-838f-4986-be64-07b11faf8d17'::uuid,'2026-09-18T14:30:11.31377+00:00'::timestamptz,'/shop/golden-feather-festival-outfit-leather-crown-stage-costume-set-4373523076'),
('4033e707-98e2-45ad-9fd6-b7d615673fa3'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/holographic-showgirl-outfit-iridescent-top-neon-open-skirt-vegan-leather-rave-dress-performance-dancewear-1784463593'),
('40384eea-fd82-40f4-98e7-804383c42796'::uuid,'2026-09-23T17:08:48.855885+00:00'::timestamptz,'/shop/golden-festival-outfit-with-bra-skirt-gold-harness-set-festival-basque-accessories-1901540523'),
('4243eca2-4f2a-4a63-a352-b71e9fcb8256'::uuid,'2026-09-20T16:40:44.040086+00:00'::timestamptz,'/shop/gorgeus-costume-set-golden-arms-shoulders-corset-top-leather-costume-for-stage-show-women-s-perofmance-clothing-fashion-party-wear-4450924664'),
('4311bc31-ee98-458e-8290-b663ee525a4c'::uuid,'2026-09-18T14:59:59.444498+00:00'::timestamptz,'/shop/fashion-warrior-female-armor-costume-set-metallic-shoulder-top-panties-arms-covers-silver-futuristic-outfit-festival-burning-man-wear-4329393838'),
('453ffb2e-2ed9-4e8d-b74c-e891604f9644'::uuid,'2026-09-23T15:05:48.890681+00:00'::timestamptz,'/shop/unique-festival-outfit-with-gold-leather-shoulder-skirt-gold-metallic-armor-burning-man-clothing-for-women-luxury-rave-accessories-4324575912'),
('457416ed-92b3-4450-a5b0-ff4e27ee11a2'::uuid,'2026-09-23T16:11:10.061039+00:00'::timestamptz,'/shop/festival-outfit-with-top-shoulders-skirt-gold-metallic-harness-rave-armor-wear-burning-man-clothing-unique-festival-accessories-4321539799'),
('481ca9fa-1100-439d-b52b-80caadba52a9'::uuid,'2026-09-21T13:28:18.678631+00:00'::timestamptz,'/shop/desert-goddess-costume-set-fringe-harness-top-skirt-gold-festival-wear-for-burning-man-futuristic-cleopatra-outfit-4512145028'),
('4a4d2214-fc12-41a9-8ce3-f39272a8e22d'::uuid,'2026-09-18T13:47:08.788447+00:00'::timestamptz,'/shop/metallic-futuristic-costume-set-silver-festival-outfit-cosmic-outfit-pole-dance-costume-burning-man-outfit-chrome-performance-costume-1893505229'),
('4b0c8180-774d-4d5c-a12c-0864f305d1cb'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/burning-man-silver-outfit-cyber-warrior-men-s-costume-rave-festival-fashion-steampunk-leather-shoulder-futuristic-dune-wear-4487639486'),
('4da73818-2f50-43de-b326-8b2c63b17983'::uuid,'2026-09-20T15:50:33.862541+00:00'::timestamptz,'/shop/gold-cyberpunk-costume-festival-armor-outfit-futuristic-burning-man-wear-4460639798'),
('5044435f-d093-4437-9945-ff822b2df2d9'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/black-rave-outfit-festival-leather-shoulders-sexy-goth-costume-glamour-punk-wear-burning-man-clothing-for-women-latex-armor-accessories-4346197969'),
('50c370fb-3f41-4e49-8e3b-cbc5e1dd478b'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/black-leather-crown-headpiece-dark-witch-halloween-halo-exclusive-show-costume-drag-queen-outfit-for-bold-cosplay-outfit-1904672353'),
('5124ce7f-daf1-45f7-bbe2-0f97f17ecaea'::uuid,'2026-09-23T17:08:48.855885+00:00'::timestamptz,'/shop/dark-queen-halloween-set-leather-chain-collar-spine-skirt-glove-for-sexy-witch-cosplay-costume-women-s-latex-outfit-adult-1785673048'),
('51487104-166f-45e0-a528-d8b27a6258d6'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/festival-clothes-set-top-fringe-skirt-rave-party-wear-unique-festival-harness-golden-carnival-costume-accessories-1760981376'),
('51a30d6f-a588-49b9-b077-5f33488efd36'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/holographic-armor-costume-for-cyber-punk-outfit-pride-armor-accessories-futuristic-cosplay-set-with-top-panties-leg-covers-bracelets-1829211017'),
('51d879ce-f762-4307-b896-efcb2ffd64e9'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/rave-festival-outfit-with-mask-shoulder-top-skirt-bracelet-white-gold-leather-armor-wear-burning-man-costume-set-women-futuristic-suit-1842722795'),
('5255562a-0181-4fe3-bf4f-e5083f5638e5'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/fashion-costume-set-with-golden-leather-chain-bra-and-skirt-for-dance-party-and-performance-wear-1799675197'),
('5589b5ea-e21a-4e57-a4b2-b598bd8466d2'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/party-dress-for-drag-queen-show-performance-costume-set-bodysuit-glove-stage-dress-sparkling-dress-pink-leather-dress-latex-dress-1884785723'),
('5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid,'2026-09-20T13:21:25.629016+00:00'::timestamptz,'/shop/hologram-festival-outfit-shimmering-harness-female-rave-costume-set-burning-man-clothing-music-party-wear-4342770881'),
('56ac8372-da2a-444d-8b8e-4dc196520bf7'::uuid,'2026-09-20T17:06:42.103675+00:00'::timestamptz,'/shop/goddess-golden-rave-outfit-futuristic-festival-armor-alien-costume-set-metallic-lingerie-wear-for-cosmic-burning-man-style-1868945709'),
('596c5ec2-e59e-484f-8f73-89221f2b4171'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/leather-punk-outfit-with-harness-set-choker-chest-harness-leg-garter-men-s-body-strap-leather-kinky-wear-sexy-fetish-costume-male-1858724751'),
('5bf3df64-84dc-4baf-84bd-8a94e1b06ccb'::uuid,'2026-09-23T11:27:45.947097+00:00'::timestamptz,'/shop/festival-couple-costume-set-futuristic-rave-outfits-for-men-women-burning-man-wear-4489232697'),
('5cd806f8-8aaa-4b6e-ae6a-4acc716677a2'::uuid,'2026-09-20T13:21:25.629016+00:00'::timestamptz,'/shop/desert-goddess-costume-set-fringe-harness-top-skirt-gold-festival-wear-for-burning-man-edm-party-look-futuristic-cleopatra-outfit-4341603545'),
('5e034423-6c04-459b-b7d7-0d10ad564c4e'::uuid,'2026-09-20T21:43:03.21038+00:00'::timestamptz,'/shop/goddess-rave-outfit-fringe-skirt-harness-top-gold-metallic-festival-wear-for-burning-man-edm-party-look-futuristic-cleopatra-cosplay-4452695439'),
('5f0df65c-4b04-4905-80c5-53bd7e807063'::uuid,'2026-09-18T13:17:47.376053+00:00'::timestamptz,'/shop/female-warrior-armor-costume-set-metallic-shoulder-armour-arms-covers-chrome-futuristic-outfit-festival-accessories-burning-man-wear-4324250573'),
('60ee8feb-32d3-4a8c-b64b-38d33433e2f2'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/chic-festival-costume-set-for-burning-man-golden-harness-top-fringe-skirt-fashion-festival-clothing-futuristic-rave-outfit-1902123589'),
('641ba42d-8ad9-4178-b0c6-d41c14fc8f66'::uuid,'2026-09-18T14:59:59.444498+00:00'::timestamptz,'/shop/gold-dragon-cosplay-set-mystical-headpiece-spine-shoulders-gloves-4494565518'),
('657bd6d8-fbe1-4441-abad-f574e3380897'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/cosmic-festival-outfit-with-top-skirt-metallic-harness-set-rave-wear-unique-futuristic-harness-party-outfit-festival-accessories-4303866388'),
('65e36680-71ca-44ba-9873-f7c962928642'::uuid,'2026-09-18T11:50:22.744097+00:00'::timestamptz,'/shop/luxury-metallic-bodysuit-with-shoulder-bracelets-silver-female-armor-for-cosplay-chrome-drag-queen-outfit-metal-warrior-body-suit-4337549399'),
('665296a0-f5ad-422c-837c-868f611c45c6'::uuid,'2026-09-20T19:34:01.36441+00:00'::timestamptz,'/shop/fashion-corset-skirt-for-event-wear-luxury-corset-basque-women-s-top-mirrored-belt-choker-4373546738'),
('6739b15c-f2f3-4a26-9e2a-3a0b5a3e2d2f'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/crypto-warrior-cosplay-costume-set-headpiece-wings-bodysuit-bracelets-leg-covers-futuristic-armor-outfit-1764754572'),
('679c975c-b309-49dc-9207-f89fc96b84d1'::uuid,'2026-09-23T11:27:45.947097+00:00'::timestamptz,'/shop/warrior-princess-outfit-gold-armor-costume-set-cyberpunk-rave-wear-4496855101'),
('6a4c1f02-8f02-4aca-b70d-8d9ac66b9b40'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/holographic-festival-costume-set-neon-rave-outfit-for-women-iridescent-leather-costume-unique-party-costume-with-featers-show-girl-wear-1810732577'),
('6a885710-fbee-4790-ba09-d56530f641f6'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/metallic-spine-tail-outfit-unique-costume-for-futuristic-cosplay-outfit-silver-leather-masquerade-wear-halloween-accessories-1819713304'),
('6bfcc9e6-3d45-4ef4-934f-12dd9dfc4532'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/cyber-punk-armor-set-for-women-arm-leg-covers-metallic-rave-outfit-for-burning-man-mad-max-apocalypse-futuristic-festivals-armours-1779417861'),
('6ddd240e-01ae-4ac8-800e-3a14dbac64a0'::uuid,'2026-09-20T20:45:44.472494+00:00'::timestamptz,'/shop/broken-mirror-costume-set-reflective-outfit-with-bunny-mask-mirror-corset-over-the-knee-boots-stage-performance-dance-show-wear-1785354749'),
('72d8461a-1f64-40eb-b3f7-959a19a0c8fa'::uuid,'2026-09-20T17:06:42.103675+00:00'::timestamptz,'/shop/mirror-clothes-for-women-reflective-bunny-mask-mirror-corset-over-the-knee-boots-stage-costume-performance-dance-show-outfit-1847125327'),
('73735bd6-82e7-48fa-8b2e-235a13bbf4b0'::uuid,'2026-09-20T17:06:42.103675+00:00'::timestamptz,'/shop/silver-spine-tail-costume-futuristic-bones-outfit-cyber-punk-accessories-1902240495'),
('74634519-add3-490f-8ef3-3b4d74a7ca7d'::uuid,'2026-09-21T00:07:19.982642+00:00'::timestamptz,'/shop/futuristic-wings-costume-set-rave-headpiece-cosplay-wings-holographic-bodysuit-and-leg-covers-for-festivals-cyber-carnival-outfit-1884227520'),
('764debf0-4d46-4d1d-a17b-2bb6f2dc5702'::uuid,'2026-09-23T15:05:48.890681+00:00'::timestamptz,'/shop/red-festival-outfit-rave-armor-costume-set-women-s-burning-man-costume-4477779047'),
('79754caa-9c09-4241-8c08-d0c9e60db460'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/cosmic-festival-outfit-with-top-shoulders-skirt-panties-silver-metallic-wear-female-rave-armor-burning-man-clothing-accessories-4327819365'),
('7bb70eab-b2f5-4079-96e7-d116484d1466'::uuid,'2026-09-18T14:30:11.31377+00:00'::timestamptz,'/shop/futuristic-silver-reflective-armor-set-metallic-festival-costume-sci-fi-cyberpunk-chest-plate-cosmic-fashion-for-drag-queen-stage-wear-1883724741'),
('7bc4e89c-155d-45b8-982f-46253b7ed18d'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/carnival-dress-with-leather-feathers-crown-headpiece-top-skirt-stage-party-wear-burlesque-dress-showgirl-outfit-latex-petals-1881683502'),
('7bf47f01-8114-4e8f-ba96-632f0fdd8d7d'::uuid,'2026-09-20T21:17:46.829103+00:00'::timestamptz,'/shop/desert-warrior-men-s-costume-burning-man-gold-armor-outfit-rave-festival-fashion-steampunk-leather-shoulders-futuristic-dune-wear-4449718197'),
('7c220537-de7c-4157-99c3-ba1f9144d113'::uuid,'2026-09-23T16:11:10.061039+00:00'::timestamptz,'/shop/holographic-rave-outfit-with-top-shoulders-fringe-skirt-futuristic-harness-rave-wear-fashion-burning-man-outfit-festival-accessories-4332321981'),
('7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid,'2026-09-21T16:19:29.820811+00:00'::timestamptz,'/shop/luxury-brown-leather-suspenders-groomsmen-gift-fashion-chest-harness-for-men-handmade-body-belt-1867996009'),
('7e743440-3e9f-490c-b306-5c8c87969973'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/women-s-white-festival-outfit-for-rave-party-4475491525'),
('7e77810b-ee7d-46a4-91af-f24d1adcfd4a'::uuid,'2026-09-18T11:21:13.256957+00:00'::timestamptz,'/shop/red-glossy-armor-costume-set-leather-shoulder-armour-arm-covers-futuristic-outfit-cosplay-accessories-burning-man-fashion-costume-1890281650'),
('81224290-77db-4738-923b-65a16d1c691a'::uuid,'2026-09-18T14:59:59.444498+00:00'::timestamptz,'/shop/pink-show-dress-drag-queen-costume-bodysuit-and-gloves-set-1845688122'),
('818a1991-46e2-4628-ac61-6db77314c9af'::uuid,'2026-09-21T13:28:18.678631+00:00'::timestamptz,'/shop/metallic-festival-armor-outfit-silver-metallic-harness-rave-armor-wear-burning-man-clothing-chrome-female-warrior-cosplay-accessories-4322579452'),
('81fc83de-76aa-4733-9a88-f631e7699fa6'::uuid,'2026-09-20T17:37:25.429419+00:00'::timestamptz,'/shop/metallic-costume-with-bra-skirt-silver-harness-set-chrome-pole-dance-wear-unique-festival-harness-burlesque-dance-basque-4303552278'),
('8223ea35-644b-4bd8-bd05-4ba7810b116a'::uuid,'2026-09-21T00:07:19.982642+00:00'::timestamptz,'/shop/party-bodysuit-with-helmet-with-horns-metalic-corset-and-leg-garters-golden-dance-outfit-event-clothing-for-women-cosplay-costume-set-1823479818'),
('8242d255-f77f-4e9f-88a2-a5db326fa297'::uuid,'2026-09-20T21:43:03.21038+00:00'::timestamptz,'/shop/futuristuic-bodysuit-with-sparkly-dark-blue-leather-butterfly-costume-set-drag-queen-body-suit-cyber-fantasy-outfit-fairy-costume-1884790737'),
('82d2dc58-e635-4bc1-8571-2587641e627f'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/stage-costume-set-red-fairy-show-party-wear-performance-dress-festival-top-skirt-futuristic-clothes-latex-outfit-1818991059'),
('83ea907b-a523-47cf-834f-5a1b16b80339'::uuid,'2026-09-21T16:19:29.820811+00:00'::timestamptz,'/shop/leather-horns-headpiece-for-cosplay-dark-witch-costume-set-black-latex-outfit-halloween-costume-festival-headdress-carnival-wear-1899634207'),
('8441aa63-d524-4ee4-8bdb-2d7b3f6c3bcf'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/fashion-spine-armor-cosplay-set-black-leather-outfit-with-bodysuit-tail-and-leg-covers-for-halloween-and-themed-parties-latex-clothing-1780316635'),
('84cb55e1-a5a8-473c-abcd-17f0dc4161ab'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/unique-fashion-costume-set-top-skirt-bracelet-glossy-red-leather-clothing-for-show-drag-queen-party-wear-cabare-burlesque-outfit-armor-1847174712'),
('85752f94-b2d7-465e-ace2-40bb77977461'::uuid,'2026-09-20T22:04:21.616961+00:00'::timestamptz,'/shop/silver-futuristic-armor-set-shoulder-pauldrons-arm-bracers-chain-belt-festival-stage-costume-4508715749'),
('8635ab3f-cf01-42fb-a4da-508c7fd0db65'::uuid,'2026-09-20T16:40:44.040086+00:00'::timestamptz,'/shop/desert-warrior-gold-armor-dune-festival-costume-4476440494'),
('882793f6-15ca-4617-a579-5cd47290ce72'::uuid,'2026-09-20T23:20:10.998932+00:00'::timestamptz,'/shop/fashionable-leather-suspenders-for-men-luxury-brown-suspenders-groomsmen-gift-fashion-chest-harness-for-men-handmade-belt-suspenders-1855580162'),
('88d4332c-95bc-4859-a31e-33d6ee89fb4d'::uuid,'2026-09-20T19:34:01.36441+00:00'::timestamptz,'/shop/unique-men-s-chest-harness-fetish-leather-harnesses-adjustable-bdsm-clothing-black-leather-body-belt-gay-pride-festival-outfit-1888669170'),
('8b321ebd-25ab-4d9b-ba30-2cfc3ba18094'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/burning-man-gold-armor-outfit-desert-warrior-men-s-costume-rave-festival-fashion-steampunk-leather-shoulder-futuristic-dune-wear-4356540547'),
('8b4e23fd-456e-462b-a6b3-8aaa0333debe'::uuid,'2026-09-20T21:43:03.21038+00:00'::timestamptz,'/shop/golden-horns-costume-set-metallic-bodysuit-with-horns-and-leg-covers-for-cosplay-parties-shows-carnivals-performances-4448567557'),
('8f4646f0-ea2b-48c3-af11-e22f0dec4f08'::uuid,'2026-09-21T00:07:19.982642+00:00'::timestamptz,'/shop/festival-costume-set-futuristic-armored-clothes-for-men-women-rave-parties-burning-man-golden-wear-1824045326'),
('9400d8af-b6b9-4b4a-b878-b97eba761e10'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/martian-queen-wear-with-choker-shoulders-top-skirt-futuristic-dress-costume-cosmic-party-outfit-fashion-clothing-for-alien-theme-costume-1785451272'),
('98600aa8-307b-4165-a8ae-38e347c114bd'::uuid,'2026-09-20T20:45:44.472494+00:00'::timestamptz,'/shop/mirror-plague-doctor-costume-reflective-polygonal-clothes-steampunk-masquerade-mask-halloween-futuristic-cosplay-gothic-festival-outfit-1882682017'),
('9c59e997-1e03-463b-8f3d-3259c71d05d0'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/cool-festival-outfit-with-shoulders-skirt-metallic-harness-set-rave-wear-unique-festival-harness-rave-outfit-festival-accessories-1895831443'),
('9c845a5a-666a-47b4-99d6-9f0a393bfa1c'::uuid,'2026-09-20T21:43:03.21038+00:00'::timestamptz,'/shop/metallic-gold-costume-set-armor-top-open-skirt-choker-bracers-4455606322'),
('9d1d101d-e1d1-48fd-ac41-65c07dd5ce05'::uuid,'2026-09-21T00:07:19.982642+00:00'::timestamptz,'/shop/silver-costume-with-bra-skirt-chrome-harness-set-futuristic-pole-dance-wear-unique-stage-harnesses-burlesque-dance-basque-silver-4332144176'),
('9d368368-12e9-4d61-9a5d-2ba9c4508861'::uuid,'2026-09-18T13:47:08.788447+00:00'::timestamptz,'/shop/gold-warrior-leather-armor-set-festival-amazon-costume-set-4484819335'),
('9d6047ad-406d-4279-a10b-2918e111d587'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/red-devil-costume-set-bodysuit-forearm-armor-and-tail-unique-cosplay-party-wear-drag-queen-outfit-spine-tail-costume-leather-clothes-1779245327'),
('9e47719d-1afd-4298-808e-bacae86bbc38'::uuid,'2026-09-20T15:50:33.862541+00:00'::timestamptz,'/shop/gorgeus-gold-costume-set-mirror-leather-top-shoulders-basque-garters-metallic-fashion-harness-pole-dance-wear-unique-burlesque-clothing-4332886854'),
('a3aa7148-889a-42de-9d2d-2e0fca631ed4'::uuid,'2026-09-23T16:11:10.061039+00:00'::timestamptz,'/shop/golden-horns-cosplay-set-metallic-bodysuit-and-leg-covers-4462077381'),
('a3db3d94-aa6f-4d57-abce-905b31e14b4a'::uuid,'2026-09-20T16:40:44.040086+00:00'::timestamptz,'/shop/gold-goddess-armor-set-female-warrior-costume-fantasy-festival-outfit-futuristic-fashion-armor-unique-greek-inspired-look-4306378825'),
('a606be83-50aa-462d-ae54-04e9ce7aeb3b'::uuid,'2026-09-20T23:20:10.998932+00:00'::timestamptz,'/shop/punk-bodysuit-with-black-leather-gothic-costume-set-latex-body-suit-shoulders-headpiece-women-s-fetish-body-women-1866836527'),
('a6239781-34bb-42a1-85ae-91a733f7df65'::uuid,'2026-09-18T13:17:47.376053+00:00'::timestamptz,'/shop/holographic-leather-feather-top-skirt-sparkling-rave-outfit-iridescent-stage-costume-party-wear-bra-with-petals-showgirl-clothing-4332119985'),
('a6337955-4cb6-4270-8c0e-a178442350ac'::uuid,'2026-09-18T11:50:22.744097+00:00'::timestamptz,'/shop/metallic-futuristic-lingerie-set-sexy-festival-costume-set-pole-dance-wear-chrome-leather-clothing-women-for-cosmic-party-event-4327895836'),
('a6a81b75-c4a2-4b64-a2a9-48a221b08dc1'::uuid,'2026-09-20T16:40:44.040086+00:00'::timestamptz,'/shop/pink-rave-festival-outfit-for-desert-burning-man-party-4475237455'),
('a6beccc2-bbd3-4040-8e29-af06efd6dd97'::uuid,'2026-09-21T14:06:55.740589+00:00'::timestamptz,'/shop/fashion-armor-costume-set-with-metallic-corset-garters-leg-bracelet-drag-queen-futuristic-outfit-silver-cosplay-wear-1805788422'),
('a7109e93-df1f-43a6-bb6f-62bdf74e4c4f'::uuid,'2026-09-21T14:06:55.740589+00:00'::timestamptz,'/shop/metallic-angel-armour-costume-set-golden-shoulders-armor-arm-covers-cyber-punk-accessories-burning-man-costume-1904440029'),
('a74a2415-92a4-488c-b4d2-7bdeb601a0c4'::uuid,'2026-09-20T13:21:25.629016+00:00'::timestamptz,'/shop/golden-festival-horns-headpiece-drag-queen-costume-set-bodysuit-helmet-with-horns-metalic-leg-garters-body-chain-outfit-burning-man-4297325260'),
('a759b44e-1329-47a6-a444-0c9feabcc0ce'::uuid,'2026-09-21T13:28:18.678631+00:00'::timestamptz,'/shop/festival-couple-costume-set-futuristic-outfits-for-men-women-golden-leather-costume-burning-man-wear-metallic-rave-armor-4302158749'),
('a767a1c1-65e7-4c0a-bd18-7a92f8ea4986'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/golden-horns-costume-set-metallic-bodysuit-with-horns-and-leg-covers-for-cosplay-parties-shows-carnivals-performances-1780729637'),
('a83b1b51-79be-4cae-a943-661060a34080'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/cyberpunk-armor-set-arm-leg-covers-for-futuristic-cosplay-apocalyptic-robot-wear-metallic-cyborg-costume-for-festival-burning-man-1810806419'),
('a875757c-140d-4fea-83f9-93098406c3b1'::uuid,'2026-09-18T16:37:17.254821+00:00'::timestamptz,'/shop/silver-amazon-armor-costume-set-metallic-shoulder-arms-covers-futuristic-outfit-cosplay-accessories-burning-man-wear-sci-fi-look-4331275101'),
('a94b5c1b-3346-4868-b0f6-7a60d954530e'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/gold-warrior-armor-set-cosplay-headpiece-harness-top-shoulder-armor-leg-covers-festival-outfit-metallic-leather-performer-costume-1885178663'),
('a97ca78f-ed0d-4f17-a18d-8d54efd2679a'::uuid,'2026-09-20T17:37:25.429419+00:00'::timestamptz,'/shop/glamorous-rave-bodysuit-festival-woman-outfit-festival-costume-set-party-rave-clothing-women-pink-iridescent-bodysuit-festival-catsuit-1870586860'),
('a9f110dc-4ed4-454f-9e28-f67ca5a042e1'::uuid,'2026-09-21T14:06:55.740589+00:00'::timestamptz,'/shop/exclusive-dance-bodysuit-costume-set-women-s-futuristic-clothing-cosmic-fashion-outfit-unique-halloween-wear-gogo-pj-showgirl-4297324701'),
('a9fa4b69-4f79-4669-bd60-783a05d12296'::uuid,'2026-09-20T23:20:10.998932+00:00'::timestamptz,'/shop/unique-fashion-costume-set-with-golden-leather-top-and-skirt-for-stage-show-perofmance-clothing-for-women-party-wear-crop-top-gold-basque-1842964832'),
('abf11fbb-9794-484d-b93c-1449fa3a9a44'::uuid,'2026-09-20T21:17:46.829103+00:00'::timestamptz,'/shop/luxury-leather-set-of-metallic-belt-necklace-stylish-waist-belt-women-s-fashion-accessories-formal-corset-for-dress-chrome-choker-1830552273'),
('ad0e3743-70cf-4b59-9da6-88080d7f3651'::uuid,'2026-09-23T15:05:48.890681+00:00'::timestamptz,'/shop/holographic-feather-festival-outfit-stage-costume-set-4461233290'),
('adbb91ec-29d2-490f-9844-f73b22111e36'::uuid,'2026-09-18T13:48:20.431643+00:00'::timestamptz,'/shop/women-s-festival-fashion-set-for-burning-man-shoulders-top-skirt-4480909985'),
('afdb0aea-7a68-45e8-bbdb-5b7b03ec71ea'::uuid,'2026-09-23T15:05:48.890681+00:00'::timestamptz,'/shop/festival-outfit-with-top-shoulders-fringe-skirt-gold-metallic-harness-burning-man-clothing-4515171099'),
('b0b2a75c-f301-45d6-857c-dd6575862619'::uuid,'2026-09-20T20:45:44.472494+00:00'::timestamptz,'/shop/men-s-sci-fi-armor-outfit-futuristic-white-leather-costume-set-burning-man-wear-1890733162'),
('b18d342a-c323-4f11-8c98-d5eb5f543e12'::uuid,'2026-09-23T11:27:45.947097+00:00'::timestamptz,'/shop/gold-stage-costume-set-with-horns-headpiece-metallic-leather-bodysuit-leg-garters-show-party-outfit-women-s-peformance-clothing-1842478040'),
('b28d72d8-330b-400f-b595-124edc3f78f3'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/silver-festival-set-skirt-and-bra-metallic-outfit-for-women-sparkling-top-skirt-rave-wear-performance-clothing-unique-party-costume-1842881838'),
('b3910e41-9de7-483f-8d88-5783e8d90607'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/unique-cosmic-festival-outfit-metallic-top-panties-silver-female-armor-wear-set-for-rave-futuristic-top-cyber-punk-harness-1810445741'),
('b524764b-6dba-4c51-be55-f1ec92fc60cf'::uuid,'2026-09-20T15:50:33.862541+00:00'::timestamptz,'/shop/gold-amazon-armor-set-female-warrior-costume-fantasy-festival-outfit-cosplay-armored-body-plates-4369438053'),
('b5fbab09-1be1-439b-be72-582beceed09a'::uuid,'2026-09-20T17:37:25.429419+00:00'::timestamptz,'/shop/goddess-rave-outfit-fringe-skirt-harness-top-gold-metallic-festival-wear-for-burning-man-edm-party-look-futuristic-cleopatra-cosplay-4339552273'),
('b68d0386-ed1f-4410-8001-185bf3aaf25f'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/metallic-dragon-cosplay-set-headpiece-shoulders-spine-glove-women-s-mystical-costume-for-theme-party-outfit-luxury-fashion-wear-adult-1858744979'),
('b6e0171f-4d42-4d71-88b1-ee0d4e0e109e'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/apocalyptic-warrior-men-s-costume-burning-man-gold-armor-outfit-rave-festival-fashion-steampunk-leather-shoulders-futuristic-dune-wear-4348580005'),
('b6fe4fd9-400d-4fc4-a6e1-2e1dee936371'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/black-rave-wear-set-collar-skirt-top-slave-shorts-punk-chain-futuristic-bralette-festival-chain-1866805089'),
('b7003343-6537-437d-9dab-cdf902d37b7e'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/cyber-punk-festival-outfit-metallic-top-skirt-bracelet-silver-armor-set-for-rave-futuristic-wear-fashion-apocalyptic-clothes-for-women-1811780825'),
('b8ab6fa1-1af6-4c52-b6fb-5b766e6d99da'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/leather-kinky-outfit-with-harnesses-set-choker-chest-harness-leg-garter-men-s-body-strap-leather-punk-wear-sexy-bdsm-fetish-costume-male-1866844403'),
('b9a476c7-b902-4fea-bead-ec5b2275e835'::uuid,'2026-09-23T11:27:45.947097+00:00'::timestamptz,'/shop/mirror-bunny-mask-adult-reflective-outfit-with-rabbit-mask-mirror-corset-over-knee-boots-stage-costume-performance-dance-show-girl-outfit-1899491479'),
('b9e7bdbd-1edd-41c5-af9e-8f3799469715'::uuid,'2026-09-21T13:28:18.678631+00:00'::timestamptz,'/shop/futuristic-silver-dance-set-festival-wear-for-rave-edc-burning-man-outfit-exotic-stripper-robot-showgirl-costume-metallic-party-wear-1899282209'),
('bc59df1d-edd3-4e63-9393-175c28d9be2b'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/futuristic-festival-costume-for-burning-man-outfit-mask-shoulder-top-skirt-bracelet-white-silver-leather-armor-wear-cyber-punk-suit-1877356645'),
('bffb3644-a34d-437d-accc-4a661d1cac6f'::uuid,'2026-09-18T17:39:45.172643+00:00'::timestamptz,'/shop/white-rave-outfit-festival-leather-shoulders-rave-open-skirt-cyber-punk-wear-burning-man-clothing-for-women-latex-armor-accessories-4343466307'),
('c35b5b75-7e6e-492b-9528-6a126384086e'::uuid,'2026-09-18T11:21:13.256957+00:00'::timestamptz,'/shop/holographic-festival-feather-top-skirt-burning-man-clotging-sparkling-rave-outfit-iridescent-costume-party-bodysuit-with-petals-1887390026'),
('c3f1018e-665b-44a8-90db-ecc5bb64eedc'::uuid,'2026-09-20T19:34:01.36441+00:00'::timestamptz,'/shop/leather-harness-set-top-harness-garters-women-s-body-strap-leather-fetish-bondage-costume-full-body-belt-outfit-for-kinky-1865008271'),
('c40e0895-a55a-4825-9592-cf6c23a14fe7'::uuid,'2026-09-18T17:39:45.172643+00:00'::timestamptz,'/shop/holographic-festival-outfit-with-top-shoulders-skirt-iridescent-costume-set-rave-wear-unique-festival-harness-party-clothing-women-4321610013'),
('c52eafde-baaa-44ec-8729-c54e6c2f5706'::uuid,'2026-09-18T13:47:08.788447+00:00'::timestamptz,'/shop/men-s-outfit-for-burning-man-desert-warrior-costume-rave-festival-fashion-steampunk-leather-shoulder-dune-armor-wear-space-cowboy-4352810754'),
('c661cd70-55e4-445e-97ab-591e22d02221'::uuid,'2026-09-21T16:19:29.820811+00:00'::timestamptz,'/shop/futuristic-warrior-cosplay-costume-set-headpiece-wings-bodysuit-bracelets-leg-covers-cyber-punk-armor-outfit-burning-man-costume-1887136618'),
('c7b07eb1-d003-471b-a3f9-40b1c98edc19'::uuid,'2026-09-20T22:04:21.616961+00:00'::timestamptz,'/shop/gold-women-s-costume-set-for-performance-mirror-cat-mask-top-belt-jewelry-luxury-leather-clothes-adult-4375406395'),
('c9ec5047-d7ca-4a97-9247-8d3fb56a3953'::uuid,'2026-09-20T17:37:25.429419+00:00'::timestamptz,'/shop/mirror-bunny-costume-set-golden-breastplate-mask-and-skirt-with-chains-performers-clothing-artists-outfits-theme-party-costume-dance-wear-1773779110'),
('ca291096-219d-4269-981c-97f6929da308'::uuid,'2026-09-20T17:06:42.103675+00:00'::timestamptz,'/shop/gold-festival-armor-lingerie-set-burlesque-fashion-performance-outfit-for-stage-drag-queen-costume-celebrity-showwear-showgirl-costume-4317053177'),
('ca33ac05-47a1-49c8-9782-a78e0fa552b9'::uuid,'2026-09-23T15:05:48.890681+00:00'::timestamptz,'/shop/gold-festival-outfit-harness-top-and-open-skirt-women-s-rave-wear-4365765560'),
('cb31d61b-027c-4c47-b7ba-bf16283ada9c'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/red-leather-devil-cosplay-luxury-latex-halloween-outfit-with-fashion-armor-shoudelrs-bodysuit-gloves-spine-tail-1804455423'),
('ce899f23-b983-4ede-ae81-3348757b1c15'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/burning-man-costume-set-with-bracelet-armor-shoulder-harness-garters-silver-rave-outfit-women-cyberpunk-accessories-metallic-wear-1842725537'),
('d0625355-308f-4edd-9c28-e358491c12a3'::uuid,'2026-09-23T17:08:48.855885+00:00'::timestamptz,'/shop/carnival-dress-with-mask-top-skirt-bracelets-women-s-costume-for-show-silver-clothing-for-performances-metallic-dance-set-burlesque-wear-1859300877'),
('d06ab9d9-52c5-4f8c-b583-d9e5316eb69c'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/space-themed-metallic-clothing-set-golden-top-skirt-choker-and-bracers-for-cosmic-cosplay-futuristic-costume-gold-robot-outfit-1786396925'),
('d17c17b6-76dd-429d-bf5c-ccd432cd1e0f'::uuid,'2026-09-20T19:34:01.36441+00:00'::timestamptz,'/shop/golden-futurystic-skeleton-costume-spine-tail-accessories-body-chain-jewerly-1845559538'),
('d2a3b40c-fd74-4e25-93f5-cfce92b2d88b'::uuid,'2026-09-18T16:37:17.254821+00:00'::timestamptz,'/shop/futuristic-desert-outfit-cosmic-costume-festival-armor-wear-burning-man-clothing-chrome-female-warrior-cosplay-metallic-accessories-4337230946'),
('d42b9d73-1327-49fa-bfab-9a732b133772'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/best-festival-armor-outfit-leather-shoulders-skirt-gold-metallic-harness-rave-armor-wear-burning-man-clothing-festival-accessories-4340584466'),
('dc6e07c7-f758-4a6c-8f09-fa3f2d9f99cc'::uuid,'2026-09-18T14:30:11.31377+00:00'::timestamptz,'/shop/festival-outfit-for-women-rave-top-with-shoulders-and-belt-robot-costume-burning-man-clothes-set-4373111053'),
('dcd0d24a-473b-4592-b56f-466fda984b1e'::uuid,'2026-09-18T14:59:59.444498+00:00'::timestamptz,'/shop/gold-performance-costume-set-exclusive-event-party-stagewear-with-top-belt-cuffs-luxury-showgirl-outfit-4373496299'),
('de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/deluxe-leather-harness-for-men-best-groomsmen-gift-vintage-brown-leather-harness-men-s-wedding-accessories-handmade-chest-harness-1871310023'),
('df030151-5853-46c1-be89-06f059224a44'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/fashion-dancer-costume-set-mirror-bodysuit-over-the-knee-boots-for-stage-shows-performance-and-parties-1797355053'),
('df2227dc-3d74-4b19-848f-f9210e46dccd'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/best-futuristic-costume-set-festival-armored-outfit-gold-metallic-rave-wear-cosmic-fashion-clothing-cyber-armor-burning-man-party-wear-4395225905'),
('dfd36bcb-88f9-40fb-95c9-8e6e4c609fdd'::uuid,'2026-09-23T16:11:10.061039+00:00'::timestamptz,'/shop/holographic-rave-outfit-with-top-shoulders-fringe-skirt-futuristic-harness-fashion-burning-man-wear-festival-accessories-1887400834'),
('e01ef0b1-6155-4d02-a3cd-413d272502b3'::uuid,'2026-09-18T11:50:22.744097+00:00'::timestamptz,'/shop/futuristic-stripper-outfit-chrome-skirt-top-bracelets-pole-dance-wear-silver-dancer-costume-gogo-showgirl-performance-clothing-4297340346'),
('e247cf0a-cea9-4570-ab68-c8a5505a7845'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/chrome-futuristic-costume-set-festival-outfit-showgirl-wear-silver-cosmic-outfit-dance-carnival-clothing-1879309908'),
('e2d129b4-eb97-4ab4-ad6b-dfaef040b5fa'::uuid,'2026-09-20T15:50:33.862541+00:00'::timestamptz,'/shop/men-s-white-angel-armor-outfit-futuristic-leather-harness-costume-pride-festival-wear-pole-dance-stage-clothing-4364725679'),
('e39f9164-4001-4f63-9407-a1ddd3d962dd'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/cyberpunk-mirror-armor-costume-bodysuit-leg-covers-metallic-cyborg-cosplay-outfit-for-showgirl-performances-apocalyptic-robot-wear-1792447742'),
('e46d7064-6d80-42db-b321-beb8bbdccc69'::uuid,'2026-09-18T11:50:22.744097+00:00'::timestamptz,'/shop/silver-gogo-dress-women-s-futuristic-outfit-chrome-skirt-and-top-pole-dance-wear-metallic-dance-costume-showgirl-performance-clothing-4397331078'),
('e51e0a66-8358-41f9-bd51-2ab4833b24b3'::uuid,'2026-09-20T20:45:44.472494+00:00'::timestamptz,'/shop/men-s-cyberpunk-captain-armor-chrome-leather-costume-set-cosmic-warrior-cosplay-burning-man-armour-outfit-futuristic-apocaliptyc-wear-4364292059'),
('e7238b1d-565c-4c4d-a7ae-a4402de80720'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/red-dance-costume-set-bodysuit-skirt-leg-covers-spine-tail-for-futuristic-clothes-dance-fashion-outfit-gogo-pj-costume-for-women-1804847653'),
('ea365de7-a807-40a1-abb4-374d9df7f156'::uuid,'2026-09-18T13:17:47.376053+00:00'::timestamptz,'/shop/golden-armor-costume-set-with-shoulder-and-leg-covers-metallic-leather-skirt-bracelets-shows-costume-for-carnivals-wear-performances-4328144233'),
('ec204df6-13b6-4deb-b493-04391501d72d'::uuid,'2026-09-20T22:04:21.616961+00:00'::timestamptz,'/shop/futuristic-female-warrior-costume-set-metallic-shoulder-top-bra-belt-garters-arms-covers-silver-armor-outfit-festival-burning-man-wear-4331115124'),
('edc709f1-3a74-43d6-bd00-6c0569392f1b'::uuid,'2026-09-18T14:59:59.444498+00:00'::timestamptz,'/shop/silver-futuristic-dress-women-s-cosmic-costume-sci-fi-clothes-accessories-4507119072'),
('f012a88f-44db-4e17-ba57-7f60bb7b5719'::uuid,'2026-09-21T16:19:29.820811+00:00'::timestamptz,'/shop/festival-couple-costume-set-futuristic-rave-outfits-for-men-women-burning-man-wear-4488185754'),
('f0e73d70-cf3d-4557-8d59-142c78a106ac'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/purpure-costume-set-rave-punk-glamour-top-and-skirt-for-music-party-outfit-women-s-clothing-foor-event-futuristic-leather-clothes-1861254697'),
('f27fdb4d-d007-4d4c-899c-a50728c1ea4d'::uuid,'2026-09-20T21:17:46.829103+00:00'::timestamptz,'/shop/silver-futuristic-costume-set-festival-armored-outfit-metallic-rave-wear-cosmic-fashion-clothing-cyber-armor-chrome-party-wear-4395263984'),
('f36acd08-1591-4e15-8ad2-96bc22ec4b77'::uuid,'2026-09-20T21:43:03.21038+00:00'::timestamptz,'/shop/futuristic-metallic-corset-chrome-chest-armor-for-women-festival-outfit-cyper-punk-breastplate-cosmic-overbust-corset-silver-bodysuit-1870629554'),
('f3d4bdd8-9ba0-400b-9cfc-e4a8097707fc'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/chrome-stage-armor-lingerie-set-burlesque-fashion-performance-outfit-futuristic-drag-queen-costume-celebrity-show-wear-showgirl-costume-4331068085'),
('f3f7a334-3b77-44ce-bb2a-b0daff184ab1'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/brutal-leather-harness-set-choker-top-harness-leg-garter-men-s-chest-harness-leather-kinky-wear-for-men-fetish-clothing-male-1844501236'),
('f44cb59b-1632-4c86-b376-8afd205a6e63'::uuid,'2026-09-20T13:21:25.629016+00:00'::timestamptz,'/shop/gladiator-cosplay-costume-set-men-s-armor-outfit-desert-warrior-wear-golden-leather-shoulders-skirt-for-men-futuristic-male-armor-4352690758'),
('f473fb62-0440-473c-a7fb-a52dccafebc6'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/red-burlesque-dress-with-spine-tail-outrageous-costume-showgirl-theme-party-wear-for-women-drag-queen-outfit-fashion-leather-armor-1867311867'),
('f6b85532-eae2-4036-badc-401141c2ad6e'::uuid,'2026-09-18T12:36:15.466691+00:00'::timestamptz,'/shop/futuristic-festival-costume-for-burning-man-outfit-mask-shoulders-top-skirt-bracers-leather-cyber-punk-armor-4389402669'),
('f746beae-43c9-4f4f-8307-301d136eda58'::uuid,'2026-09-20T17:06:42.103675+00:00'::timestamptz,'/shop/desert-warrior-men-s-costume-burning-man-gold-armor-outfit-steampunk-leather-shoulders-arm-futuristic-dune-wear-4489659396'),
('f81adf93-49a7-489c-b3a8-02520accce59'::uuid,'2026-09-18T12:36:15.466691+00:00'::timestamptz,'/shop/rave-cosplay-outfit-with-bodysuit-arm-covers-leather-armor-wear-burning-man-costume-set-women-futuristic-desert-suit-luxury-dune-wear-4331805551'),
('f86a13ec-184e-4764-9813-33b18db7dbb3'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/chrome-festival-outfit-metallic-top-skirt-silver-armor-set-for-burning-rave-wear-costume-alien-gear-futuristic-outfit-cyber-punk-1857311511'),
('f96bb86c-43aa-49c1-a718-41fbe050a1ac'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/silver-metallic-costume-set-rave-outfit-futuristic-alien-clothes-1818587058'),
('f972aed2-6061-4973-8b20-8e1d2c362d77'::uuid,'2026-09-18T17:39:45.172643+00:00'::timestamptz,'/shop/dance-costume-set-gold-leather-top-with-shoulders-and-skirt-futuristic-party-clothes-fashion-showgirl-outfit-gogo-pj-stage-perfotmance-4366965769'),
('fba170e8-582d-45fa-b954-f9136e733950'::uuid,'2026-09-20T22:04:21.616961+00:00'::timestamptz,'/shop/fashion-set-necklace-corset-skirt-for-stage-performance-wear-metalic-underbust-corset-leather-corset-dress-luxury-clothes-accessories-1859735365'),
('fdd42158-087b-4190-9eb8-fda7f7460258'::uuid,'2026-09-20T19:34:01.36441+00:00'::timestamptz,'/shop/unique-silver-futuristic-bra-panty-set-female-armor-festival-outfit-metallic-rave-costume-exotic-dancewear-clubwear-stripper-clothes-1899259529'),
('fefd1c3e-2fd1-47c9-970f-c30962c1a737'::uuid,'2026-09-23T11:27:45.947097+00:00'::timestamptz,'/shop/festival-couple-costume-set-gold-futuristic-rave-outfits-for-men-women-burning-man-wear-4488971627'),
('ff0996b6-f369-4313-baf5-2d465d9c06f2'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/cyber-punk-costume-set-leather-armor-outfit-mad-max-gear-post-apocalyptic-wear-cosmic-festival-burning-man-accessories-1851558122'),
('ffa74da5-c2e1-4c3a-b460-50d1aae09f56'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/exclusive-dance-costume-set-fashion-bodysuit-over-knee-boots-for-stage-shows-performance-costumes-dancers-leg-covers-party-outfit-1890709428'),
('ffbf1db6-6fae-4606-afbe-013415d6421d'::uuid,'2026-09-18T11:10:41.929629+00:00'::timestamptz,'/shop/gold-fringe-harness-set-top-and-skirt-unique-festival-clothing-fashion-rave-outfit-metallic-leather-costume-performance-wear-1884437291')
)
update public.feya_storefront_approved_product_bindings_v1 b
set draft_updated_at_snapshot=e.draft_updated_at_snapshot,
    url_path_snapshot=e.url_path_snapshot
from expected e
where b.canonical_product_id=e.canonical_product_id
  and b.source_release_ref='feya-review-207-20260924';

alter table public.feya_storefront_approved_product_bindings_v1
  alter column draft_updated_at_snapshot set not null,
  alter column url_path_snapshot set not null;

create unique index if not exists feya_storefront_approved_binding_url_key
  on public.feya_storefront_approved_product_bindings_v1(url_path_snapshot);

create or replace view public.feya_storefront_product_cards_v1
with (security_invoker=true) as
with membership_labeled as (
  select
    mi.canonical_product_id,
    case p.url_path
      when '/collections/shoulder-armor' then 'SHOULDER_ARMOR'
      when '/collections/festival-outfits' then 'FESTIVAL_OUTFITS'
      when '/collections/rave-outfits' then 'RAVE_OUTFITS'
      when '/collections/burning-man-looks' then 'BURNING_MAN_OUTFITS'
      when '/collections/stage-outfits' then 'PERFORMANCE_COSTUMES'
      when '/collections/bodysuits' then 'COSTUME_BODYSUITS'
      when '/collections/costume-masks' then 'COSTUME_MASKS'
      when '/collections/costume-headpieces' then 'COSTUME_HEADPIECES'
      when '/collections/festival-skirts' then 'FESTIVAL_SKIRTS'
      when '/collections/costume-belts' then 'COSTUME_BELTS'
      else null
    end as membership_code
  from public.feya_search_membership_items_v1 mi
  join public.feya_search_membership_snapshots_v1 ms
    on ms.membership_snapshot_id=mi.membership_snapshot_id
  join public.feya_commerce_seo_pages_v1 p
    on p.seo_page_id=ms.seo_page_id
  where ms.source_revision='feya-review-207-20260924|approved-seo-pack-current|phase-d-20260926'
    and mi.eligibility_status='eligible'
    and mi.orderability_status='confirmed'
),
membership_codes as (
  select canonical_product_id,
         array_agg(distinct membership_code order by membership_code)
           filter(where membership_code is not null) as membership_codes
  from membership_labeled
  group by canonical_product_id
),
facet_meta as (
  select facet_snapshot_id,facet_contract_version,snapshot_hash
  from public.feya_storefront_facet_snapshots_v1
  where snapshot_code='feya-n7-20260928-v3'
    and snapshot_status='PREVIEW'
    and product_count=207
)
select
  s.canonical_product_id,
  s.seo_page_id,
  s.draft_id as source_draft_id,
  s.content_sha256 as approved_content_sha256,
  s.source_release_ref,
  s.product_slug,
  s.card_title,
  s.h1,
  s.seo_title,
  s.meta_description,
  s.product_type,
  s.material,
  s.color,
  s.currency,
  s.primary_image_url,
  s.primary_image_alt,
  s.secondary_image_url,
  s.hover_image_url,
  s.video_url,
  s.has_video,
  s.media_count,
  s.min_price,
  s.max_price,
  s.card_display_price_amount,
  s.category_label,
  s.world_label,
  s.canonical_color_label,
  s.color_options,
  fi.parent_components_json,
  fi.child_components_json,
  fi.component_groups_json,
  fi.component_values_json,
  fi.sellable_component_values_json,
  fi.event_values_json,
  fi.style_values_json,
  fi.persona_values_json,
  fi.audience_values_json,
  fi.material_values_json,
  coalesce(mc.membership_codes,array[]::text[]) as membership_codes,
  fm.facet_contract_version,
  fm.snapshot_hash as facet_snapshot_hash
from public.feya_storefront_product_card_snapshots_v1 s
join public.feya_storefront_approved_product_bindings_v1 b
  on b.canonical_product_id=s.canonical_product_id
 and b.seo_page_id=s.seo_page_id
 and b.draft_id=s.draft_id
 and b.content_sha256=s.content_sha256
 and b.product_slug_snapshot=s.product_slug
join public.feya_commerce_seo_pack_drafts_v1 d
  on d.id=s.draft_id
 and d.canonical_product_id=s.canonical_product_id
 and d.status='approved_draft'
 and d.review_status='approved'
 and d.archived_at is null
 and d.updated_at=b.draft_updated_at_snapshot
join public.feya_commerce_seo_pages_v1 sp
  on sp.seo_page_id=s.seo_page_id
 and sp.canonical_product_id=s.canonical_product_id
 and sp.page_type='product'
 and sp.portfolio_status='active'
 and sp.lifecycle_state not in ('retired','archived','deleted')
 and sp.url_path=b.url_path_snapshot
join public.feya_commerce_product_drafts pd
  on pd.canonical_product_id=s.canonical_product_id
 and coalesce(pd.do_not_publish_flag,false)=false
join public.feya_commerce_v_step7_storefront_products_api_v4 live
  on live.canonical_product_id=s.canonical_product_id
 and live.product_slug=s.product_slug
cross join facet_meta fm
join public.feya_storefront_facet_items_v1 fi
  on fi.facet_snapshot_id=fm.facet_snapshot_id
 and fi.canonical_product_id=s.canonical_product_id
left join membership_codes mc
  on mc.canonical_product_id=s.canonical_product_id;

revoke all on public.feya_storefront_product_cards_v1 from public,anon,authenticated,service_role;
grant select on public.feya_storefront_product_cards_v1 to service_role;

do $$
declare v_count integer;
begin
  select count(*) into v_count from public.feya_storefront_product_cards_v1;
  if v_count<>207 then raise exception 'FEYA_CARD_EXACT_IDENTITY_COUNT_MISMATCH:%',v_count; end if;
end $$;
