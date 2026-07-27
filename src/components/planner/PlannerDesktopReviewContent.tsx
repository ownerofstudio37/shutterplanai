import { memo, type ReactNode } from 'react';
import { PlannerMapReviewPanel } from '@/components/planner/PlannerMapReviewPanel';
import { PlannerLocationReviewPanel } from '@/components/planner/PlannerLocationReviewPanel';
import { PlannerShotListPanel } from '@/components/planner/PlannerShotListPanel';
import { PlannerTimelinePanel } from '@/components/planner/PlannerTimelinePanel';
import { PlannerPrepPanel } from '@/components/planner/PlannerPrepPanel';

type ReviewTab = 'map' | 'locations' | 'shot-list' | 'timeline' | 'prep';
type LocationVote = 'up' | 'down';

type ReviewLocation = {
  name: string;
  displayName?: string;
  whyItWorks: string;
  microLocations: string[];
  selectionReasons?: string[];
  confidenceScore?: number;
  venueBucket?: string;
  sourceQuery?: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string;
  logistics: {
    parking: string;
    restroom: string;
    walkingDistance: string;
  };
};

type ReviewShot = {
  title: string;
  description: string;
  location: string;
  microSpot: string;
  poseSuggestion: string;
  compositionSuggestion: string;
  timingHint: string;
  lensSuggestion?: string;
  deliverableCategory?: string;
  angleSuggestion?: string;
  backupMicroSpot?: string;
  priority?: 'must-have' | 'should-have' | 'nice-to-have';
  lightWeatherNote?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type TimelineItem = {
  timeBlock: string;
  focus: string;
  notes: string;
};

type PlannerTimelineIntelligence = {
  goldenHours: {
    sunrise: string;
    sunset: string;
    goldenHourStart: string;
    goldenHourEnd: string;
    morningGoldenHourStart?: string;
    morningGoldenHourEnd?: string;
    eveningBlueHourStart?: string;
    eveningBlueHourEnd?: string;
  };
  weather?: {
    temperature?: number;
    apparentTemperature?: number;
    cloudCover: number;
    uvIndex: number;
    windSpeed: number;
    windGustSpeed: number;
    precipitationProbability: number;
    conditionSummary?: string;
    recommendations: string[];
  };
  confidence?: {
    overall: number;
    windows: Array<{
      label: string;
      startsAt: string;
      endsAt: string;
      confidence: number;
      summary: string;
    }>;
  };
};

type LogisticsInfo = {
  parkingDifficulty: number;
  permitLikelihood: number;
  crowdRisk: number;
  overallRisk: number;
  warnings: string[];
  venueHoursSummary?: string;
  parkingCost?: string;
  restroomConfidence?: 'low' | 'medium' | 'high';
  permit?: {
    likelihood: 'low' | 'medium' | 'high';
    sourceNote: string;
    leadTimeDays: number;
    noPermitAlternatives: string[];
  };
  crowd?: {
    eventRisk: 'low' | 'medium' | 'high';
    sourceNote: string;
  };
  needsVerification?: boolean;
};

type LocationRefinement = {
  name: string;
  kidFriendlinessScore: number;
  crowdRiskScore: number;
  walkingBurdenScore: number;
  overallScore: number;
  bestTimeWindow: string;
  rationale: string;
  recommendedMicroSpots: string[];
};

type PlannerDesktopReviewContentProps = {
  activeReviewTab: ReviewTab;
  mapContent: ReactNode;
  // map + location shared
  locations: ReviewLocation[];
  selectedLocation: ReviewLocation | null;
  onSelectLocation: (name: string) => void;
  // location tab
  emptyLocationMessage: string | null;
  locationVotes: Record<string, LocationVote>;
  selectedLocationKeys: string[];
  selectedLocationCount: number;
  recommendedLocationCount: number;
  preferredVenueBucket: string | null;
  excludedVenueBuckets: string[];
  logisticsLookup: Map<string, LogisticsInfo>;
  locationRefinements?: LocationRefinement[];
  onToggleSelectedLocation: (location: ReviewLocation) => void;
  onClearSelectedLocations: () => void;
  onAddMicroLocation: (location: ReviewLocation) => void;
  onUpdateMicroLocation: (location: ReviewLocation, index: number, value: string) => void;
  onRemoveMicroLocation: (location: ReviewLocation, index: number) => void;
  onMoveMicroLocation: (location: ReviewLocation, index: number, direction: 'up' | 'down') => void;
  onUpdateMicroLocationPlanField: (
    location: ReviewLocation,
    index: number,
    field: 'purpose' | 'bestLightDirection' | 'backupUse' | 'bestShotTypes' | 'exactPin' | 'resetNote',
    value: string
  ) => void;
  onSuggestMicroLocations: (location: ReviewLocation) => void;
  onVoteLocation: (location: ReviewLocation, vote: LocationVote) => void;
  onTogglePreferredVenueBucket: (venueBucket?: string) => void;
  onToggleExcludedVenueBucket: (venueBucket?: string) => void;
  // shot list tab
  displayedShots: ReviewShot[];
  allShots: ReviewShot[];
  emptyShotMessage: string | null;
  isEditMode: boolean;
  isShotListRegenerating: boolean;
  onRegenerateShotList: () => void;
  onUpdateShotField: (index: number, field: 'title' | 'description' | 'location', value: string) => void;
  // timeline tab
  timeline: TimelineItem[];
  intelligence?: PlannerTimelineIntelligence | null;
  photographerSunWeatherNotes?: string[];
  isTimelineRegenerating: boolean;
  onRegenerateTimeline: () => void;
  onOptimizeSunWeather: () => void;
  onUpdateTimelineField: (index: number, field: 'timeBlock' | 'focus' | 'notes', value: string) => void;
  // prep tab
  checklist: string[];
  contingencyPlans: string[];
  photographerPlan?: {
    priorityChecklist?: string[];
    sunWeatherNotes?: string[];
    backupPlan?: string[];
  };
  clientGuide?: {
    arrivalInstructions: string;
    parking: string;
    whatToWearAndBring: string[];
    sessionFlow: string;
    weatherExpectations: string;
    reassurance: string;
    tone: string;
  };
  onUpdateChecklistItem: (index: number, value: string) => void;
  onUpdateContingencyItem: (index: number, value: string) => void;
};

export const PlannerDesktopReviewContent = memo(function PlannerDesktopReviewContent({
  activeReviewTab,
  mapContent,
  locations,
  selectedLocation,
  onSelectLocation,
  emptyLocationMessage,
  locationVotes,
  selectedLocationKeys,
  selectedLocationCount,
  recommendedLocationCount,
  preferredVenueBucket,
  excludedVenueBuckets,
  logisticsLookup,
  locationRefinements,
  onToggleSelectedLocation,
  onClearSelectedLocations,
  onAddMicroLocation,
  onUpdateMicroLocation,
  onRemoveMicroLocation,
  onMoveMicroLocation,
  onUpdateMicroLocationPlanField,
  onSuggestMicroLocations,
  onVoteLocation,
  onTogglePreferredVenueBucket,
  onToggleExcludedVenueBucket,
  displayedShots,
  allShots,
  emptyShotMessage,
  isEditMode,
  isShotListRegenerating,
  onRegenerateShotList,
  onUpdateShotField,
  timeline,
  intelligence,
  photographerSunWeatherNotes,
  isTimelineRegenerating,
  onRegenerateTimeline,
  onOptimizeSunWeather,
  onUpdateTimelineField,
  checklist,
  contingencyPlans,
  photographerPlan,
  clientGuide,
  onUpdateChecklistItem,
  onUpdateContingencyItem,
}: PlannerDesktopReviewContentProps) {
  if (activeReviewTab === 'map') {
    return (
      <PlannerMapReviewPanel
        locations={locations}
        selectedLocation={selectedLocation}
        selectedLocationKeys={selectedLocationKeys}
        selectedLocationCount={selectedLocationCount}
        recommendedLocationCount={recommendedLocationCount}
        onSelectLocation={onSelectLocation}
        onToggleSelectedLocation={onToggleSelectedLocation}
        onClearSelectedLocations={onClearSelectedLocations}
        mapContent={mapContent}
      />
    );
  }

  if (activeReviewTab === 'locations') {
    return (
      <PlannerLocationReviewPanel
        locations={locations}
        emptyLocationMessage={emptyLocationMessage}
        locationVotes={locationVotes}
        selectedLocationKeys={selectedLocationKeys}
        selectedLocationCount={selectedLocationCount}
        recommendedLocationCount={recommendedLocationCount}
        preferredVenueBucket={preferredVenueBucket}
        excludedVenueBuckets={excludedVenueBuckets}
        logisticsLookup={logisticsLookup}
        locationRefinements={locationRefinements}
        onToggleSelectedLocation={onToggleSelectedLocation}
        onClearSelectedLocations={onClearSelectedLocations}
        onAddMicroLocation={onAddMicroLocation}
        onUpdateMicroLocation={onUpdateMicroLocation}
        onRemoveMicroLocation={onRemoveMicroLocation}
        onMoveMicroLocation={onMoveMicroLocation}
        onUpdateMicroLocationPlanField={onUpdateMicroLocationPlanField}
        onSuggestMicroLocations={onSuggestMicroLocations}
        onVoteLocation={onVoteLocation}
        onTogglePreferredVenueBucket={onTogglePreferredVenueBucket}
        onToggleExcludedVenueBucket={onToggleExcludedVenueBucket}
      />
    );
  }

  if (activeReviewTab === 'shot-list') {
    return (
      <PlannerShotListPanel
        displayedShots={displayedShots}
        allShots={allShots}
        emptyShotMessage={emptyShotMessage}
        isEditMode={isEditMode}
        isRegenerating={isShotListRegenerating}
        onRegenerate={onRegenerateShotList}
        onUpdateShotField={onUpdateShotField}
      />
    );
  }

  if (activeReviewTab === 'timeline') {
    return (
      <PlannerTimelinePanel
        timeline={timeline}
        intelligence={intelligence}
        photographerSunWeatherNotes={photographerSunWeatherNotes}
        isEditMode={isEditMode}
        isRegenerating={isTimelineRegenerating}
        onRegenerate={onRegenerateTimeline}
        onOptimizeSunWeather={onOptimizeSunWeather}
        onUpdateTimelineField={onUpdateTimelineField}
      />
    );
  }

  return (
    <PlannerPrepPanel
      checklist={checklist}
      contingencyPlans={contingencyPlans}
      photographerPlan={photographerPlan}
      clientGuide={clientGuide}
      isEditMode={isEditMode}
      onUpdateChecklistItem={onUpdateChecklistItem}
      onUpdateContingencyItem={onUpdateContingencyItem}
    />
  );
});

PlannerDesktopReviewContent.displayName = 'PlannerDesktopReviewContent';
