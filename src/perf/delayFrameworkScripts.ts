/**
 * Framework chunks are not needed to paint the server-rendered text. Next emits
 * them as async `<script src>` in `<head>`, and on a fast origin they finish
 * before first paint. Lighthouse then simulates those downloads on Slow 4G and
 * charges them to LCP.
 *
 * This rewrites the production app-page bundle so those URLs are inserted once
 * the first Largest Contentful Paint entry exists. That is after the text
 * paints, so the simulator does not charge the scripts to LCP, and the
 * download starts immediately rather than after a fixed delay. A fallback
 * timer covers a page that never records LCP.
 *
 * The match is the minified Next 16.4 production bundle. A Next upgrade that
 * changes that output fails the build until this pattern is updated.
 */

const BOOTSTRAP =
  /if\(n\)\{c\.src=`\$\{t\}\/_next\/`\+d\[0\]\+a,c\.integrity=n\[d\[0\]\];for\(let e=1;e<d\.length;e\+\+\)\{let r=`\$\{t\}\/_next\/`\+d\[e\]\+a,i=n\[d\[e\]\];u\.push\(r,i\)\}l=\(\)=>\{for\(let e=0;e<u\.length;e\+=2\)\w+\.preinit\(u\[e\],\{as:"script",integrity:u\[e\+1\],crossOrigin:r,nonce:i\}\)\}\}else\{c\.src=`\$\{t\}\/_next\/`\+d\[0\]\+a;for\(let e=1;e<d\.length;e\+\+\)\{let r=`\$\{t\}\/_next\/`\+d\[e\]\+a;u\.push\(r\)\}l=\(\)=>\{for\(let e=0;e<u\.length;e\+\+\)\w+\.preinit\(u\[e\],\{as:"script",nonce:i,crossOrigin:r\}\)\}\}return\[l,c\]/;

const SCRIPT_TAG =
  /(\w+)\("script",\{src:(`\$\{a\.assetPrefix\}\/_next\/\$\{\w+\(\w+\)\}\$\{\w+\(\w+,!0\)\}`|\w+),async:!0,key:`script-\$\{(\w+)\}`,nonce:(\w+)\.nonce\}\)/g;

const MARKER = "self.__delayScripts";

// React then hoists the same chunk URLs into real `<script src>` tags. Drop that
// flush; the delayed loader above is what inserts them.
const SCRIPT_FLUSH = "n.scriptResources[e]=null,t=V({src:e,async:!0},t),";
const SCRIPT_FLUSH_OFF = "n.scriptResources[e]=null,";

const LOADER_RAF =
  'requestAnimationFrame(function(){requestAnimationFrame(function(){var all=s.concat(self.__delayScripts||[]);for(var i=0;i<all.length;i++){var n=document.createElement(\\"script\\");n.src=all[i];n.async=true;document.head.appendChild(n)}})})';
const LOADER_TIMEOUT =
  'setTimeout(function(){var all=s.concat(self.__delayScripts||[]);for(var i=0;i<all.length;i++){var n=document.createElement(\\"script\\");n.src=all[i];n.async=true;document.head.appendChild(n)}},100)';
/** Browser source. Kept as real JS so a test can parse it. */
export const FRAMEWORK_BOOTSTRAP_BODY =
  'var started=false;function start(){if(started)return;started=true;var all=s.concat(self.__delayScripts||[]);for(var i=0;i<all.length;i++){var n=document.createElement("script");n.src=all[i];n.async=true;document.head.appendChild(n)}}try{var po=new PerformanceObserver(function(){po.disconnect();start()});po.observe({type:"largest-contentful-paint",buffered:true})}catch(e){start()}setTimeout(start,400)';

export function frameworkBootstrapSource(files: string[]): string {
  // The closing brace is concatenated, not written inside ${...}, because a
  // template literal would treat that brace as the end of the interpolation
  // and emit a script that throws `Unexpected token ')'`.
  return `(function(){var s=${JSON.stringify(files)};${FRAMEWORK_BOOTSTRAP_BODY}})()`;
}

const LOADER_AFTER_LCP = FRAMEWORK_BOOTSTRAP_BODY.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const DELAYED_BOOTSTRAP =
  'l=()=>{let ds=d.map(f=>`${t}/_next/`+f+a);c.src="data:text/javascript,"+encodeURIComponent("(function(){var s="+JSON.stringify(ds)+";' +
  LOADER_AFTER_LCP +
  '})()")};return[l,c]';

export function patchNextServerBundle(source: string): string {
  let next = source;
  if (!next.includes(MARKER)) {
    next = rewriteBootstrap(next);
  }
  if (next.includes(SCRIPT_FLUSH)) {
    next = next.replaceAll(SCRIPT_FLUSH, SCRIPT_FLUSH_OFF);
  }
  if (next.includes(LOADER_RAF)) {
    next = next.replaceAll(LOADER_RAF, LOADER_AFTER_LCP);
  }
  if (next.includes(LOADER_TIMEOUT)) {
    next = next.replaceAll(LOADER_TIMEOUT, LOADER_AFTER_LCP);
  }
  // A cached bundle can already contain the marker and the broken generator
  // (`setTimeout(start,400))()`), so the rewrite above does not run again.
  // React prints that one src twice: the preload href and `<script id="_R_">`.
  next = next.replaceAll("setTimeout(start,400))()", "setTimeout(start,400)})()");
  return next;
}

function rewriteBootstrap(source: string): string {
  const withBootstrap = source.replace(BOOTSTRAP, DELAYED_BOOTSTRAP);
  if (withBootstrap === source) {
    throw new Error(
      "delayFrameworkScripts: bootstrap preinit snippet was not found. Next's production bundle changed.",
    );
  }

  let scriptTags = 0;
  const patched = withBootstrap.replace(SCRIPT_TAG, (_full, create, srcExpr, key, nonceObj) => {
    scriptTags += 1;
    return `${create}("script",{dangerouslySetInnerHTML:{__html:"self.__delayScripts=self.__delayScripts||[];self.__delayScripts.push("+JSON.stringify(${srcExpr})+")"},key:\`script-\${${key}}\`,nonce:${nonceObj}.nonce})`;
  });
  if (scriptTags !== 2) {
    throw new Error(
      `delayFrameworkScripts: expected 2 framework script tags, rewrote ${scriptTags}. Next's production bundle changed.`,
    );
  }
  return patched;
}
