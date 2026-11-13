/**
 * The Encyclopaedia of Chess Openings files every opening under a code from A00 to E99. The
 * five letters are its volumes; within a volume, runs of consecutive codes belong to one opening
 * complex. This table is that structure: the map the catalog is drawn from.
 */

import { parseMoveText } from '../chess/san.ts';

/** A run of consecutive ECO codes that covers one opening complex. */
export interface EcoGroup {
  /** First code of the run, e.g. `B90`. Unique, so it doubles as the group's key. */
  from: string;
  /** Last code of the run, e.g. `B99`. Equal to `from` for a single-code group. */
  to: string;
  title: string;
  /** The moves both sides have played once a game belongs here, in SAN. Empty if there are none. */
  moves: string[];
}

/** One of the five volumes of the encyclopaedia. */
export interface EcoVolume {
  letter: string;
  title: string;
  summary: string;
  groups: EcoGroup[];
}

type GroupRow = [codes: string, title: string, moves: string];

function volume(letter: string, title: string, summary: string, rows: GroupRow[]): EcoVolume {
  const groups = rows.map(([codes, groupTitle, moves]) => {
    const [from = '', to = from] = codes.split('-').map((number) => `${letter}${number}`);
    return { from, to, title: groupTitle, moves: parseMoveText(moves) };
  });
  return { letter, title, summary, groups };
}

const SICILIAN_OPEN = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3';
const FRENCH = '1. e4 e6 2. d4 d5';
const SPANISH = '1. e4 e5 2. Nf3 Nc6 3. Bb5';
const QUEENS_GAMBIT_DECLINED = '1. d4 d5 2. c4 e6 3. Nc3 Nf6';
const GRUNFELD = '1. d4 Nf6 2. c4 g6 3. Nc3 d5';
const NIMZO_INDIAN = '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4';
const KINGS_INDIAN = '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6';

export const ECO_VOLUMES: readonly EcoVolume[] = [
  volume(
    'A',
    'Flank Openings',
    'White holds back the centre pawns or Black sidesteps the main roads: the English, the Réti, ' +
      "Bird's and the irregular first moves, plus the Dutch, the Benoni and Black's other " +
      'offbeat answers to 1. d4.',
    [
      ['00', 'Irregular First Moves', ''],
      ['01', 'Nimzo-Larsen Attack', '1. b3'],
      ['02-03', 'Bird Opening', '1. f4'],
      ['04-09', "Zukertort, Réti & King's Indian Attack", '1. Nf3'],
      ['10-19', 'English Opening', '1. c4'],
      ['20-29', "English Opening: King's English", '1. c4 e5'],
      ['30-39', 'English Opening: Symmetrical', '1. c4 c5'],
      ['40-44', "Queen's Pawn: Englund, Modern & Old Benoni", '1. d4'],
      ['45-49', 'Indian Defense: Trompowsky, Torre & London', '1. d4 Nf6'],
      ['50', 'Indian Defense: Second-Move Sidelines', '1. d4 Nf6 2. c4'],
      ['51-52', 'Budapest Defense', '1. d4 Nf6 2. c4 e5'],
      ['53-55', 'Old Indian Defense', '1. d4 Nf6 2. c4 d6'],
      ['56', 'Benoni Defense', '1. d4 Nf6 2. c4 c5'],
      ['57-59', 'Benko Gambit', '1. d4 Nf6 2. c4 c5 3. d5 b5'],
      ['60-79', 'Benoni Defense: Modern Benoni', '1. d4 Nf6 2. c4 c5 3. d5 e6'],
      ['80-85', 'Dutch Defense', '1. d4 f5'],
      ['86-89', 'Dutch Defense: Fianchetto & Leningrad', '1. d4 f5 2. c4 Nf6 3. g3'],
      ['90-99', 'Dutch Defense: Classical & Stonewall', '1. d4 f5 2. c4 Nf6 3. g3 e6'],
    ],
  ),
  volume(
    'B',
    'Semi-Open Games',
    'Black answers 1. e4 with something other than 1… e5 or the French: the Sicilian in all its ' +
      'branches, the Caro-Kann, the Pirc and Modern, the Alekhine and the Scandinavian.',
    [
      ['00', 'Nimzowitsch, Owen & Other Rare Defenses', '1. e4'],
      ['01', 'Scandinavian Defense', '1. e4 d5'],
      ['02-05', 'Alekhine Defense', '1. e4 Nf6'],
      ['06', 'Modern Defense', '1. e4 g6'],
      ['07-09', 'Pirc Defense', '1. e4 d6 2. d4 Nf6'],
      ['10-19', 'Caro-Kann Defense', '1. e4 c6'],
      ['20-29', 'Sicilian Defense: Anti-Sicilians & Sidelines', '1. e4 c5'],
      [
        '30-39',
        'Sicilian Defense: Rossolimo, Sveshnikov & Accelerated Dragon',
        '1. e4 c5 2. Nf3 Nc6',
      ],
      ['40-49', 'Sicilian Defense: Kan, Taimanov & Four Knights', '1. e4 c5 2. Nf3 e6'],
      ['50-59', 'Sicilian Defense: Moscow & Classical', '1. e4 c5 2. Nf3 d6'],
      ['60-69', 'Sicilian Defense: Richter-Rauzer', `${SICILIAN_OPEN} Nc6 6. Bg5`],
      ['70-79', 'Sicilian Defense: Dragon', `${SICILIAN_OPEN} g6`],
      ['80-89', 'Sicilian Defense: Scheveningen', `${SICILIAN_OPEN} e6`],
      ['90-99', 'Sicilian Defense: Najdorf', `${SICILIAN_OPEN} a6`],
    ],
  ),
  volume(
    'C',
    'Open Games & French Defense',
    'The classical 1. e4 e5 openings — the Italian, the Ruy Lopez, the Scotch, the Vienna, the ' +
      "King's Gambit and Petrov's Defense — together with the French Defense, 1. e4 e6.",
    [
      ['00-02', 'French Defense: Advance, Exchange & Sidelines', '1. e4 e6'],
      ['03-09', 'French Defense: Tarrasch', `${FRENCH} 3. Nd2`],
      ['10-14', 'French Defense: Classical, Rubinstein & McCutcheon', `${FRENCH} 3. Nc3`],
      ['15-19', 'French Defense: Winawer', `${FRENCH} 3. Nc3 Bb4`],
      ['20', "King's Pawn Game: Unusual Second Moves", '1. e4 e5'],
      ['21-22', 'Center Game & Danish Gambit', '1. e4 e5 2. d4 exd4'],
      ['23-24', "Bishop's Opening", '1. e4 e5 2. Bc4'],
      ['25-29', 'Vienna Game', '1. e4 e5 2. Nc3'],
      ['30-32', "King's Gambit Declined", '1. e4 e5 2. f4'],
      ['33-39', "King's Gambit Accepted", '1. e4 e5 2. f4 exf4'],
      ['40', "King's Knight Opening: Latvian & Elephant Gambits", '1. e4 e5 2. Nf3'],
      ['41', 'Philidor Defense', '1. e4 e5 2. Nf3 d6'],
      ['42-43', "Petrov's Defense", '1. e4 e5 2. Nf3 Nf6'],
      ['44-45', 'Scotch Game & Ponziani Opening', '1. e4 e5 2. Nf3 Nc6'],
      ['46-49', 'Three Knights & Four Knights', '1. e4 e5 2. Nf3 Nc6 3. Nc3'],
      ['50-54', 'Italian Game: Giuoco Piano & Evans Gambit', '1. e4 e5 2. Nf3 Nc6 3. Bc4'],
      ['55-59', 'Italian Game: Two Knights Defense', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6'],
      ['60-64', 'Ruy Lopez: Classical, Schliemann & Steinitz Defenses', SPANISH],
      ['65-67', 'Ruy Lopez: Berlin Defense', `${SPANISH} Nf6`],
      ['68-69', 'Ruy Lopez: Exchange Variation', `${SPANISH} a6 4. Bxc6`],
      ['70-79', 'Ruy Lopez: Morphy Defense', `${SPANISH} a6 4. Ba4`],
      ['80-83', 'Ruy Lopez: Open', `${SPANISH} a6 4. Ba4 Nf6 5. O-O Nxe4`],
      ['84-99', 'Ruy Lopez: Closed', `${SPANISH} a6 4. Ba4 Nf6 5. O-O Be7`],
    ],
  ),
  volume(
    'D',
    'Closed & Semi-Closed Games',
    "1. d4 d5: the Queen's Gambit accepted and declined, the Slav and Semi-Slav, and the " +
      "Queen's Pawn systems without c4 — plus the Grünfeld Defense.",
    [
      ['00-05', "Queen's Pawn Game: London, Colle, Torre & Blackmar-Diemer", '1. d4 d5'],
      ['06-09', "Queen's Gambit: Chigorin, Albin & Rare Defenses", '1. d4 d5 2. c4'],
      ['10-19', 'Slav Defense', '1. d4 d5 2. c4 c6'],
      ['20-29', "Queen's Gambit Accepted", '1. d4 d5 2. c4 dxc4'],
      ['30-31', "Queen's Gambit Declined", '1. d4 d5 2. c4 e6'],
      ['32-34', 'Tarrasch Defense', '1. d4 d5 2. c4 e6 3. Nc3 c5'],
      ['35-36', "Queen's Gambit Declined: Exchange Variation", `${QUEENS_GAMBIT_DECLINED} 4. cxd5`],
      [
        '37-39',
        "Queen's Gambit Declined: Three Knights, Harrwitz & Ragozin",
        `${QUEENS_GAMBIT_DECLINED} 4. Nf3`,
      ],
      ['40-42', "Queen's Gambit Declined: Semi-Tarrasch", `${QUEENS_GAMBIT_DECLINED} 4. Nf3 c5`],
      ['43-49', 'Semi-Slav Defense', '1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 e6'],
      [
        '50-59',
        "Queen's Gambit Declined: Cambridge Springs, Lasker & Tartakower",
        `${QUEENS_GAMBIT_DECLINED} 4. Bg5`,
      ],
      [
        '60-69',
        "Queen's Gambit Declined: Orthodox Defense",
        `${QUEENS_GAMBIT_DECLINED} 4. Bg5 Be7 5. e3 O-O 6. Nf3 Nbd7`,
      ],
      ['70-79', 'Neo-Grünfeld Defense', '1. d4 Nf6 2. c4 g6 3. g3 d5'],
      ['80-84', 'Grünfeld Defense', GRUNFELD],
      ['85-89', 'Grünfeld Defense: Exchange Variation', `${GRUNFELD} 4. cxd5 Nxd5`],
      ['90-99', 'Grünfeld Defense: Three Knights & Russian', `${GRUNFELD} 4. Nf3`],
    ],
  ),
  volume(
    'E',
    'Indian Defenses',
    'Black meets 1. d4 with 1… Nf6 and, after 2. c4, either 2… e6 — the Nimzo-Indian, the ' +
      "Queen's Indian, the Bogo-Indian and the Catalan — or 2… g6, the King's Indian.",
    [
      ['00-09', 'Catalan Opening', '1. d4 Nf6 2. c4 e6 3. g3'],
      ['10', 'Blumenfeld Countergambit & 3. Nf3 Sidelines', '1. d4 Nf6 2. c4 e6 3. Nf3'],
      ['11', 'Bogo-Indian Defense', '1. d4 Nf6 2. c4 e6 3. Nf3 Bb4+'],
      ['12-19', "Queen's Indian Defense", '1. d4 Nf6 2. c4 e6 3. Nf3 b6'],
      ['20-23', 'Nimzo-Indian Defense', NIMZO_INDIAN],
      ['24-29', 'Nimzo-Indian Defense: Sämisch', `${NIMZO_INDIAN} 4. a3`],
      ['30-31', 'Nimzo-Indian Defense: Leningrad', `${NIMZO_INDIAN} 4. Bg5`],
      ['32-39', 'Nimzo-Indian Defense: Classical', `${NIMZO_INDIAN} 4. Qc2`],
      ['40-59', 'Nimzo-Indian Defense: Rubinstein', `${NIMZO_INDIAN} 4. e3`],
      ['60-61', "King's Indian Defense", '1. d4 Nf6 2. c4 g6'],
      [
        '62-69',
        "King's Indian Defense: Fianchetto",
        '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. Nf3 d6 5. g3',
      ],
      ['70-75', "King's Indian Defense: Normal & Averbakh", '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4'],
      ['76-79', "King's Indian Defense: Four Pawns Attack", `${KINGS_INDIAN} 5. f4`],
      ['80-89', "King's Indian Defense: Sämisch", `${KINGS_INDIAN} 5. f3`],
      ['90-99', "King's Indian Defense: Classical", `${KINGS_INDIAN} 5. Nf3`],
    ],
  ),
];

/** Whether `text` has the shape of an ECO code: a volume letter and two digits. */
export function isEcoCode(text: string): boolean {
  return /^[A-E][0-9]{2}$/.test(text);
}

const ALL_GROUPS = ECO_VOLUMES.flatMap((volume) => volume.groups);

/** The group an ECO code such as `B90` belongs to. */
export function ecoGroupOf(eco: string): EcoGroup {
  const group =
    isEcoCode(eco) && ALL_GROUPS.find((candidate) => candidate.from <= eco && eco <= candidate.to);
  if (!group) throw new Error(`${JSON.stringify(eco)} is not an ECO code`);
  return group;
}

/** `B90–B99`, or just `A00` for a single-code group. */
export function ecoRangeLabel({ from, to }: EcoGroup): string {
  return from === to ? from : `${from}–${to}`;
}
