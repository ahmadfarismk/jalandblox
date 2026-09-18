import { describe, expect, it } from 'vitest';
import { getLearnTopic, getLearnTopics, getLines } from '@/data';
import en from '@/data/locales/en.json';
import ms from '@/data/locales/ms.json';

/** Follows a key like "learnTopics.touch-n-go.t1" into a language file. */
const text = (file, key) => key.split('.').reduce((o, k) => o?.[k], file);

describe('the Learn screens have something to show', () => {
  const topics = getLearnTopics();

  it('has the three topics the plan asks for', () => {
    expect(topics.map((topic) => topic.id)).toEqual([
      'touch-n-go',
      'line-colours',
      'reading-signs',
    ]);
  });

  it('can be read in both languages, with no empty text', () => {
    for (const topic of topics) {
      for (const file of [en, ms]) {
        expect(text(file, topic.titleKey), topic.titleKey).toBeTruthy();
        for (const block of topic.blocks) {
          if (block.type === 'text') expect(text(file, block.key), block.key).toBeTruthy();
          if (block.type === 'photo') {
            expect(text(file, block.captionKey), block.captionKey).toBeTruthy();
          }
        }
      }
    }
  });

  it('only shows block types the screen knows how to draw', () => {
    const known = ['text', 'photo', 'lines'];
    for (const topic of topics) {
      for (const block of topic.blocks) expect(known).toContain(block.type);
    }
  });

  it('never shows a photo whose file is still TBC', () => {
    for (const topic of topics) {
      for (const block of topic.blocks) {
        if (block.type === 'photo') expect(block.src).toBeTruthy();
      }
    }
  });

  it('draws every train line with a name and a colour', () => {
    const lines = getLines();
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(text(en, line.nameKey), line.id).toBeTruthy();
      expect(line.colour, line.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('gives nothing for a topic that does not exist', () => {
    expect(getLearnTopic('not-a-topic')).toBeNull();
  });
});
