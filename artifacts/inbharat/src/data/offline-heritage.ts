import type { HeritageSpot, HeritageSummary, ListHeritageSpotsParams, ListVillagesParams, Village } from '@workspace/api-client-react';

const previewImage = `${import.meta.env.BASE_URL}village-dawn.jpg`;

export const OFFLINE_SPOTS: HeritageSpot[] = [
  { id: 'sample-kundadri-jain-temple', title: 'Kundadri Hill Jain Temple', villageName: 'Kundadri', district: 'Shivamogga', state: 'Karnataka', category: 'Mandir (Temples)', description: 'Offline preview entry for the hilltop Jain temple and its forest setting. Confirm visitor details with local custodians.', imageUrl: previewImage, upvotes: 0, latitude: 13.85, longitude: 75.23 },
  { id: 'sample-konark-sun-temple', title: 'Konark Sun Temple', villageName: 'Konark', district: 'Puri', state: 'Odisha', category: 'Mandir (Temples)', description: 'Offline preview entry for the 13th-century Sun Temple. Add locally verified visiting notes when the community contributes.', imageUrl: previewImage, upvotes: 0, latitude: 19.8876, longitude: 86.0945 },
  { id: 'sample-chitrakote-falls', title: 'Chitrakote Falls River Bend', villageName: 'Chitrakote', district: 'Bastar', state: 'Chhattisgarh', category: 'Picnic Spots', description: 'Offline preview for the waterfall viewpoint. Check local guidance and seasonal access before travelling.', imageUrl: previewImage, upvotes: 0, latitude: 19.2, longitude: 81.7 },
  { id: 'sample-mawlynnong-root-bridge', title: 'Mawlynnong Living Root Bridge Walk', villageName: 'Mawlynnong', district: 'East Khasi Hills', state: 'Meghalaya', category: 'Picnic Spots', description: 'Offline preview for a village walk among living root bridges. Respect community guidance and the surrounding forest.', imageUrl: previewImage, upvotes: 0, latitude: 25.2, longitude: 91.91 },
  { id: 'sample-sanchi-stupa-path', title: 'Sanchi Stupa Village Path', villageName: 'Sanchi', district: 'Raisen', state: 'Madhya Pradesh', category: 'History', description: 'Offline preview for the historic Buddhist monument complex and its surrounding village landscape.', imageUrl: previewImage, upvotes: 0, latitude: 23.486, longitude: 77.737 },
  { id: 'sample-hampi-stone-chariot', title: 'Hampi Stone Chariot', villageName: 'Hampi', district: 'Vijayanagara', state: 'Karnataka', category: 'History', description: 'Offline preview for the celebrated stone chariot in the Hampi monument landscape.', imageUrl: previewImage, upvotes: 0, latitude: 15.335, longitude: 76.46 },
  { id: 'sample-birsa-munda-walk', title: 'Birsa Munda Memorial Walk', villageName: 'Ulihatu', district: 'Khunti', state: 'Jharkhand', category: 'Local Heroes', description: 'Offline preview recognizing Birsa Munda’s birthplace. Add a locally recorded account to complete this community story.', imageUrl: previewImage, upvotes: 0, latitude: 23.14, longitude: 85.19 },
  { id: 'sample-alluri-memory-trail', title: 'Alluri Sitarama Raju Memory Trail', villageName: 'Mogallu', district: 'West Godavari', state: 'Andhra Pradesh', category: 'Local Heroes', description: 'Offline preview about freedom fighter Alluri Sitarama Raju. Local memories and exact routes should be community-verified.', imageUrl: previewImage, upvotes: 0, latitude: 16.78, longitude: 81.58 },
  { id: 'sample-khasi-audio-story', title: 'Khasi greetings · audio story', villageName: 'Mawlynnong', district: 'East Khasi Hills', state: 'Meghalaya', category: 'Dialect Audio Stories', description: 'Offline preview placeholder. A verified Khasi greeting recording can be added by a local storyteller.', imageUrl: previewImage, upvotes: 0, latitude: 25.2, longitude: 91.91 },
  { id: 'sample-angami-audio-story', title: 'Angami proverbs · audio story', villageName: 'Khonoma', district: 'Kohima', state: 'Nagaland', category: 'Dialect Audio Stories', description: 'Offline preview placeholder. A verified Angami proverb recording can be added by a local storyteller.', imageUrl: previewImage, upvotes: 0, latitude: 25.65, longitude: 94.01 },
];

export const OFFLINE_VILLAGES: Village[] = [
  { id: 'sample-village-kundadri', name: 'Kundadri', district: 'Shivamogga', state: 'Karnataka', tehsil: 'Thirthahalli', description: 'Offline sample village record.', imageUrl: previewImage, spotCount: 1 },
  { id: 'sample-village-konark', name: 'Konark', district: 'Puri', state: 'Odisha', tehsil: null, description: 'Offline sample village record.', imageUrl: previewImage, spotCount: 1 },
  { id: 'sample-village-chitrakote', name: 'Chitrakote', district: 'Bastar', state: 'Chhattisgarh', tehsil: 'Jagdalpur', description: 'Offline sample village record.', imageUrl: previewImage, spotCount: 1 },
  { id: 'sample-village-mawlynnong', name: 'Mawlynnong', district: 'East Khasi Hills', state: 'Meghalaya', tehsil: 'Pynursla', description: 'Offline sample village record.', imageUrl: previewImage, spotCount: 2 },
  { id: 'sample-village-sanchi', name: 'Sanchi', district: 'Raisen', state: 'Madhya Pradesh', tehsil: null, description: 'Offline sample village record.', imageUrl: previewImage, spotCount: 1 },
  { id: 'sample-village-hampi', name: 'Hampi', district: 'Vijayanagara', state: 'Karnataka', tehsil: 'Hosapete', description: 'Offline sample village record.', imageUrl: previewImage, spotCount: 1 },
  { id: 'sample-village-ulihatu', name: 'Ulihatu', district: 'Khunti', state: 'Jharkhand', tehsil: 'Murhu', description: 'Offline sample village record.', imageUrl: previewImage, spotCount: 1 },
  { id: 'sample-village-mogallu', name: 'Mogallu', district: 'West Godavari', state: 'Andhra Pradesh', tehsil: null, description: 'Offline sample village record.', imageUrl: previewImage, spotCount: 1 },
  { id: 'sample-village-khonoma', name: 'Khonoma', district: 'Kohima', state: 'Nagaland', tehsil: null, description: 'Offline sample village record.', imageUrl: previewImage, spotCount: 1 },
];

export const OFFLINE_SUMMARY: HeritageSummary = {
  spotCount: OFFLINE_SPOTS.length,
  villageCount: OFFLINE_VILLAGES.length,
  totalUpvotes: OFFLINE_SPOTS.reduce((total, spot) => total + spot.upvotes, 0),
};

const normalized = (value: string) => value.trim().toLocaleLowerCase();
const villageKey = (village: Pick<Village, 'name' | 'district' | 'state'>) =>
  `${normalized(village.name)}|${normalized(village.district)}|${normalized(village.state)}`;

export function offlineSpots(params: ListHeritageSpotsParams = {}): HeritageSpot[] {
  const term = normalized(params.search ?? '');
  const category = normalized(params.category ?? '');
  const matchingVillages = new Set(
    OFFLINE_VILLAGES
      .filter((village) => !term || [village.name, village.district, village.state, village.tehsil ?? ''].some((value) => normalized(value).includes(term)))
      .map(villageKey),
  );
  return OFFLINE_SPOTS
    .filter((spot) => !category || normalized(spot.category) === category)
    .filter((spot) =>
      !term ||
      [spot.title, spot.villageName, spot.district, spot.state, spot.category].some((value) => normalized(value).includes(term)) ||
      matchingVillages.has(villageKey(spot)),
    )
    .slice(0, params.limit ?? 24);
}

export function offlineVillages(params: ListVillagesParams = {}): Village[] {
  const term = normalized(params.search ?? '');
  return OFFLINE_VILLAGES
    .filter((village) =>
      !term || [village.name, village.district, village.state, village.tehsil ?? ''].some((value) => normalized(value).includes(term)),
    )
    .slice(0, params.limit ?? 40);
}

export function isOfflinePreview(id: string): boolean {
  return id.startsWith('sample-') || id.startsWith('local-');
}
