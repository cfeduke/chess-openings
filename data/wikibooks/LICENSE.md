# Lines from Chess Opening Theory — source and licensing

## Source

`pages.tsv` is taken from [Chess Opening Theory](https://en.wikibooks.org/wiki/Chess_Opening_Theory),
a Wikibook written and maintained by Wikibooks contributors. `SOURCE.json` records the day the
book was read.

Each row is one page of the book, and names it twice over:

| Column     | What it is                               | Where it leads                                                       |
| ---------- | ---------------------------------------- | -------------------------------------------------------------------- |
| `page`     | The wiki's id for the page               | `https://en.wikibooks.org/wiki/Special:Redirect/page/<page>`         |
| `revision` | The revision of the page that was read   | `https://en.wikibooks.org/wiki/Special:Redirect/revision/<revision>` |
| `name`     | What the page calls its position, if any | —                                                                    |
| `pgn`      | The moves in the page's title            | —                                                                    |

The authors of a page are the contributors listed in its history, which is a click away from
either address.

## License

The text of the book is available under the
[Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/)
(CC BY-SA 4.0). `pages.tsv` is adapted from it and is offered under the same licence: you may copy
and adapt it, provided you credit Chess Opening Theory and its contributors, link to the licence,
say what you changed, and share what you make of it under the same terms.

## What was taken, and what was changed

- **Names** are copied from each page: from the `Chess Opening Theory/Position` template that
  heads it or, failing that, from its first heading. Runs of spaces were made single. A page that
  names nothing has an empty name here.
- **Moves** are read from each page's title (`Chess Opening Theory/1. e4/1...e5`) and rewritten in
  canonical algebraic notation: titles leave off the marks for check and mate.
- **Pages that are not lines** — the book's indexes and manuals — and pages whose title is not a
  legal game are left out.
- **None of the book's prose is here.** The site links to each page for that.

The ECO code the site shows beside each line, and the sections, groups and families it files the
lines under, are this project's and not the book's.
