import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * The HTML shell around every statically exported page. This is what turns the
 * web build into something installable: the manifest, the icons iOS looks for,
 * and the service worker that lets it open without a connection.
 *
 * It only ever runs in Node at build time, so `process.env` is available here.
 * When the site is hosted in a subfolder (GitHub Pages serves a repo at
 * /<repo>/), every URL below has to carry that prefix — a page nested under
 * /arcade/ would resolve a relative href against the wrong directory.
 */
const baseUrl = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
const asset = (path: string) => `${baseUrl}/${path}`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover hands the notch area to the app so the dark
            background reaches the screen edges once installed. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>Beerpong</title>
        <meta
          name="description"
          content="Zähle dein echtes Beerpong-Spiel per Kamera oder spiele die Arcade-Variante gegen KI und Freunde."
        />
        <meta name="theme-color" content="#0A0A0A" />

        <link rel="manifest" href={asset('manifest.json')} />
        <link rel="icon" href={asset('favicon.ico')} />

        {/* iOS ignores the manifest — these four lines are what make
            "Zum Home-Bildschirm" produce a real full-screen app. */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Beerpong" />
        <link rel="apple-touch-icon" href={asset('icons/apple-touch-icon.png')} />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
        <script dangerouslySetInnerHTML={{ __html: bootScript(baseUrl) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const pageStyles = `
html, body {
  background-color: #0A0A0A;
  /* Without this, a swipe down in the tracker triggers pull-to-refresh and
     reloads the app mid-game. */
  overscroll-behavior: none;
}
body {
  -webkit-tap-highlight-color: transparent;
}
`;

/**
 * Two small jobs on load:
 *
 * 1. Set the tab title. The static renderer emits its own empty <title> ahead
 *    of ours, and the browser takes the first one, so the tag below alone
 *    leaves the tab blank. No screen sets a title of its own, so claiming it
 *    here is safe.
 * 2. Register the offline worker, guarded — the export also runs in browsers
 *    without service workers and over plain http, where registering throws.
 */
function bootScript(base: string) {
  return `
document.title = 'Beerpong';
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('${base}/sw.js', { scope: '${base}/' })
      .catch(function () {
        /* Offline support is a bonus — never let it break the page. */
      });
  });
}
`;
}
