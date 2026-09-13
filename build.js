/* Bundles index.html + assets into two single-file outputs:
   dist/antidote.html   — standalone page (open it anywhere)
   dist/artifact.html   — body-only fragment for hosted publishing        */
const fs = require('fs');
const path = require('path');
const root = __dirname;

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/styles.css'), 'utf8');
const js  = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
const ico = fs.readFileSync(path.join(root, 'assets/favicon.svg'), 'utf8');

html = html.replace('<link rel="stylesheet" href="assets/styles.css">', '<style>\n' + css + '\n</style>');
html = html.replace('<script src="assets/app.js"></script>', '<script>\n' + js + '\n</script>');
html = html.replace('<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">',
  '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,' + Buffer.from(ico).toString('base64') + '">');

/* photographs: inline as data URIs when the files exist, so the single-file
   builds carry them; a missing file keeps its path and the page hides the figure */
const imgDir = path.join(root, 'assets/img');
html = html.replace(/assets\/img\/([\w.-]+\.(?:jpe?g|png|webp))/g, (m, name) => {
  const f = path.join(imgDir, name);
  if (!fs.existsSync(f)) return m;
  const mime = /\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : 'image/jpeg';
  return 'data:' + mime + ';base64,' + fs.readFileSync(f).toString('base64');
});

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/antidote.html'), html);

/* artifact build: the host supplies doctype/head/body, and stamps data-theme
   on <html> itself, so we ship the page content plus a title and the fonts. */
const bodyInner = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/)[0];
const artifact =
  '<title>Antidote Video File Repair</title>\n' +
  fonts + '\n<style>\n' + css + '\n</style>\n' +
  '<script>document.documentElement.setAttribute("data-theme", document.documentElement.getAttribute("data-theme") || "dark");</script>\n' +
  bodyInner;
fs.writeFileSync(path.join(root, 'dist/artifact.html'), artifact);

console.log('dist/antidote.html', fs.statSync(path.join(root, 'dist/antidote.html')).size, 'bytes');
console.log('dist/artifact.html', fs.statSync(path.join(root, 'dist/artifact.html')).size, 'bytes');

/* ---- privacy policy: same treatment ---- */
let priv = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');
const docjs = fs.readFileSync(path.join(root, 'assets/doc.js'), 'utf8');
priv = priv.replace('<link rel="stylesheet" href="assets/styles.css">', '<style>\n' + css + '\n</style>');
priv = priv.replace('<script src="assets/doc.js"></script>', '<script>\n' + docjs + '\n</script>');
priv = priv.replace('<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">',
  '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,' + Buffer.from(ico).toString('base64') + '">');
fs.writeFileSync(path.join(root, 'dist/privacy.html'), priv);

/* artifact fragment; links back to the main artifact when its URL is known */
const MAIN_URL = process.env.MAIN_URL || 'index.html';
const PRIVACY_URL = process.env.PRIVACY_URL || 'privacy.html';
let privBody = priv.slice(priv.indexOf('<body>') + 6, priv.lastIndexOf('</body>'));
privBody = privBody.replace(/href="index\.html(#[\w-]*)?"/g, (m, h) => 'href="' + MAIN_URL + (h || '') + '"');
const privArtifact =
  '<title>Antidote Privacy Policy</title>\n' + fonts + '\n<style>\n' + css + '\n</style>\n' +
  '<script>document.documentElement.setAttribute("data-theme", document.documentElement.getAttribute("data-theme") || "dark");</script>\n' +
  privBody;
fs.writeFileSync(path.join(root, 'dist/privacy-artifact.html'), privArtifact);

/* and the main artifact points at the published policy */
if (PRIVACY_URL !== 'privacy.html') {
  const a = fs.readFileSync(path.join(root, 'dist/artifact.html'), 'utf8').replace('href="privacy.html"', 'href="' + PRIVACY_URL + '" target="_blank" rel="noopener"');
  fs.writeFileSync(path.join(root, 'dist/artifact.html'), a);
}
console.log('dist/privacy.html', fs.statSync(path.join(root, 'dist/privacy.html')).size, 'bytes');
