import { parseM3U, exportM3U, slugifyChannelName, getUrlBase } from '../../src/lib/m3u/parser';

describe('M3U Parser', () => {
  test('parses EXTM3U without attributes', () => {
    const input = `#EXTM3U\n#EXTINF:-1,Ch\nhttp://x`;
    const res = parseM3U(input);
    expect(Object.keys(res.header)).toHaveLength(0);
  });

  test('parses simple M3U with header', () => {
    const input = `#EXTM3U x-tvg-url="http://example.com/epg.xml"
#EXTINF:-1 tvg-id="id1" tvg-name="Channel One" tvg-logo="logo1.png" group-title="News",Channel One
http://example.com/stream1.m3u8`;
    const res = parseM3U(input);
    expect(res.header['x-tvg-url']).toBe('http://example.com/epg.xml');
    expect(res.tracks).toHaveLength(1);
    expect(res.tracks[0].attrs['tvg-id']).toBe('id1');
    expect(res.tracks[0].name).toBe('Channel One');
    expect(res.tracks[0].url).toContain('stream1');
  });

  test('parses attributes from EXTINF regardless of quotes', () => {
    const input = `#EXTM3U\n#EXTINF:-1 tvg-id='id2' tvg-name=ChannelTwo group-title=Sports,Channel Two\nhttp://s/2`;
    const res = parseM3U(input);
    expect(res.tracks[0].attrs['tvg-id']).toBe('id2');
    expect(res.tracks[0].attrs['tvg-name']).toBe('ChannelTwo');
    expect(res.tracks[0].attrs['group-title']).toBe('Sports');
  });

  test('accepts missing duration before attributes', () => {
    const input = `#EXTM3U\n#EXTINF: tvg-id=id tvg-name=Name,Name\nhttp://s`;
    const res = parseM3U(input);
    expect(res.tracks[0].duration).toBeNull();
    expect(res.tracks[0].attrs['tvg-id']).toBe('id');
  });

  test('tolerates bare URL without EXTINF', () => {
    const input = `#EXTM3U\nhttp://bare/url`;
    const res = parseM3U(input);
    expect(res.tracks).toHaveLength(1);
    expect(res.tracks[0].name).toBe('http://bare/url');
  });

  test('captures extras between EXTINF and URL', () => {
    const input = `#EXTM3U\n#EXTINF:-1 tvg-name="X",X\n#KODIPROP:inputstream.adaptive.manifest_type=hls\n#EXTGRP:Special\nhttp://s/x`;
    const res = parseM3U(input);
    expect(res.tracks[0].extras).toBeDefined();
    expect(res.tracks[0].attrs['group-title']).toBe('Special');
  });

  test('maps #EXTGRP to group-title when absent', () => {
    const input = `#EXTM3U\n#EXTINF:-1 tvg-name=X,X\n#EXTGRP:Sports\nhttp://s/x`;
    const res = parseM3U(input);
    expect(res.tracks[0].attrs['group-title']).toBe('Sports');
  });

  test('export preserves attributes and extras', () => {
    const input = `#EXTM3U url-tvg=epg.xml\n#EXTINF:-1 tvg-id=id tvg-name=Name,Name\n#EXTVLCOPT:http-user-agent=UA\nhttp://s`;
    const pl = parseM3U(input);
    const out = exportM3U(pl);
    expect(out).toMatch(/#EXTM3U/);
    expect(out).toMatch(/#EXTVLCOPT/);
    expect(out).toMatch(/tvg-id="id"/);
  });

  test('slugifyChannelName', () => {
    expect(slugifyChannelName('Canal Ñandú HD+')).toBe('canal-nandu-hd');
  });

  test('getUrlBase', () => {
    expect(getUrlBase('https://host/path/one/two/stream.m3u8?x=1')).toContain('host/path/one');
  });

  describe('edge cases and broken lists', () => {
    const cases: Array<[string, (out: ReturnType<typeof parseM3U>) => void]> = [
      [
        '#EXTM3U\n#EXTINF:-1,Name\nnot-a-url',
        (out) => {
          expect(out.tracks[0].url).toBe('not-a-url');
        },
      ],
      [
        '#EXTM3U\n#EXTINF:-1 tvg-id= id=bad,Name\nhttp://x',
        (out) => {
          expect(out.tracks[0].name).toBe('Name');
        },
      ],
      [
        '#EXTM3U\n#EXTINF:-1 tvg-id="a=b" tvg-name="C, D",C, D\nhttp://x',
        (out) => {
          expect(out.tracks[0].attrs['tvg-id']).toBe('a=b');
          expect(out.tracks[0].name).toBe('C, D');
        },
      ],
      [
        '#EXTM3U\n#EXTINF:-1 catchup=default catchup-source=\"${start}-${end}\",N\nhttp://x',
        (out) => {
          expect(out.tracks[0].attrs['catchup']).toBe('default');
          expect(out.tracks[0].attrs['catchup-source']).toContain('${start}');
        },
      ],
      [
        '#EXTM3U\n#EXTINF:-1 tvg-id=ID tvg-shift=+2,Name\nhttp://x',
        (out) => {
          expect(out.tracks[0].attrs['tvg-shift']).toBe('+2');
        },
      ],
      [
        '#EXTM3U\n#EXTINF:-1 tvg-name=,\nhttp://x',
        (out) => {
          expect(out.tracks[0].name).toBe('');
        },
      ],
      [
        '#EXTM3U\n#EXTINF:-1 tvg-name=Name Name,Name Name\nhttp://x',
        (out) => {
          expect(out.tracks[0].attrs['tvg-name']).toBe('Name');
        },
      ],
      [
        '#EXTM3U url-tvg="epg.xml" deinterlace=auto\n#EXTINF:-1,N\nhttp://x',
        (out) => {
          expect(out.header['url-tvg']).toBe('epg.xml');
        },
      ],
      [
        '#EXTM3U\n#EXTINF: ,N\nhttp://x',
        (out) => {
          expect(out.tracks[0].duration).toBeNull();
        },
      ],
    ];

    for (const [input, assertFn] of cases) {
      test(`handles case: ${input.slice(0, 40)}...`, () => {
        const out = parseM3U(input);
        assertFn(out);
      });
    }
  });

  describe('attribute and header variants', () => {
    test('header with single quotes and extra spaces', () => {
      const input = `#EXTM3U   url-tvg='epg.xml'   x-tvg-url=\"http://x\"\n#EXTINF:-1,N\nhttp://u`;
      const out = parseM3U(input);
      expect(out.header['url-tvg']).toBe('epg.xml');
      expect(out.header['x-tvg-url']).toBe('http://x');
    });

    test('attributes with dots and underscores', () => {
      const input = `#EXTM3U\n#EXTINF:-1 tvg.id=abc tvg_name=Foo.Bar,Name\nhttp://u`;
      const out = parseM3U(input);
      expect(out.tracks[0].attrs['tvg.id']).toBe('abc');
      expect(out.tracks[0].attrs['tvg_name']).toBe('Foo.Bar');
    });

    test('unknown attributes preserved', () => {
      const input = `#EXTM3U\n#EXTINF:-1 x-foo=bar y-baz=qux,Name\nhttp://u`;
      const out = parseM3U(input);
      expect(out.tracks[0].attrs['x-foo']).toBe('bar');
      expect(out.tracks[0].attrs['y-baz']).toBe('qux');
    });

    test('negative duration supported', () => {
      const input = `#EXTM3U\n#EXTINF:-1,Name\nhttp://u`;
      const out = parseM3U(input);
      expect(out.tracks[0].duration).toBe(-1);
    });

    test('duration omitted when not numeric', () => {
      const input = `#EXTM3U\n#EXTINF:abc tvg-id=id,Name\nhttp://u`;
      const out = parseM3U(input);
      expect(out.tracks[0].duration).toBeNull();
      expect(out.tracks[0].attrs['tvg-id']).toBe('id');
    });

    test('name with commas inside quotes', () => {
      const input = `#EXTM3U\n#EXTINF:-1 tvg-name=\"A, B\",A, B\nhttp://u`;
      const out = parseM3U(input);
      expect(out.tracks[0].name).toBe('A, B');
      expect(out.tracks[0].attrs['tvg-name']).toBe('A, B');
    });

    test('audio-track and aspect-ratio', () => {
      const input = `#EXTM3U\n#EXTINF:-1 audio-track=spa aspect-ratio=16:9,Name\nhttp://u`;
      const out = parseM3U(input);
      expect(out.tracks[0].attrs['audio-track']).toBe('spa');
      expect(out.tracks[0].attrs['aspect-ratio']).toBe('16:9');
    });

    test('export uses preferred order then alpha', () => {
      const input = `#EXTM3U\n#EXTINF:-1 x=1 tvg-name=Name tvg-logo=L group-title=G tvg-id=ID a=2,Name\nhttp://u`;
      const out = parseM3U(input);
      const exp = exportM3U(out);
      const extinf = exp.split('\n')[1];
      // Ensure tvg-id appears before tvg-name, tvg-logo, group-title
      const idxId = extinf.indexOf('tvg-id=');
      const idxName = extinf.indexOf('tvg-name=');
      const idxLogo = extinf.indexOf('tvg-logo=');
      const idxGroup = extinf.indexOf('group-title=');
      expect(idxId).toBeGreaterThan(0);
      expect(idxId).toBeLessThan(idxName);
      expect(idxName).toBeLessThan(idxLogo);
      expect(idxLogo).toBeLessThan(idxGroup);
    });

    const moreCases = [
      `#EXTM3U\n#EXTINF:-1 catchup=default,Name\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1 catchup-days=7,Name\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1 catchup-source=\"${'{start}'}\",Name\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1 tvg-logo=http://logo.png,Name\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1 group=Drama,Name\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1 tvg-name=\" C \" , C \nhttp://u`,
      `#EXTM3U\n#EXTINF: -1 , N \nhttp://u`,
      `#EXTM3U\n#EXTINF:-1   ,N\nhttp://u`,
      `#EXTM3U\n#EXTINF:0,N\nhttp://u`,
      `#EXTM3U\n#EXTINF:10,N\nhttp://u`,
      `#EXTM3U\n#EXTINF:-10,N\nhttp://u`,
      `#EXTM3U\n#EXTINF:0 tvg-id=I,N\nhttp://u`,
      `#EXTM3U\n#EXTINF:0 tvg-name=N,N\nhttp://u`,
      `#EXTM3U\n#EXTINF:0 tvg-shift=-3,N\nhttp://u`,
      `#EXTM3U\n#EXTINF:0 bad-attr,Name\nhttp://u`,
      `#EXTM3U\n#EXTINF:0 k=v w=x,Name\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1 tvg-name=\'Q\',Q\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1 tvg-name=\"Q\",Q\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1 tvg-name=Q,Q\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1 tvg-id=,N\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1 tvg-id= \,N\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1 tvg-id=ID,t\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1 tvg-name=Nombre Largo HD 4K,Nombre Largo HD 4K\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1 tvg-name=Ñandú,Ñandú\nhttp://u`,
      `#EXTM3U url-tvg=epg.xml\n#EXTINF:-1,N\nhttp://u`,
      `#EXTM3U x-tvg-url=http://epg\n#EXTINF:-1,N\nhttp://u`,
      `#EXTM3U deinterlace=auto aspect=21:9\n#EXTINF:-1,N\nhttp://u`,
      `#EXTM3U \n#EXTINF:-1,N\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1,N\n#EXTVLCOPT:http-user-agent=UA\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1,N\n#KODIPROP:inputstream=adaptive\nhttp://u`,
      `#EXTM3U\n#EXTINF:-1,N\n#EXTGRP:Group\nhttp://u`,
    ];

    for (const input of moreCases) {
      test(`parses variant: ${input.slice(0, 40)}...`, () => {
        const out = parseM3U(input);
        expect(out.tracks.length).toBe(1);
      });
    }
  });
});


