export default function AdPage({ onMessageSeller }: { onMessageSeller: () => void }): JSX.Element {
  const css = `
    :root{
      /* Color scheme inspired by the screenshot */
      --bg:#0f1720;            /* page background */
      --panel:#111b25;         /* cards, bars */
      --panel-2:#0c141c;       /* darker */
      --text:#f1f5f9;          /* primary text */
      --muted:#93a4b5;         /* secondary text */
      --accent:#2b67ff;        /* BayLike blue */
      --accent-2:#7ea3ff;      /* lighter blue */
      --ok:#20c997;            /* success */
      --warning:#ffcc66;       /* warning */
      --chip:#1a2532;          /* chip bg */
      --border:#1e2937;        /* hairline */
      --shadow: 0 8px 30px rgba(0,0,0,.35);
      --radius:16px;
    }
    *{box-sizing:border-box}
    html,body{margin:0;background:var(--bg);color:var(--text);font:16px/1.45 system-ui, -apple-system, Segoe UI, Roboto, Inter,Arial, sans-serif}
    a{color:var(--accent);text-decoration:none}
    .wrap{max-width:960px;margin-inline:auto;padding:12px 12px 72px}

    /* Top app bar */
    .appbar{position:sticky;top:0;z-index:10;background:linear-gradient(180deg,var(--panel),var(--panel-2));box-shadow:var(--shadow);}
    .appbar-inner{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px}
    .brand{display:flex;align-items:center;gap:10px;font-weight:700;letter-spacing:.2px}
    .logo{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:var(--accent);color:#fff;font-weight:800}
    .brand .name{font-size:20px}
    .safety{color:var(--muted);font-size:14px;display:none}
    @media (min-width:480px){.safety{display:block}}

    /* Listing header */
    .listing-head{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--panel);padding:12px 14px;border:1px solid var(--border);border-radius:12px;margin:12px auto}
    .listing-title{font-size:18px;font-weight:700;}
    .listing-sub{color:var(--muted);font-size:14px}
    .order{color:var(--muted);font-weight:600}

    /* Grid */
    .grid{display:grid;gap:14px}
    @media (min-width:720px){
      .grid{grid-template-columns: 1.05fr .95fr}
    }

    /* Media card */
    .card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow)}
    .media{position:relative;overflow:hidden}
    .media-meta{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;color:var(--muted);font-size:13px}

    /* Details */
    .pad{padding:14px 16px}
    .price{display:flex;align-items:baseline;gap:8px}
    .price .amount{font-size:28px;font-weight:800}
    .price .chip{background:var(--chip);padding:4px 8px;border-radius:999px;color:var(--accent-2);font-size:12px;border:1px solid var(--border)}

    .cta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
    .btn{appearance:none;border:none;border-radius:12px;padding:12px 14px;font-weight:700;cursor:pointer}
    .btn.primary{background:var(--accent);color:#fff}
    .btn.ghost{background:transparent;color:var(--text);border:1px solid var(--border)}

    /* Info blocks */
    .info{display:grid;gap:10px}
    .blk{background:var(--panel);border:1px solid var(--border);border-radius:12px}
    .blk h3{margin:0 0 6px 0;font-size:16px}
    .specs{display:grid;grid-template-columns:1fr;gap:8px}
    .row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px dashed var(--border)}
    .row:last-child{border-bottom:none}
    .row .k{color:var(--muted)}

    .seller{display:flex;align-items:center;gap:12px}
    .avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#5b8cff)}
    .seller .meta{display:flex;flex-direction:column}
    .badge{display:inline-block;background:var(--chip);border:1px solid var(--border);padding:2px 8px;border-radius:999px;color:var(--muted);font-size:12px}

    /* Footer */
    footer{margin:28px auto 0;color:var(--muted);font-size:13px;text-align:center}
    .tiny{opacity:.8}
  `;

  return (
    <div>
      <style>{css}</style>
      <header className="appbar">
        <div className="appbar-inner wrap" style={{ paddingInline: "12px" }}>
          <div className="brand">
            <div className="logo" aria-hidden="true">B</div>
            <div className="name">BayLike</div>
          </div>
          <div className="safety">Secure • Buyer Protection</div>
        </div>
      </header>

      <main className="wrap">
        <section className="listing-head">
          <div>
            <div className="listing-title">W1‑SH Handheld Computer (late 1990s)</div>
            <div className="listing-sub">Listed by <strong>Emilia Smith</strong></div>
          </div>
          <div className="order">Ad • ID BL‑7421</div>
        </section>

        <section className="grid">
          {/* LEFT: media */}
          <article className="card media">
            <img
              src={`${import.meta.env.BASE_URL}images/w1sh-ad2.png`}
              alt="W1-SH handheld device"
              style={{ width: "100%", display: "block" }}
            />
            <div className="media-meta">
              <div>1 photo • Portrait</div>
              <div>Posted today</div>
            </div>
          </article>

          {/* RIGHT: details */}
          <aside className="card pad">
            <div className="price">
              <div className="amount">$50</div>
              <span className="chip">Used · Working</span>
            </div>
            <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>
              Vintage handheld computer <strong>W1‑SH</strong> from the late 1990s. Includes <strong>2×AA batteries</strong>. Screen powers on and the device should work. No manual available; seller has limited technical details.
            </p>
            <div className="cta">
              <button className="btn primary">Buy Now</button>
              <button className="btn ghost" onClick={onMessageSeller}>Message Seller</button>
            </div>

            <div className="info" style={{ marginTop: "14px" }}>
              <div className="blk pad">
                <h3>Item details</h3>
                <div className="specs">
                  <div className="row"><span className="k">Model</span><span>W1‑SH</span></div>
                  <div className="row"><span className="k">Era</span><span>Late 1990s</span></div>
                  <div className="row"><span className="k">Condition</span><span>Used — should work</span></div>
                  <div className="row"><span className="k">Power</span><span>2×AA batteries (included)</span></div>
                  <div className="row"><span className="k">Manual</span><span>Not included</span></div>
                  <div className="row"><span className="k">Known specs</span><span>Unknown/undocumented</span></div>
                </div>
              </div>

              <div className="blk pad">
                <h3>Seller</h3>
                <div className="seller">
                  <div className="avatar" aria-hidden="true"></div>
                  <div className="meta">
                    <strong>Emilia Smith</strong>
                    <span className="badge">Verified seller</span>
                  </div>
                </div>
                <p style={{ color: "var(--muted)", margin: "10px 0 0" }}>This device belonged to a family member; technical details are limited.</p>
              </div>

              <div className="blk pad">
                <h3>Buyer Protection</h3>
                <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>Your purchase is protected by BayLike. If the item arrives not as described, you can request a refund.</p>
              </div>
            </div>
          </aside>
        </section>

        <footer>
          <div>© <span className="tiny">2030</span> BayLike — All rights reserved</div>
        </footer>
      </main>
    </div>
  );
}
