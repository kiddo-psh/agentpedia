import type { Category } from "../../content/schema";
import type { IdeaConfidence, IdeaSourceKind } from "../schema";

/** Collector output before merge into content/ideas.yaml. */
export type CollectedHit = {
  slug: string;
  topic: string;
  category: Category;
  people: string[];
  sources: string[];
  publishedAt?: Date;
  sourceKind: IdeaSourceKind;
  tension: string;
  kitIdea: string;
  primaryVerified: false;
  confidence: IdeaConfidence;
  status: "idea";
  note?: string;
  score: number;
  collectedAt: Date;
};
