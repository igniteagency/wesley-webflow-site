import '$dev/debug';
import '$dev/env';
import { LOCAL_SERVER } from '$dev/env';

/**
 * Entry point for the build system.
 * Fetches scripts from localhost or production site depending on the setup
 * Polls `localhost` on page load, else falls back to deriving code from production URL
 */

// Add ScriptOptions and ScriptListItem types for global use
export interface ScriptOptions {
  placement?: 'head' | 'body';
  defer?: boolean;
  isModule?: boolean;
  name?: string;
  // allow any other new option name here
  [key: string]: unknown;
}

function getProductionBase(branch = '') {
  const branchPrefix = '' === branch ? '' : `@${branch}`;
  return `https://cdn.jsdelivr.net/gh/igniteagency/{{repo}}${branchPrefix}/dist/prod/`;
}

window.PRODUCTION_BASE = !window.location.hostname.includes('webflow.io')
  ? getProductionBase()
  : getProductionBase('dev');

const relativePathBase = window.SCRIPTS_ENV === 'local' ? LOCAL_SERVER : window.PRODUCTION_BASE;

window.SCRIPT_BASE = relativePathBase;

/**
 * Loads a script either from the JS repo, or accepts a direct library URL too
 * Examples:
 * ```ts
 * window.loadScript('global.js');
 * window.loadScript('https://cdn.jsdelivr.net/npm/some-lib@1.0.0/dist/index.js', {
 *   placement: 'head',
 *   name: 'some-lib',
 * });
 * ```
 * @param url - The URL of the script to load
 * @param options - The options for the script
 * @param attr - Any other attributes to add to the script element
 * @returns A promise that resolves when the script is loaded
 */
window.loadScript = function (url, options, attr?: Record<string, string>): Promise<void> {
  const opts: ScriptOptions = {
    placement: 'body',
    name: undefined,
    ...options,
  };

  const attributes: Record<string, string> = {
    defer: 'true',
    ...attr,
  };

  // Work with both relative repo paths and direct CDN URLs
  const isAbsolute = url.startsWith('https://');
  const finalUrl = isAbsolute ? url : relativePathBase + url;

  if (document.querySelector(`script[src="${finalUrl}"]`)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = finalUrl;
    Object.entries(attributes).forEach(([key, value]) => {
      script.setAttribute(key, value);
    });
    script.onload = () => {
      if (opts.name) {
        document.dispatchEvent(
          new CustomEvent(`scriptLoaded:${opts.name}`, {
            detail: { url: finalUrl, name: opts.name },
          })
        );
      }
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${finalUrl}`));

    document[opts.placement].appendChild(script);
  });
};
