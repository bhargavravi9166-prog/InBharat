import { createContext, type FormEvent, type ReactNode, useContext, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowRight, AudioLines, Award, Compass, Heart, Landmark, Leaf, LoaderCircle,
  Map, MapPin, Navigation, Plus, Search, Send, Sparkles, Star, ThumbsUp, Users, X
} from 'lucide-react';
import {
  getGetHeritageSummaryQueryKey, getListHeritageSpotsQueryKey,
  getListVillagesQueryKey, useCreateHeritageSpot, useGetHeritageSummary,
  useListHeritageSpots, useListVillages, useUpvoteHeritageSpot
} from '@workspace/api-client-react';
import type { HeritageSpot, HeritageSpotInput, Village } from '@workspace/api-client-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { OFFLINE_SUMMARY, isOfflinePreview, offlineSpots, offlineVillages } from '@/data/offline-heritage';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } });
const POINTS_KEY = 'inbharat:community-points';
const PointsContext = createContext({ points: 50, award: (_amount: number) => {} });

function PointsProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState(() => {
    try {
      const stored = window.localStorage.getItem(POINTS_KEY);
      if (stored === null) return 50;
      const saved = Number(stored);
      return Number.isSafeInteger(saved) && saved >= 0 ? saved : 50;
    } catch {
      return 50;
    }
  });
  const award = (amount: number) => setPoints((current) => {
    const next = current + amount;
    try { window.localStorage.setItem(POINTS_KEY, String(next)); } catch { /* Keep the current session usable if storage is blocked. */ }
    return next;
  });
  return <PointsContext.Provider value={{ points, award }}>{children}</PointsContext.Provider>;
}

function usePoints() {
  return useContext(PointsContext);
}

const categories = [
  { label: 'Mandir (Temples)', icon: Landmark },
  { label: 'Picnic Spots', icon: Leaf },
  { label: 'History', icon: Map },
  { label: 'Local Heroes', icon: Award },
  { label: 'Dialect Audio Stories', icon: AudioLines },
];
const navItems = [
  { href: '/', label: 'Home', icon: Compass },
  { href: '/villages', label: 'Explore Villages', icon: MapPin },
  { href: '/add-spot', label: 'Add New Spot', icon: Plus },
  { href: '/community', label: 'Community', icon: Users },
  { href: '/profile', label: 'Profile', icon: Heart },
];

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><Landmark size={19} strokeWidth={1.6} /></span>;
}

function Layout({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const { points } = usePoints();
  const activeHref = path.split('?')[0];
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand" data-testid="link-brand"><BrandMark /><span className="brand-name">INBHARAT<span className="brand-sub">Living heritage, shared</span></span></Link>
      <p className="side-label">Discover</p>
      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${activeHref === href ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></Link>)}
      </nav>
      <div className="sidebar-note"><span className="note-kicker">A local way to wander</span><p>Every village has a story waiting to be heard.</p></div>
    </aside>
    <div className="main-area">
      <header className="topbar">
        <Link href="/" className="mobile-brand" data-testid="link-mobile-brand"><BrandMark /><span>INBHARAT</span></Link>
        <div className="topbar-right">
          <Link href="/profile" className="points-pill" data-testid="link-points"><Star size={14} fill="currentColor" /> {points} Pts</Link>
          <Link href="/profile" className="profile-button" data-testid="link-profile-top"><span className="avatar">V</span><span className="profile-meta"><strong>Local visitor</strong><span>Village explorer</span></span></Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
    <nav className="mobile-bottom" aria-label="Mobile navigation">
      {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`mobile-nav-link ${activeHref === href ? 'active' : ''}`} data-testid={`mobile-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={19} strokeWidth={1.8} /><span>{label === 'Explore Villages' ? 'Villages' : label === 'Add New Spot' ? 'Add spot' : label}</span></Link>)}
    </nav>
  </div>;
}

function useNotice() {
  const [notice, setNotice] = useState('');
  const show = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };
  return { notice, show };
}

function Notice({ text }: { text: string }) {
  return text ? <div className="toast-message" role="status">{text}</div> : null;
}

function Eyebrow({ children }: { children: ReactNode }) { return <div className="eyebrow">{children}</div>; }

function LoadingCards() {
  return <div className="spot-grid" aria-label="Loading heritage spots">{[0, 1, 2].map((item) => <div key={item} className="skeleton skeleton-card" />)}</div>;
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="state-box"><Sparkles size={22} strokeWidth={1.6} /><h3>{title}</h3><p>{description}</p>{action}</div>;
}

function ErrorState({ retry, message }: { retry: () => void; message?: string }) {
  return <div className="state-box" role="alert"><X size={21} /><h3>We couldn’t reach the village just now</h3><p>{message || 'Your guide is still here. Check your connection and try loading these stories again.'}</p><button className="outline-button" onClick={retry} data-testid="button-retry">Try again</button></div>;
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : '';
}

function SpotCard({ spot, onUpvote, voting }: { spot: HeritageSpot; onUpvote: (spot: HeritageSpot) => void; voting: boolean }) {
  const preview = isOfflinePreview(spot.id);
  return <article className="spot-card" data-testid={`card-spot-${spot.id}`}>
    <div className="spot-image">{spot.imageUrl ? <img src={spot.imageUrl} alt={spot.title} loading="lazy" /> : <div className="spot-image-placeholder" aria-label="No photo available"><Landmark size={30} strokeWidth={1.2} /></div>}
      <span className="spot-category">{spot.category}</span>
    </div>
    <div className="spot-body">
      <h3>{spot.title}</h3>
      <div className="spot-location"><MapPin size={12} />{spot.villageName}, {spot.district}, {spot.state}</div>
      <p className="spot-desc">{spot.description || 'A place remembered and shared by people who know this village best.'}</p>
      <div className="spot-footer"><small>{preview ? 'Offline sample' : 'Shared by the community'}</small><button className="upvote-button" onClick={() => onUpvote(spot)} disabled={voting} aria-label={`Upvote ${spot.title}`} data-testid={`button-upvote-${spot.id}`}><ThumbsUp size={13} />{voting ? 'Saving' : spot.upvotes}</button></div>
    </div>
  </article>;
}

function Stats({ spotCount, villageCount, totalUpvotes, loading }: { spotCount?: number; villageCount?: number; totalUpvotes?: number; loading: boolean }) {
  return <div className="stat-strip" data-testid="heritage-summary">
    <div className="stat-item"><strong>{loading ? '—' : (spotCount ?? 0).toLocaleString('en-IN')}</strong><span>Places remembered</span></div>
    <div className="stat-item"><strong>{loading ? '—' : (villageCount ?? 0).toLocaleString('en-IN')}</strong><span>Villages explored</span></div>
    <div className="stat-item"><strong>{loading ? '—' : (totalUpvotes ?? 0).toLocaleString('en-IN')}</strong><span>Community nods</span></div>
  </div>;
}

function CategoryBar({ selected, onSelect, includeAll = true }: { selected: string; onSelect: (category: string) => void; includeAll?: boolean }) {
  return <div className="category-row" aria-label="Filter by heritage category">
    {includeAll && <button className={`category-chip ${selected === '' ? 'selected' : ''}`} onClick={() => onSelect('')} data-testid="filter-category-all">All places</button>}
    {categories.map(({ label, icon: Icon }) => <button key={label} className={`category-chip ${selected === label ? 'selected' : ''}`} onClick={() => onSelect(selected === label ? '' : label)} data-testid={`filter-category-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}><Icon size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />{label}</button>)}
  </div>;
}

function SpotResults({ spots, loading, error, message, retry, onUpvote, isVoting }: { spots?: HeritageSpot[]; loading: boolean; error: boolean; message?: string; retry: () => void; onUpvote: (spot: HeritageSpot) => void; isVoting: boolean }) {
  if (loading && spots === undefined) return <LoadingCards />;
  if (error && spots === undefined) return <ErrorState retry={retry} message={message} />;
  if (!spots?.length) return <EmptyState title="No shared places here yet" description="Be the first to add a mandir, memory, or local story from this part of Bharat." action={<Link href="/add-spot" className="primary-button" data-testid="link-empty-add">Share a place <ArrowRight size={14} /></Link>} />;
  const hasPreview = spots.some((spot) => isOfflinePreview(spot.id));
  return <>{hasPreview && <p className="offline-preview-note" role="status">Offline preview · sample cards appear when the live heritage service is unavailable.</p>}<div className="spot-grid">{spots.map((spot) => <SpotCard key={spot.id} spot={spot} onUpvote={onUpvote} voting={isVoting} />)}</div></>;
}

function Home() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const params = useMemo(() => ({ ...(selectedCategory ? { category: selectedCategory } : {}), ...(search.trim() ? { search: search.trim() } : {}), limit: 6 }), [selectedCategory, search]);
  const spotsQuery = useListHeritageSpots(params, { query: { queryKey: getListHeritageSpotsQueryKey(params), initialData: offlineSpots(params), initialDataUpdatedAt: 0 } });
  const summaryQuery = useGetHeritageSummary({ query: { initialData: OFFLINE_SUMMARY, initialDataUpdatedAt: 0 } });
  const villageParams = useMemo(() => ({ ...(search.trim() ? { search: search.trim() } : {}), limit: 6 }), [search]);
  const villageQuery = useListVillages(villageParams, { query: { queryKey: getListVillagesQueryKey(villageParams), enabled: search.trim().length > 0, initialData: offlineVillages(villageParams), initialDataUpdatedAt: 0 } });
  const upvote = useUpvoteHeritageSpot();
  const { notice, show } = useNotice();
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setSuggestOpen(false); setLocation(`/villages?search=${encodeURIComponent(search.trim())}`); };
  const vote = (spot: HeritageSpot) => upvote.mutate({ spotId: spot.id }, {
    onSuccess: () => { void qc.invalidateQueries({ queryKey: getListHeritageSpotsQueryKey() }); void qc.invalidateQueries({ queryKey: getGetHeritageSummaryQueryKey() }); show('Your nod has been added.'); },
    onError: () => show('Could not save your nod. Please try again.')
  });
  return <Layout><div className="page">
    <section className="hero">
      <div className="hero-content">
        <span className="hero-kicker"><Sparkles size={13} /> Stories from the heart of Bharat</span>
        <h1>Go beyond the road.<br />Meet the village.</h1>
        <p>Find the places, people, and spoken histories that rarely make it onto a map — shared by those who call these villages home.</p>
        <Link href="/villages" className="hero-cta" data-testid="link-explore-hero">Begin exploring <ArrowRight size={15} /></Link>
      </div>
    </section>
    <Stats spotCount={summaryQuery.data?.spotCount} villageCount={summaryQuery.data?.villageCount} totalUpvotes={summaryQuery.data?.totalUpvotes} loading={summaryQuery.isLoading} />
    <section aria-labelledby="find-place">
      <div className="section-heading"><div><Eyebrow>Start with a place</Eyebrow><h2 id="find-place">Where will your curiosity take you?</h2></div></div>
      <form className="page-toolbar" onSubmit={submitSearch} autoComplete="off">
        <div className="search-box"><Search size={17} /><input value={search} onChange={(e) => { setSearch(e.target.value); setSuggestOpen(true); }} onFocus={() => setSuggestOpen(true)} onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)} placeholder="Search state, district, tehsil or village" aria-label="Search State, District, Tehsil or Village" data-testid="input-home-location" list="village-suggestions" /><datalist id="village-suggestions">{Array.from(new Set((villageQuery.data || []).flatMap((village) => [village.name, village.state, village.district, ...(village.tehsil ? [village.tehsil] : [])]))).map((place) => <option key={place} value={place} />)}</datalist></div>
        <button type="submit" className="primary-button" data-testid="button-home-search">Find a village <ArrowRight size={14} /></button>
      </form>
      {suggestOpen && !!villageQuery.data?.length && <div className="suggestions" aria-label="Village suggestions">{villageQuery.data.slice(0,4).map((village) => <button key={village.id} className="suggestion-item" onMouseDown={() => { setSearch(village.name); setLocation(`/villages?search=${encodeURIComponent(village.name)}`); }} data-testid={`suggestion-village-${village.id}`}><MapPin size={13} /><span><strong>{village.name}</strong><small>{village.tehsil ? `${village.tehsil}, ` : ''}{village.district}, {village.state}</small></span><ArrowRight size={13} /></button>)}</div>}
    </section>
    <section aria-labelledby="community-places">
      <div className="section-heading"><div><Eyebrow>Collected by locals</Eyebrow><h2 id="community-places">Places worth pausing for</h2></div><Link href="/community" className="text-link" data-testid="link-community-home">See community picks <ArrowRight size={14} /></Link></div>
      <CategoryBar selected={selectedCategory} onSelect={setSelectedCategory} />
      <div style={{ marginTop: 13 }}><SpotResults spots={spotsQuery.data} loading={spotsQuery.isLoading} error={spotsQuery.isError} message={readableError(spotsQuery.error)} retry={() => void spotsQuery.refetch()} onUpvote={vote} isVoting={upvote.isPending} /></div>
    </section>
    <Notice text={notice} />
  </div></Layout>;
}

function MapPanel({ spots, selected, onSelect }: { spots: HeritageSpot[]; selected: string; onSelect: (spotId: string) => void }) {
  const mappedSpots = spots.filter((spot) =>
    Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude),
  );
  const minLat = Math.min(...mappedSpots.map((spot) => spot.latitude as number));
  const maxLat = Math.max(...mappedSpots.map((spot) => spot.latitude as number));
  const minLng = Math.min(...mappedSpots.map((spot) => spot.longitude as number));
  const maxLng = Math.max(...mappedSpots.map((spot) => spot.longitude as number));
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;
  return <div className="map-panel" role="region" aria-label="Interactive village places map">
    {mappedSpots.slice(0, 12).map((spot) => {
      const longitude = spot.longitude as number;
      const latitude = spot.latitude as number;
      const left = mappedSpots.length === 1 ? 50 : 12 + ((longitude - minLng) / lngRange) * 76;
      const top = mappedSpots.length === 1 ? 46 : 12 + ((maxLat - latitude) / latRange) * 76;
      return <button key={spot.id} className={`map-pin ${selected === spot.id ? 'active' : ''}`} style={{ left: `${left}%`, top: `${top}%` }} onClick={() => onSelect(spot.id)} title={spot.title} aria-label={`Show ${spot.title}`} data-testid={`map-pin-${spot.id}`}><MapPin size={14} /></button>;
    })}
    {selected && <div style={{ position: 'absolute', bottom: 12, left: 12, padding: '8px 11px', borderRadius: 8, background: '#fffaf1', fontSize: 10, color: '#18345a', boxShadow: '0 4px 14px #384b3522' }}>{spots.find((spot) => spot.id === selected)?.title}</div>}
    {!mappedSpots.length && <div className="map-empty">Add latitude and longitude to a spot to place it on the map.</div>}
    <span className="map-attribution">Coordinates shared by the community</span>
  </div>;
}

function Villages() {
  const [location] = useLocation();
  const initialSearch = useMemo(() => new URLSearchParams(location.split('?')[1] || '').get('search') || '', [location]);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [selectedPin, setSelectedPin] = useState('');
  const [geoMessage, setGeoMessage] = useState('');
  const [visitorPosition, setVisitorPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const villageParams = useMemo(() => ({ ...(search.trim() ? { search: search.trim() } : {}), limit: 30 }), [search]);
  const spotParams = useMemo(() => ({ ...(category ? { category } : {}), ...(search.trim() ? { search: search.trim() } : {}), limit: 30 }), [category, search]);
  const villages = useListVillages(villageParams, { query: { queryKey: getListVillagesQueryKey(villageParams), initialData: offlineVillages(villageParams), initialDataUpdatedAt: 0 } });
  const spots = useListHeritageSpots(spotParams, { query: { queryKey: getListHeritageSpotsQueryKey(spotParams), initialData: offlineSpots(spotParams), initialDataUpdatedAt: 0 } });
  const qc = useQueryClient();
  const upvote = useUpvoteHeritageSpot();
  const { notice, show } = useNotice();
  const filteredSpots = useMemo(() => {
    if (!nearby || !spots.data) return spots.data;
    return [...spots.data].sort((a, b) => {
      const distance = (spot: HeritageSpot) => {
        if (spot.latitude == null || spot.longitude == null) return Number.POSITIVE_INFINITY;
        if (!visitorPosition) return 0;
        const radians = (degrees: number) => degrees * Math.PI / 180;
        const dLat = radians(spot.latitude - visitorPosition.latitude);
        const dLon = radians(spot.longitude - visitorPosition.longitude);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(visitorPosition.latitude)) * Math.cos(radians(spot.latitude)) * Math.sin(dLon / 2) ** 2;
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };
      return distance(a) - distance(b);
    });
  }, [nearby, spots.data, visitorPosition]);
  const findNearby = () => {
    if (!navigator.geolocation) { setGeoMessage('Location is unavailable in this browser. Showing places with mapped coordinates first.'); setNearby(true); return; }
    navigator.geolocation.getCurrentPosition((position) => { setVisitorPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setGeoMessage('Places with community-shared coordinates are ordered by distance.'); setNearby(true); }, () => { setGeoMessage('Location permission was not granted. Showing places with mapped coordinates first.'); setNearby(true); }, { timeout: 7000 });
  };
  const vote = (spot: HeritageSpot) => upvote.mutate({ spotId: spot.id }, {
    onSuccess: () => { void qc.invalidateQueries({ queryKey: getListHeritageSpotsQueryKey() }); show('Your nod has been added.'); },
    onError: () => show('Could not save your nod. Please try again.')
  });
  const villagesList: Village[] = villages.data || [];
  return <Layout><div className="page">
    <Eyebrow>Explore by village</Eyebrow><h1 className="page-title">Find your way into a story.</h1><p className="page-intro">Search across State, District, Tehsil, and Village. Every result is a place kept alive by local knowledge.</p>
    <div className="page-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="State, district, tehsil or village" aria-label="Search State, District, Tehsil or Village" data-testid="input-village-search" /></div><button className={`map-toggle ${showMap ? 'active' : ''}`} onClick={() => setShowMap(!showMap)} aria-pressed={showMap} data-testid="button-toggle-map"><Map size={15} />{showMap ? 'Hide map' : 'Map view'}</button><button className={`map-toggle ${nearby ? 'active' : ''}`} onClick={() => nearby ? setNearby(false) : findNearby()} aria-pressed={nearby} data-testid="button-nearby"><Navigation size={14} />{nearby ? 'Nearby on' : 'Near me'}</button></div>
    {!!geoMessage && <p className="nearby-note" role="status">{geoMessage}</p>}
      {villages.isLoading && villages.data === undefined ? <div className="skeleton" style={{ height: 94, margin: '15px 0' }} /> : villages.isError && villages.data === undefined ? <ErrorState retry={() => void villages.refetch()} message={readableError(villages.error)} /> : villagesList.length > 0 ? <div className="category-row" style={{ marginBottom: 5 }} aria-label="Matching villages">{villagesList.slice(0,8).map((village) => <button key={village.id} className="category-chip" onClick={() => setSearch(village.name)} data-testid={`village-chip-${village.id}`}><MapPin size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />{village.name} · {village.district}</button>)}</div> : <p className="offline-empty-hint">No matching village in the offline guide. Try a state, district, or village name.</p>}
    <CategoryBar selected={category} onSelect={setCategory} />
    {showMap && !spots.isLoading && !spots.isError && <MapPanel spots={filteredSpots || []} selected={selectedPin} onSelect={setSelectedPin} />}
    <div className="section-heading"><div><Eyebrow>{nearby ? 'Mapped nearby' : 'Community field notes'}</Eyebrow><h2>{search ? `Stories around “${search}”` : 'Places across Bharat'}</h2></div><span style={{ color: '#788696', fontSize: 11 }}>{spots.data?.length ?? 0} places</span></div>
     <SpotResults spots={filteredSpots} loading={spots.isLoading} error={spots.isError} message={readableError(spots.error)} retry={() => void spots.refetch()} onUpvote={vote} isVoting={upvote.isPending} />
    <Notice text={notice} />
  </div></Layout>;
}

function AddSpot() {
  const [form, setForm] = useState({ title: '', villageName: '', district: '', state: '', category: '', description: '', imageUrl: '', latitude: '', longitude: '' });
  const [success, setSuccess] = useState(false);
  const create = useCreateHeritageSpot();
  const qc = useQueryClient();
  const { award } = usePoints();
  const update = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload: HeritageSpotInput = {
      title: form.title.trim(), villageName: form.villageName.trim(), district: form.district.trim(), state: form.state.trim(), category: form.category,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(form.imageUrl.trim() ? { imageUrl: form.imageUrl.trim() } : {}),
      ...(form.latitude.trim() ? { latitude: Number(form.latitude) } : {}),
      ...(form.longitude.trim() ? { longitude: Number(form.longitude) } : {}),
    };
    create.mutate({ data: payload }, {
      onSuccess: () => { setSuccess(true); award(10); setForm({ title: '', villageName: '', district: '', state: '', category: '', description: '', imageUrl: '', latitude: '', longitude: '' }); void qc.invalidateQueries({ queryKey: getListHeritageSpotsQueryKey() }); void qc.invalidateQueries({ queryKey: getListVillagesQueryKey() }); void qc.invalidateQueries({ queryKey: getGetHeritageSummaryQueryKey() }); },
    });
  };
  return <Layout><div className="page">
    <Eyebrow>Keep a story in circulation</Eyebrow><h1 className="page-title">Add a place worth knowing.</h1><p className="page-intro">You know this place differently. Help a future visitor find it — and understand why it matters to the people here.</p>
    {success && <div className="state-box" role="status" style={{ textAlign: 'left', padding: '15px 19px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}><Sparkles size={18} /><span><strong style={{ color: '#18345a' }}>Your place has been shared.</strong><br /><span style={{ fontSize: 11 }}>Thank you for adding to the village record.</span></span><button onClick={() => setSuccess(false)} aria-label="Dismiss confirmation" style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: '#52657c' }}><X size={15} /></button></div>}
    {create.isError && <div className="state-box" role="alert" style={{ textAlign: 'left', padding: '15px 19px', marginBottom: 16, borderColor: '#e3b2a9' }}><strong style={{ color: '#9c3c31' }}>Your submission could not be saved.</strong><p style={{ margin: '4px 0 0' }}>Please check your connection and submit again. Your details are still here.</p><small>{readableError(create.error)}</small></div>}
    <form className="form-panel" onSubmit={submit}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="spot-title">What is this place called? <span className="required">*</span></label><input id="spot-title" required minLength={2} maxLength={120} value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="The name locals use" data-testid="input-spot-title" /></div>
        <div className="field"><label htmlFor="spot-category">Choose a kind of story <span className="required">*</span></label><select id="spot-category" required value={form.category} onChange={(e) => update('category', e.target.value)} data-testid="select-spot-category"><option value="" disabled>Select category</option>{categories.map(({ label }) => <option key={label} value={label}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="spot-village">Village <span className="required">*</span></label><input id="spot-village" required minLength={2} maxLength={100} value={form.villageName} onChange={(e) => update('villageName', e.target.value)} placeholder="Village name" data-testid="input-spot-village" /></div>
        <div className="field"><label htmlFor="spot-district">District <span className="required">*</span></label><input id="spot-district" required minLength={2} maxLength={100} value={form.district} onChange={(e) => update('district', e.target.value)} placeholder="District" data-testid="input-spot-district" /></div>
        <div className="field"><label htmlFor="spot-state">State <span className="required">*</span></label><input id="spot-state" required minLength={2} maxLength={100} value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="State" data-testid="input-spot-state" /></div>
        <div className="field full"><label htmlFor="spot-description">What should a visitor know?</label><textarea id="spot-description" maxLength={1000} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Share a memory, a direction, a local custom, or the story behind this place." data-testid="input-spot-description" /><small style={{ color: '#8a929a', textAlign: 'right', fontSize: 10 }}>{form.description.length}/1000</small></div>
        <div className="field full"><label htmlFor="spot-image">Photo link <span style={{ fontWeight: 400, color: '#8a929a' }}>— optional</span></label><input id="spot-image" type="url" value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://…" data-testid="input-spot-image" /></div>
        <div className="field"><label htmlFor="spot-latitude">Latitude <span style={{ fontWeight: 400, color: '#8a929a' }}>— optional</span></label><input id="spot-latitude" type="number" min="-90" max="90" step="any" value={form.latitude} onChange={(e) => update('latitude', e.target.value)} placeholder="For the community map" data-testid="input-spot-latitude" /></div>
        <div className="field"><label htmlFor="spot-longitude">Longitude <span style={{ fontWeight: 400, color: '#8a929a' }}>— optional</span></label><input id="spot-longitude" type="number" min="-180" max="180" step="any" value={form.longitude} onChange={(e) => update('longitude', e.target.value)} placeholder="For the community map" data-testid="input-spot-longitude" /></div>
      </div>
      <div className="form-actions"><span className="form-hint"><span className="required">*</span> Required fields. Your local knowledge belongs here.</span><button className="primary-button" type="submit" disabled={create.isPending} data-testid="button-submit-spot">{create.isPending ? <><LoaderCircle size={15} className="animate-spin" /> Sharing…</> : <>Share this place <Send size={14} /></>}</button></div>
    </form>
  </div></Layout>;
}

function Community() {
  const params = useMemo(() => ({ limit: 50 }), []);
  const spots = useListHeritageSpots(params, { query: { queryKey: getListHeritageSpotsQueryKey(params), initialData: offlineSpots(params), initialDataUpdatedAt: 0 } });
  const qc = useQueryClient();
  const upvote = useUpvoteHeritageSpot();
  const { notice, show } = useNotice();
  const topSpots = useMemo(() => [...(spots.data || [])].sort((a, b) => b.upvotes - a.upvotes), [spots.data]);
  const vote = (spot: HeritageSpot) => upvote.mutate({ spotId: spot.id }, {
    onSuccess: () => { void qc.invalidateQueries({ queryKey: getListHeritageSpotsQueryKey() }); show('Your nod has been added.'); },
    onError: () => show('Could not save your nod. Please try again.')
  });
  return <Layout><div className="page">
    <Eyebrow>Knowledge travels together</Eyebrow><h1 className="page-title">The community knows the way.</h1><p className="page-intro">These places are rising because visitors and locals found them worth passing on. Add your own nod when a story stays with you.</p>
      {spots.isLoading && spots.data === undefined ? <div className="skeleton" style={{ height: 320, borderRadius: 15 }} /> : spots.isError && spots.data === undefined ? <ErrorState retry={() => void spots.refetch()} message={readableError(spots.error)} /> : !topSpots.length ? <EmptyState title="The first story starts here" description="No community contributions have been added yet. Be the first to share a place from your village." action={<Link href="/add-spot" className="primary-button">Add a place <ArrowRight size={14} /></Link>} /> : <>
       {topSpots.some((spot) => isOfflinePreview(spot.id)) && <p className="offline-preview-note" role="status">Offline preview · entries are illustrative until verified by local contributors.</p>}
      <div className="section-heading"><div><Eyebrow>Most appreciated</Eyebrow><h2>Local knowledge, lifted up</h2></div><span style={{ fontSize: 11, color: '#7a8794' }}>{topSpots.length} shared places</span></div>
      <div className="form-panel" style={{ padding: '8px 22px' }}>{topSpots.map((spot, i) => <div className="community-row" key={spot.id} data-testid={`community-row-${spot.id}`}><span className="rank">{String(i + 1).padStart(2, '0')}</span><span><strong>{spot.title}</strong><span>{spot.villageName}, {spot.district}, {spot.state} · {spot.category}</span></span><button className="upvote-button community-score" onClick={() => vote(spot)} disabled={upvote.isPending} aria-label={`Upvote ${spot.title}`} data-testid={`community-upvote-${spot.id}`}><ThumbsUp size={13} />{spot.upvotes}</button></div>)}</div>
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}><Link href="/add-spot" className="primary-button" data-testid="link-add-community">Add a place to the map <Plus size={15} /></Link></div>
    </>}
    <Notice text={notice} />
  </div></Layout>;
}

function Profile() {
  const { points } = usePoints();
  const summary = useGetHeritageSummary({ query: { initialData: OFFLINE_SUMMARY, initialDataUpdatedAt: 0 } });
  const spots = useListHeritageSpots({ limit: 6 }, { query: { queryKey: getListHeritageSpotsQueryKey({ limit: 6 }), initialData: offlineSpots({ limit: 6 }), initialDataUpdatedAt: 0 } });
  const upvote = useUpvoteHeritageSpot();
  const qc = useQueryClient();
  const { notice, show } = useNotice();
  const vote = (spot: HeritageSpot) => upvote.mutate({ spotId: spot.id }, {
    onSuccess: () => { void qc.invalidateQueries({ queryKey: getListHeritageSpotsQueryKey() }); void qc.invalidateQueries({ queryKey: getGetHeritageSummaryQueryKey() }); show('Your nod has been added.'); },
    onError: () => show('Could not save your nod. Please try again.')
  });
  return <Layout><div className="page">
    <Eyebrow>Your place in the story</Eyebrow><h1 className="page-title">A local visitor profile.</h1><p className="page-intro">Every visit can leave a little more knowledge behind. Your contributions and community points will find a home here.</p>
    <section className="profile-hero"><span className="profile-avatar">V</span><div><h2>Local visitor</h2><p>Curious about the stories close to home.</p></div><div className="profile-points"><strong>{points}</strong><span>Community points</span></div></section>
    <Stats spotCount={summary.data?.spotCount} villageCount={summary.data?.villageCount} totalUpvotes={summary.data?.totalUpvotes} loading={summary.isLoading} />
    <div className="section-heading"><div><Eyebrow>Recently shared</Eyebrow><h2>Stories from the community</h2></div><Link href="/community" className="text-link" data-testid="link-profile-community">Community board <ArrowRight size={14} /></Link></div>
    <SpotResults spots={spots.data} loading={spots.isLoading || summary.isLoading} error={spots.isError || summary.isError} message={readableError(spots.error ?? summary.error)} retry={() => { void spots.refetch(); void summary.refetch(); }} onUpvote={vote} isVoting={upvote.isPending} />
    <div style={{ marginTop: 20 }}><Link href="/add-spot" className="primary-button" data-testid="link-profile-add"><Plus size={14} /> Share your first place</Link></div>
    <Notice text={notice} />
  </div></Layout>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={Home} />
    <Route path="/villages" component={Villages} />
    <Route path="/add-spot" component={AddSpot} />
    <Route path="/community" component={Community} />
    <Route path="/profile" component={Profile} />
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><PointsProvider><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></PointsProvider></QueryClientProvider>;
}

export default App;
import { supabase } from '../lib/supabaseClient';
.from('Heritage and tourism palace')
.select('*')
.or('Name.ilike.%' + query + '%,State.ilike.%' + query + '%,City.ilike.%' + query + '%')
const handleSearch = async (searchTerm: string) => {
  if (!searchTerm.trim()) return;

  const { data, error } = await supabase
    .from('Heritage and tourism palace')
    .select('*')
    .or(`Name.ilike.%${searchTerm}%,State.ilike.%${searchTerm}%,City.ilike.%${searchTerm}%`);

  if (error) {
    console.error("Search Error:", error);
    return;
  }

  setPlaces(data); // Ya jo bhi aapke state variable ka naam hai
};
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

