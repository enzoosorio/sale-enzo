import type { LegalContent } from '@/content/legal';

const dateFormatter = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

interface LegalPageProps {
  content: LegalContent;
  /** Eyebrow shown above the title. */
  eyebrow?: string;
}

/** Renders an editable legal/informational content object with a readable measure. */
export function LegalPage({ content, eyebrow = 'Sale Enzo / Información' }: LegalPageProps) {
  const { title, intro, updatedAt, sections } = content;
  return (
    <article className="bg-off-white px-5 py-12 md:px-16 md:py-20 font-inria text-foreground">
      <div className="mx-auto max-w-[65ch]">
        <header className="mb-10 border-b border-black/15 pb-8">
          <p className="text-xs uppercase tracking-[0.25em] mb-4">{eyebrow}</p>
          <h1 className="font-prata text-3xl md:text-5xl mb-4 text-balance">{title}</h1>
          {intro && <p className="text-lg text-black/75 text-pretty">{intro}</p>}
          <p className="mt-6 text-sm text-black/60">
            Última actualización: <time dateTime={updatedAt}>{dateFormatter.format(new Date(`${updatedAt}T00:00:00Z`))}</time>
          </p>
        </header>
        <div className="space-y-10">
          {sections.map(section => (
            <section key={section.heading} className="space-y-3">
              <h2 className="font-prata text-xl md:text-2xl text-balance">{section.heading}</h2>
              {section.paragraphs?.map(paragraph => (
                <p key={paragraph} className="leading-relaxed text-pretty break-words">{paragraph}</p>
              ))}
              {section.list && (
                <ul className="list-disc space-y-2 pl-5 leading-relaxed marker:text-black/40">
                  {section.list.map(item => (
                    <li key={item} className="text-pretty break-words">{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
