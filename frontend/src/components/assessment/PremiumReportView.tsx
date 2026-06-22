import {
  CheckCircle2,
  ClipboardList,
  Compass,
  ListChecks,
  Map,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

// Section heading -> icon + accent. Falls back to a neutral style for any
// unexpected heading so AI-generated reports never break the layout.
const SECTION_META: { match: RegExp; icon: LucideIcon; accent: string }[] = [
  { match: /overview/i, icon: Compass, accent: 'text-primary' },
  { match: /strength/i, icon: CheckCircle2, accent: 'text-emerald-600' },
  { match: /weakness|gap/i, icon: TriangleAlert, accent: 'text-amber-600' },
  { match: /recommend/i, icon: ListChecks, accent: 'text-sky-600' },
  { match: /roadmap|plan/i, icon: Map, accent: 'text-bronze' },
];

const metaFor = (heading: string) =>
  SECTION_META.find((s) => s.match.test(heading)) ?? {
    icon: ClipboardList,
    accent: 'text-muted-foreground',
  };

type Section = { heading: string; lines: string[] };

function parseSections(content: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const raw of content.split('\n')) {
    const line = raw.trimEnd();
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      current = { heading: heading[1].trim(), lines: [] };
      sections.push(current);
    } else if (line.trim() !== '') {
      if (!current) {
        current = { heading: '', lines: [] };
        sections.push(current);
      }
      current.lines.push(line);
    }
  }
  return sections;
}

function SectionBody({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
      {lines.map((line, i) => {
        const bullet = line.match(/^[-*]\s+(.*)$/);
        const numbered = line.match(/^(\d+)\.\s+(.*)$/);
        if (bullet) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{bullet[1]}</span>
            </div>
          );
        }
        if (numbered) {
          return (
            <div key={i} className="flex gap-2">
              <span className="font-semibold text-foreground">
                {numbered[1]}.
              </span>
              <span>{numbered[2]}</span>
            </div>
          );
        }
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export function PremiumReportView({ content }: { content: string }) {
  const sections = parseSections(content);

  // If the content has no markdown headings, render it as a single block.
  if (sections.length === 0 || sections.every((s) => s.heading === '')) {
    return (
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {content}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section, i) => {
        if (!section.heading) {
          return <SectionBody key={i} lines={section.lines} />;
        }
        const { icon: Icon, accent } = metaFor(section.heading);
        return (
          <div key={i} className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent">
                <Icon className={`h-4 w-4 ${accent}`} />
              </span>
              <h3 className="font-display text-base font-semibold tracking-tight">
                {section.heading}
              </h3>
            </div>
            <div className="border-l-2 border-bronze/30 pl-4 leading-relaxed">
              <SectionBody lines={section.lines} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
