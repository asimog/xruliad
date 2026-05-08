import { describe, expect, it } from 'vitest';
import { parseOverlayConfigs } from '../src/lib/overlay';

describe('parseOverlayConfigs', () => {
  it('parses CSV-style overlay params and falls back safely', () => {
    const search = new URLSearchParams(
      'token=aaa,bbb&chain=solana,base&size=large,medium&theme=dark,light&show_sponsor=true,false&sponsor_label=One,Two',
    );

    expect(parseOverlayConfigs(search)).toEqual([
      {
        token: 'aaa',
        chain: 'solana',
        position: 'bottom-right',
        size: 'large',
        theme: 'dark',
        showSponsor: true,
        sponsorLabel: 'One',
      },
      {
        token: 'bbb',
        chain: 'base',
        position: 'bottom-right',
        size: 'medium',
        theme: 'light',
        showSponsor: false,
        sponsorLabel: 'Two',
      },
    ]);
  });
});
