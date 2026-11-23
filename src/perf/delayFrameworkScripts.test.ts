import { describe, expect, it } from "vitest";
import { frameworkBootstrapSource, patchNextServerBundle } from "./delayFrameworkScripts";

const TURBO = `
function rt(e,t,r,n,a,i,s){var o;let l,u=[],c={src:"",crossOrigin:r},d=((null==(o=e.rootMainFilesTree)?void 0:o[s])||e.rootMainFiles).map(re);if(0===d.length)throw Error("Invariant: missing bootstrap script. This is a bug in Next.js");if(n){c.src=\`\${t}/_next/\`+d[0]+a,c.integrity=n[d[0]];for(let e=1;e<d.length;e++){let r=\`\${t}/_next/\`+d[e]+a,i=n[d[e]];u.push(r,i)}l=()=>{for(let e=0;e<u.length;e+=2)ev.preinit(u[e],{as:"script",integrity:u[e+1],crossOrigin:r,nonce:i})}}else{c.src=\`\${t}/_next/\`+d[0]+a;for(let e=1;e<d.length;e++){let r=\`\${t}/_next/\`+d[e]+a;u.push(r)}l=()=>{for(let e=0;e<u.length;e++)ev.preinit(u[e],{as:"script",nonce:i,crossOrigin:r})}}return[l,c]}
u.push(i("script",{src:\`\${a.assetPrefix}/_next/\${re(e)}\${rf(a,!0)}\`,async:!0,key:\`script-\${c}\`,nonce:a.nonce}))
d.push(s("script",{src:r,async:!0,key:\`script-\${f}\`,nonce:e.nonce}))
null!==i&&(n.scriptResources[e]=null,t=V({src:e,async:!0},t),i&&(2===i.length&&rF(t,i))
`;

const WEBPACK = TURBO.replaceAll("ev.preinit", "eS.preinit").replaceAll("re(e)", "rr(e)").replaceAll("rf(a,!0)", "rp(a,!0)");

describe("patchNextServerBundle", () => {
  it("moves framework scripts off the parser preload scanner", () => {
    const patched = patchNextServerBundle(TURBO);
    expect(patched).not.toContain("ev.preinit");
    expect(patched).not.toContain("async:!0");
    expect(patched).toContain("data:text/javascript,");
    expect(patched).toContain("largest-contentful-paint");
    expect(patched).toContain("setTimeout");
    expect(patched).toContain("self.__delayScripts");
    expect(patched).toContain("JSON.stringify(`${a.assetPrefix}/_next/${re(e)}${rf(a,!0)}`)");
    expect(patched).toContain("JSON.stringify(r)");
    expect(patched).not.toContain("t=V({src:e,async:!0},t)");
    expect(patched).toContain("n.scriptResources[e]=null,i&&");
  });

  it("accepts the webpack bundle's minified names", () => {
    const patched = patchNextServerBundle(WEBPACK);
    expect(patched).not.toContain("eS.preinit");
    expect(patched).toContain("JSON.stringify(`${a.assetPrefix}/_next/${rr(e)}${rp(a,!0)}`)");
  });

  it("is idempotent", () => {
    const once = patchNextServerBundle(TURBO);
    expect(patchNextServerBundle(once)).toBe(once);
  });

  it("emits a bootstrap script the browser can parse", () => {
    const source = frameworkBootstrapSource(["/_next/static/chunks/app.js"]);
    expect(source.endsWith("})()")).toBe(true);
    expect(source).not.toContain("400))()");
    expect(() => new Function(source)).not.toThrow();
  });

  it("repairs a cached bundle that still emits the broken data URL", () => {
    const cached =
      'self.__delayScripts;encodeURIComponent("(function(){var s="+JSON.stringify(ds)+";setTimeout(start,400))()")';
    const patched = patchNextServerBundle(cached);
    expect(patched).toContain("setTimeout(start,400)})()");
    expect(patched).not.toContain("setTimeout(start,400))()");
  });
});
