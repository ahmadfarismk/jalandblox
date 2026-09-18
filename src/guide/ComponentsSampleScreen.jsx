/**
 * Sample page for task S1: every shared component in every state.
 *
 * This is a page for us, not for tourists, so its labels are plain English in
 * this file. Real screens keep the rule from docs/PLAN.md section 6: all
 * visible text comes from the locale files. The components themselves hold no
 * text of their own — every word comes from the screen that uses them.
 *
 * Delete this file (and the temporary line in GuideHomeScreen.jsx) once the
 * team has checked the components on a phone.
 */
import { useState } from 'react';
import Avatar from '@/shared/Avatar';
import BottomTabs from '@/shared/BottomTabs';
import Button from '@/shared/Button';
import Card from '@/shared/Card';
import StampBadge from '@/shared/StampBadge';

function Section({ title, hint, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</span>
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  );
}

export default function ComponentsSampleScreen() {
  const [busy, setBusy] = useState(false);
  const [taps, setTaps] = useState(0);

  return (
    <div className="pb-4">
      <h1 className="text-2xl font-semibold">Shared components</h1>
      <p className="mt-2 text-sm text-slate-500">
        Task S1. A page for the team, not for tourists. Every state of Button, Card, StampBadge,
        Avatar and the bottom tabs.
      </p>

      <Section title="Button" hint="44px tall, or 56px at size lg.">
        <Row label="Primary">
          <Button>I&rsquo;m Here</Button>
          <Button size="lg">Take me there</Button>
        </Row>
        <Row label="Secondary and quiet">
          <Button variant="secondary">Open in Google Maps</Button>
          <Button variant="quiet">Skip</Button>
        </Row>
        <Row label="Full width">
          <Button fullWidth size="lg">
            I&rsquo;m Here
          </Button>
        </Row>
        <Row label="Disabled">
          <Button disabled>Primary</Button>
          <Button variant="secondary" disabled>
            Secondary
          </Button>
          <Button variant="quiet" disabled>
            Quiet
          </Button>
        </Row>
        <Row label="Busy (waiting for GPS, sending a review)">
          <Button busy={busy} onClick={() => setBusy(true)}>
            {busy ? 'Checking…' : 'Tap to go busy'}
          </Button>
          <Button variant="quiet" onClick={() => setBusy(false)}>
            Reset
          </Button>
        </Row>
        <Row label="As a link (same look, opens a web address)">
          <Button as="a" variant="secondary" href="https://maps.google.com" rel="noreferrer">
            Open in Google Maps
          </Button>
        </Row>
      </Section>

      <Section title="Card" hint="A plain box, or a tappable row.">
        <Card>
          <h3 className="font-medium">Plain card</h3>
          <p className="mt-1 text-sm text-slate-500">
            Holds anything: a landmark story, a route step, an opening hours note.
          </p>
        </Card>

        <Card interactive as="button" onClick={() => setTaps((n) => n + 1)}>
          <div className="flex items-center gap-3">
            <StampBadge kind="gold" size="sm" />
            <span className="flex-1">
              <span className="block font-medium">Tappable card</span>
              <span className="block text-sm text-slate-500">Tapped {taps} times</span>
            </span>
            <span aria-hidden="true" className="text-slate-400">
              ›
            </span>
          </div>
        </Card>

        <Card padded={false}>
          <div className="flex h-24 items-center justify-center bg-slate-100 text-sm text-slate-400">
            photo goes here
          </div>
          <div className="p-4 text-sm text-slate-500">
            Card with padded set to false, for a photo that reaches the edges.
          </div>
        </Card>
      </Section>

      <Section title="StampBadge" hint="Three states: none, outline, gold.">
        <Row label="Large (passport grid)">
          <StampBadge kind="none" size="lg" caption="Not yet" />
          <StampBadge kind="outline" size="lg" caption="3 Oct" />
          <StampBadge kind="gold" size="lg" caption="3 Oct" />
        </Row>
        <Row label="Medium">
          <StampBadge kind="none" />
          <StampBadge kind="outline" />
          <StampBadge kind="gold" />
        </Row>
        <Row label="Small (list rows)">
          <StampBadge kind="none" size="sm" />
          <StampBadge kind="outline" size="sm" />
          <StampBadge kind="gold" size="sm" />
        </Row>
        <Row label="With a spoken label for screen readers">
          <StampBadge kind="gold" label="Gold stamp" />
        </Row>
      </Section>

      <Section title="Avatar" hint="Three circles in SVG. One colour, no face, no gender.">
        <Row label="Sizes">
          <Avatar size="sm" />
          <Avatar />
          <Avatar size="lg" />
        </Row>
        <Row label="Takes the text colour around it">
          <Avatar size="lg" className="text-teal-700" />
          <Avatar size="lg" className="text-slate-900" />
        </Row>
      </Section>

      <Section
        title="Bottom tabs"
        hint="Shown inline here. On a real screen it sits fixed at the bottom. Labels come from the language files."
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <BottomTabs fixed={false} />
        </div>
      </Section>
    </div>
  );
}
