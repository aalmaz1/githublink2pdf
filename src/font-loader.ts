/**
 * Non-blocking font loading.
 *
 * The @fontsource weight stylesheets are intentionally NOT imported from the
 * main module graph: they would then be bundled into the render-blocking
 * app CSS and delay the first paint. Instead they are loaded here as
 * dynamic chunks right after first render, so the UI paints immediately in
 * system fonts and swaps to Inter/Merriweather the moment they arrive
 * (font-display: swap is already set by the @font-face rules).
 */
export function loadFonts(): void {
  const imports: Array<Promise<unknown>> = [
    import('@fontsource/inter/400.css'),
    import('@fontsource/inter/500.css'),
    import('@fontsource/inter/600.css'),
    import('@fontsource/merriweather/400.css'),
    import('@fontsource/merriweather/700.css'),
    import('@fontsource/merriweather/900.css')
  ];
  // A font fetch failure must never disturb the app itself.
  Promise.all(imports).catch(() => undefined);
}
