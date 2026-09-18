/**
 * Learn the basics (task S9, docs/PLAN.md section 4).
 *
 * Two screens in one file, because they are two views of the same list:
 *   /learn        the three topics
 *   /learn/:topic one topic, block by block
 *
 * The blocks come from Danial's learn.json, in his order. A block is a piece
 * of text, a photo, or the list of train lines. Photos whose file is still TBC
 * never reach this screen: getLearnTopics() leaves them out.
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getLearnTopic, getLearnTopics, getLines } from '@/data';
import Card from '@/shared/Card';

/** The train lines, with the colour a visitor sees on the station signs. */
function LineList() {
  const { t } = useTranslation();
  return (
    <ul className="space-y-2">
      {getLines().map((line) => (
        <li key={line.id} className="flex items-center gap-3">
          <span
            aria-hidden="true"
            style={{ backgroundColor: line.colour }}
            className="size-3 shrink-0 rounded-full"
          />
          <span className="min-w-0 flex-1">{t(line.nameKey)}</span>
          {line.code ? (
            <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {line.code}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function TopicBlock({ block }) {
  const { t } = useTranslation();

  if (block.type === 'text') return <p className="text-slate-700">{t(block.key)}</p>;
  if (block.type === 'lines') return <LineList />;
  if (block.type === 'photo') {
    return (
      <figure>
        <img src={block.src} alt="" loading="lazy" className="w-full rounded-xl" />
        <figcaption className="mt-1 text-sm text-slate-500">{t(block.captionKey)}</figcaption>
      </figure>
    );
  }
  // An unknown block type from a newer data file: show nothing rather than break.
  return null;
}

/** /learn : the list of topics. */
function TopicList() {
  const { t } = useTranslation();
  const topics = useMemo(() => getLearnTopics(), []);

  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('learn.title', 'Learn the basics')}</h1>
      <p className="mt-1 text-slate-600">
        {t('learn.subtitle', 'Three quick guides to getting around by train.')}
      </p>

      {topics.length === 0 ? (
        <p className="mt-4 text-slate-500">{t('ui.comingSoon', 'Coming soon.')}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {topics.map((topic) => (
            <li key={topic.id}>
              <Card as={Link} to={`/learn/${topic.id}`} interactive>
                <span className="font-medium">{t(topic.titleKey)}</span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** /learn/:topic : one topic. */
function Topic({ id }) {
  const { t } = useTranslation();
  const topic = useMemo(() => getLearnTopic(id), [id]);

  if (!topic) {
    return (
      <section>
        <h1 className="text-2xl font-semibold">
          {t('ui.notFound', "We couldn't find that page.")}
        </h1>
        <Link
          to="/learn"
          className="mt-4 inline-flex min-h-11 items-center font-medium text-teal-700"
        >
          {t('learn.title', 'Learn the basics')}
        </Link>
      </section>
    );
  }

  return (
    <section className="pb-4">
      <p className="text-sm text-slate-500">{t('learn.title', 'Learn the basics')}</p>
      <h1 className="text-2xl font-semibold">{t(topic.titleKey)}</h1>

      <div className="mt-4 space-y-4">
        {topic.blocks.map((block, index) => (
          <TopicBlock key={block.key ?? block.src ?? `${block.type}-${index}`} block={block} />
        ))}
      </div>
    </section>
  );
}

export default function LearnScreen() {
  const { topic } = useParams();
  return topic ? <Topic id={topic} /> : <TopicList />;
}
