export const SAMPLE_HTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Lumen Coffee</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: #f6f4ef; font-family: Manrope, system-ui, sans-serif; color: #1c2520; }
  .hero { position: relative; height: 100%; padding: 56px 48px; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
  h1 { font-size: clamp(36px, 7vw, 72px); font-weight: 800; line-height: 0.95; letter-spacing: -0.025em; max-width: 12ch; }
  p { font-size: 16px; color: #4a564f; margin-top: 18px; max-width: 36ch; line-height: 1.4; }
  .cta { margin-top: 28px; display: inline-flex; background: #2a2a2a; color: #f3f1ea; padding: 12px 22px; border-radius: 999px; font-size: 13px; font-weight: 700; width: fit-content; text-decoration: none; }
  .bg { position: absolute; right: -40px; bottom: -40px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle at 40% 30%, #d97b3a, #6b2710 70%); opacity: 0.85; }
</style>
</head>
<body>
  <section class="hero">
    <h1>Coffee, slow.</h1>
    <p>Specialty roasts, single origin, brewed deliberately in 14 cities. Subscriptions ship Tuesdays.</p>
    <a class="cta" href="#">Order now →</a>
    <div class="bg"></div>
  </section>
</body>
</html>`;
