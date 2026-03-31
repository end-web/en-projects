import rawResources from "../../julebu-learn-resources.json";

export interface JulebuGroup {
  nameCn: string;
  nameEn: string;
  wordCount: number;
  learnUrl: string;
  practiceUrl: string;
}

export interface JulebuResource {
  slug: string;
  title: string;
  url: string;
  wordCount: number;
  groupCount: number;
  description: string;
  groups: JulebuGroup[];
}

interface JulebuResourcesPayload {
  source: string;
  fetchedAt: string;
  overview: {
    title: string;
    type: string;
    wordCountHint: string;
    allVocabularyUrl: string;
    comingSoon: string[];
  };
  resources: JulebuResource[];
}

export const julebuResources = rawResources as JulebuResourcesPayload;

export const julebuSummary = {
  topicCount: julebuResources.resources.length,
  totalWords: julebuResources.resources.reduce((sum, item) => sum + item.wordCount, 0)
};
