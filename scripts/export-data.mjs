import fs from 'node:fs/promises';
import { days, sources, guides, conflicts } from '../src/data.ts';
await fs.mkdir('docs', { recursive: true });
await fs.writeFile(
  'docs/itinerary.json',
  JSON.stringify(
    { version: 1, timezone: 'Asia/Tokyo', days, conflicts },
    null,
    2,
  ),
);
await fs.writeFile(
  'docs/research.json',
  JSON.stringify({ sources, guides }, null, 2),
);
await fs.writeFile(
  'docs/SOURCES.md',
  '# 旅遊資訊來源索引\n\n' +
    sources
      .map(
        (s) =>
          `- [${s.title}](${s.url}) · ${s.confidence} · ${s.checked}\n  ${s.facts.join(' ')}\n`,
      )
      .join('\n'),
);
console.log(
  `${days.length} days / ${days.flatMap((d) => d.stops).length} cards / ${sources.length} sources / ${guides.length} guides exported`,
);
