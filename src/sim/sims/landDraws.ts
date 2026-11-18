/**
 * Opening-hand draw odds for a constructed deck.
 *
 * Deliberately generic: "lands in a 40-card limited deck" and "lands in a
 * 99-card Commander deck" are the same model with different numbers, and so is
 * "how many of my 4 copies do I see by turn 5".
 *
 * No game names, card names or art anywhere in this repo — only deck size,
 * counts and my own labels.
 */

import { sampleWithoutReplacement, type Rng } from "../rng";
import { hypergeometricAtLeast, hypergeometricPmf } from "../stats";

export interface DeckConfig {
  /** Total cards in the deck. */
  deckSize: number;
  /** How many of those are the card type we care about. */
  targetCount: number;
  /** Cards drawn (opening hand, or opening hand plus draw steps). */
  handSize: number;
}

/** One simulated hand: how many target cards it contained. */
export const drawHand = (rng: Rng, config: DeckConfig): number => {
  const { deckSize, targetCount, handSize } = config;
  if (targetCount > deckSize) throw new Error("targetCount exceeds deckSize");
  if (handSize > deckSize) throw new Error("handSize exceeds deckSize");
  // Index < targetCount means "this card is a target card".
  const deck = Array.from({ length: deckSize }, (_, i) => i);
  const hand = sampleWithoutReplacement(rng, deck, handSize);
  let hits = 0;
  for (const card of hand) if (card < targetCount) hits++;
  return hits;
};

/** Trial predicate: did this hand contain at least `atLeast` target cards? */
export const handHasAtLeast =
  (config: DeckConfig, atLeast: number) =>
  (rng: Rng): boolean =>
    drawHand(rng, config) >= atLeast;

/** Trial predicate: exactly `exactly` target cards. */
export const handHasExactly =
  (config: DeckConfig, exactly: number) =>
  (rng: Rng): boolean =>
    drawHand(rng, config) === exactly;

/** The exact answer the simulation should converge to. */
export const exactAtLeast = (config: DeckConfig, atLeast: number): number =>
  hypergeometricAtLeast(config.deckSize, config.targetCount, config.handSize, atLeast);

export const exactExactly = (config: DeckConfig, exactly: number): number =>
  hypergeometricPmf(config.deckSize, config.targetCount, config.handSize, exactly);

/** Full exact distribution over possible target-card counts in a hand. */
export const exactDistribution = (config: DeckConfig): number[] =>
  Array.from({ length: config.handSize + 1 }, (_, k) => exactExactly(config, k));

// --- Named configurations used by the videos ------------------------------

/** 40-card limited deck: the 16 vs 17 lands question. */
export const LIMITED_16 = { deckSize: 40, targetCount: 16, handSize: 7 } as const;
export const LIMITED_17 = { deckSize: 40, targetCount: 17, handSize: 7 } as const;

/** 99-card singleton deck plus commander: why these decks flood or stall. */
export const SINGLETON_37 = { deckSize: 99, targetCount: 37, handSize: 7 } as const;

/**
 * "Keepable hand" is a judgement call, not a rule. We define it explicitly so
 * the video can state its assumption on screen rather than hide it.
 */
export const isKeepableHand = (targetsInHand: number, handSize: number): boolean => {
  // A 7-card hand wants roughly 2-5 lands; outside that it is a mulligan.
  const lo = Math.max(1, Math.round(handSize * 0.28));
  const hi = Math.round(handSize * 0.72);
  return targetsInHand >= lo && targetsInHand <= hi;
};
