import { useCallback, useMemo, useState } from 'react';
import {
  type LocationRefinement,
  type LocationVote,
  type PlannerIntelligence,
  type ReviewTab,
  type SessionPlan,
  type SessionPlanLocation,
} from '@/lib/planner/plannerConfig';

export function usePlannerReviewState(plan: SessionPlan | null, intelligence: PlannerIntelligence | null) {
  const [activeReviewTab, setActiveReviewTab] = useState<ReviewTab>('map');
  const [activeMobileReviewTab, setActiveMobileReviewTab] = useState<ReviewTab | null>('map');
  const [locationVotes, setLocationVotes] = useState<Record<string, LocationVote>>({});
  const [preferredVenueBucket, setPreferredVenueBucket] = useState<string | null>(null);
  const [excludedVenueBuckets, setExcludedVenueBuckets] = useState<string[]>([]);
  const [selectedReviewLocationName, setSelectedReviewLocationName] = useState<string | null>(null);

  const resetReviewState = useCallback(() => {
    setActiveReviewTab('map');
    setActiveMobileReviewTab('map');
    setLocationVotes({});
    setPreferredVenueBucket(null);
    setExcludedVenueBuckets([]);
    setSelectedReviewLocationName(null);
  }, []);

  const locationIndex = useMemo(() => {
    const map = new Map<string, SessionPlanLocation>();
    (plan?.locationSuggestions ?? []).forEach(location => {
      map.set(location.name.toLowerCase(), location);
    });
    return map;
  }, [plan?.locationSuggestions]);

  const refinementIndex = useMemo(() => {
    const map = new Map<string, LocationRefinement>();
    (plan?.locationRefinements ?? []).forEach(refinement => {
      map.set(refinement.name.toLowerCase(), refinement);
    });
    return map;
  }, [plan?.locationRefinements]);

  const routeRankLookup = useMemo(() => {
    const map = new Map<string, number>();
    if (!plan || !intelligence?.optimizedRoute) return map;

    intelligence.optimizedRoute.forEach((originalIndex, optimizedIndex) => {
      const location = plan.locationSuggestions[originalIndex];
      if (!location) return;
      map.set((location.displayName || location.name).toLowerCase(), optimizedIndex);
    });

    return map;
  }, [intelligence, plan]);

  const logisticsLookup = useMemo(() => {
    const map = new Map<string, PlannerIntelligence['logistics'][number]>();
    if (!plan || !intelligence?.logistics) return map;

    plan.locationSuggestions.forEach((location, index) => {
      const logistics = intelligence.logistics[index];
      if (!logistics) return;
      map.set((location.displayName || location.name).toLowerCase(), logistics);
    });

    return map;
  }, [intelligence, plan]);

  const displayedLocations = useMemo(() => {
    const locations = [...(plan?.locationSuggestions ?? [])];

    return locations
      .filter(location => !location.venueBucket || !excludedVenueBuckets.includes(location.venueBucket))
      .sort((a, b) => {
        const aKey = (a.displayName || a.name).toLowerCase();
        const bKey = (b.displayName || b.name).toLowerCase();
        const aVote = locationVotes[aKey];
        const bVote = locationVotes[bKey];
        const aPreferred = preferredVenueBucket && a.venueBucket === preferredVenueBucket ? 1 : 0;
        const bPreferred = preferredVenueBucket && b.venueBucket === preferredVenueBucket ? 1 : 0;
        const aVoteScore = aVote === 'up' ? 1 : aVote === 'down' ? -1 : 0;
        const bVoteScore = bVote === 'up' ? 1 : bVote === 'down' ? -1 : 0;
        const aRouteRank = routeRankLookup.get(aKey);
        const bRouteRank = routeRankLookup.get(bKey);

        if (aPreferred !== bPreferred) return bPreferred - aPreferred;
        if (aVoteScore !== bVoteScore) return bVoteScore - aVoteScore;
        if (typeof aRouteRank === 'number' && typeof bRouteRank === 'number' && aRouteRank !== bRouteRank) {
          return aRouteRank - bRouteRank;
        }
        return (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0);
      });
  }, [excludedVenueBuckets, locationVotes, plan?.locationSuggestions, preferredVenueBucket, routeRankLookup]);

  const displayedLocationNames = useMemo(
    () => new Set(displayedLocations.map(location => (location.displayName || location.name).toLowerCase())),
    [displayedLocations]
  );

  const displayedShots = useMemo(() => {
    const shots = plan?.shotList ?? [];
    if (displayedLocationNames.size === 0) return shots;

    const filtered = shots.filter(shot => displayedLocationNames.has((shot.location || '').toLowerCase()));
    return filtered.length > 0 ? filtered : shots;
  }, [displayedLocationNames, plan?.shotList]);

  const selectedReviewLocation = useMemo(() => {
    if (!selectedReviewLocationName) return displayedLocations[0] ?? null;

    return (
      displayedLocations.find(location => (location.displayName || location.name) === selectedReviewLocationName) ??
      displayedLocations[0] ??
      null
    );
  }, [displayedLocations, selectedReviewLocationName]);

  const effectiveSelectedReviewLocationName = selectedReviewLocation
    ? selectedReviewLocation.displayName || selectedReviewLocation.name
    : null;

  const setLocationVote = useCallback((location: SessionPlanLocation, vote: LocationVote) => {
    const key = (location.displayName || location.name).toLowerCase();
    setLocationVotes(prev => {
      if (prev[key] === vote) {
        const next = { ...prev };
        delete next[key];
        return next;
      }

      return {
        ...prev,
        [key]: vote,
      };
    });
  }, []);

  const togglePreferredVenueBucket = useCallback((venueBucket?: string) => {
    if (!venueBucket) return;
    setPreferredVenueBucket(prev => (prev === venueBucket ? null : venueBucket));
  }, []);

  const toggleExcludedVenueBucket = useCallback((venueBucket?: string) => {
    if (!venueBucket) return;
    setExcludedVenueBuckets(prev =>
      prev.includes(venueBucket) ? prev.filter(item => item !== venueBucket) : [...prev, venueBucket]
    );
  }, []);

  const emptyLocationMessage = useMemo(() => {
    if (displayedLocations.length > 0) return null;
    if ((plan?.locationSuggestions?.length ?? 0) === 0) {
      return 'No locations made it into the current plan. Try broadening the area, using a ZIP, or switching to provided locations.';
    }
    if (excludedVenueBuckets.length > 0) {
      return 'All current locations are hidden by your excluded type filters. Re-enable a venue type to see them again.';
    }
    return 'No locations match the current review filters. Clear preferences or regenerate for a broader set.';
  }, [displayedLocations.length, excludedVenueBuckets.length, plan?.locationSuggestions?.length]);

  const emptyShotMessage = useMemo(() => {
    if (displayedShots.length > 0) return null;
    if ((plan?.shotList?.length ?? 0) === 0) {
      return 'No shots were generated for this plan yet. Regenerate the plan or refine it after locations are confirmed.';
    }
    return 'No shots match the currently visible locations. Re-enable a location type or regenerate the plan.';
  }, [displayedShots.length, plan?.shotList?.length]);

  const toggleMobileReviewTab = useCallback((tab: ReviewTab) => {
    setActiveMobileReviewTab(prev => (prev === tab ? null : tab));
    setActiveReviewTab(tab);
  }, []);

  const reviewTabItems: Array<{ id: ReviewTab; label: string }> = [
    { id: 'map', label: `Map (${displayedLocations.filter(location => location.latitude != null && location.longitude != null).length})` },
    { id: 'locations', label: `Locations (${displayedLocations.length})` },
    { id: 'shot-list', label: `Shot List (${displayedShots.length})` },
    { id: 'timeline', label: `Timeline (${plan?.timeline.length ?? 0})` },
    { id: 'prep', label: 'Prep + Backup' },
  ];

  return {
    activeReviewTab,
    setActiveReviewTab,
    activeMobileReviewTab,
    locationVotes,
    preferredVenueBucket,
    excludedVenueBuckets,
    selectedReviewLocation,
    effectiveSelectedReviewLocationName,
    setSelectedReviewLocationName,
    resetReviewState,
    locationIndex,
    refinementIndex,
    logisticsLookup,
    displayedLocations,
    displayedShots,
    emptyLocationMessage,
    emptyShotMessage,
    setLocationVote,
    togglePreferredVenueBucket,
    toggleExcludedVenueBucket,
    toggleMobileReviewTab,
    reviewTabItems,
  };
}
