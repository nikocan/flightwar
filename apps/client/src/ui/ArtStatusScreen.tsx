import { ART_CATEGORY_LABELS, ART_MANIFEST, type ArtCategory } from '@sfe/shared';
import { artState } from '../game/assets/artSprites';
import { useApp } from '../state/app';
import { TopBar } from './common';

const STATE_LABEL: Record<string, string> = {
  'awaiting-art': '⏳ Bekleniyor',
  missing: '⚠️ Onaylı ama dosya yok',
  invalid: '🔴 Dosya hatalı',
  ready: '✅ Oyunda kullanılıyor',
};

/**
 * In-game view of the production art package (approved artwork lock): which of the 124 assets
 * have been delivered, validated and approved. Nothing is marked done until the file is loaded.
 */
export function ArtStatusScreen() {
  const go = useApp((s) => s.go);
  const cats = Object.keys(ART_CATEGORY_LABELS) as ArtCategory[];
  const ready = ART_MANIFEST.filter((a) => artState(a.id).state === 'ready').length;
  return (
    <div className="screen" data-testid="art-status">
      <div className="bg-gradient" />
      <TopBar title="Grafik Paketi Durumu" onBack={() => go({ id: 'settings', from: 'menu' })} />
      <div className="page screen-scroll">
        <div className="updates">
          <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
            Onaylı grafik sayfasına birebir uygun, arka planı şeffaf <b>PNG/WebP</b> dosyaları bekleniyor.
            Her dosya ancak oyunda yüklenip görsel olarak doğrulandıktan sonra kullanılır; o zamana kadar mevcut görseller korunur.
            <br />
            Oyunda kullanılan: <b style={{ color: 'var(--blue-bright)' }}>{ready} / {ART_MANIFEST.length}</b>
          </p>
          {cats.map((c) => {
            const items = ART_MANIFEST.filter((a) => a.category === c);
            const done = items.filter((a) => artState(a.id).state === 'ready').length;
            return (
              <details key={c} className="panel release">
                <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
                  {ART_CATEGORY_LABELS[c]} — {done}/{items.length}
                </summary>
                <ul>
                  {items.map((a) => (
                    <li key={a.id}>
                      <code>{a.id}</code> · {a.sourceWidth}×{a.sourceHeight}
                      {a.frames ? ` · ${a.frames.count} kare` : ''} · {STATE_LABEL[artState(a.id).state]}
                      <div className="muted" style={{ fontSize: 12 }}>{a.reference}</div>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
