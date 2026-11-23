/**
 * Blazing Flames Studio — R2 automatic VRM discovery
 * R2 bucket: blazing-flames-private-vrm (private)
 * Existing R2 Worker binding: VRM_MODELS
 *
 * PUBLIC API:
 * GET  /api/models          List current .vrm filenames in models/
 * GET  /models/<filename>  Stream one original VRM by exact filename
 * HEAD /models/<filename>  Read model metadata
 *
 * WARNING: Browser viewing exposes original model data to visitors.
 * Origin restrictions are only a casual browser barrier, not authentication.
 */

const SITE_ORIGIN = "https://blazingflamesstudio.github.io";
const FOLDER = "models/";
const MAX_PAGES = 25;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": SITE_ORIGIN,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Expose-Headers": "Content-Length",
    "Cache-Control": "private, no-store",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function respond(text, status, headers = corsHeaders()) {
  return new Response(text, { status, headers });
}

function isValidFileName(filename) {
  return (
    filename.length > 4 &&
    filename.length < 512 &&
    !filename.includes("/") &&
    !filename.includes("\\") &&
    !filename.includes("\0") &&
    filename !== "." &&
    filename !== ".." &&
    /\.vrm$/i.test(filename)
  );
}

function displayName(filename) {
  const withoutExt = filename.replace(/\.vrm$/i, "");
  return withoutExt.replace(/^Blaze Silver Model\s*\((.+)\)$/i, "$1");
}

async function listModels(bucket) {
  const models = [];
  let cursor;

  // R2 may return fewer entries than the requested limit.
  // Continue while "truncated" is true, using the returned cursor.
  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber++) {
    const page = await bucket.list({
      prefix: FOLDER,
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    });

    for (const object of page.objects) {
      if (!object.key.startsWith(FOLDER)) continue;
      const filename = object.key.slice(FOLDER.length);
      // Files in nested folders are deliberately excluded.
      if (!isValidFileName(filename)) continue;
      models.push({
        id: filename,
        name: displayName(filename),
        size: object.size,
      });
    }

    if (!page.truncated) {
      models.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
      return models;
    }

    if (!page.cursor || page.cursor === cursor) {
      throw new Error("R2 catalog pagination could not continue");
    }
    cursor = page.cursor;
  }

  throw new Error("R2 catalog exceeds pagination safety limit");
}

export default {
  async fetch(request, env) {
    if (request.headers.get("Origin") !== SITE_ORIGIN) {
      return respond("Forbidden", 403);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return respond("Method Not Allowed", 405);
    }

    const { pathname } = new URL(request.url);

    try {
      // Catalog: only filenames and sizes, never original VRM bytes.
      if (pathname === "/api/models") {
        if (request.method !== "GET") {
          return respond("Method Not Allowed", 405);
        }

        const models = await listModels(env.VRM_MODELS);
        return new Response(JSON.stringify({ models }), {
          status: 200,
          headers: {
            ...corsHeaders(),
            "Content-Type": "application/json; charset=utf-8",
          },
        });
      }

      // One VRM request. Aino alias supports the earlier website version.
      if (!pathname.startsWith("/models/")) {
        return respond("Not Found", 404);
      }

      let filename;
      try {
        filename = decodeURIComponent(pathname.slice("/models/".length));
      } catch {
        return respond("Invalid model filename", 400);
      }

      if (filename === "aino") {
        filename = "Blaze Silver Model (Aino).vrm";
      }

      if (!isValidFileName(filename)) {
        return respond("Invalid model filename", 400);
      }

      const key = FOLDER + filename;
      const object =
        request.method === "HEAD"
          ? await env.VRM_MODELS.head(key)
          : await env.VRM_MODELS.get(key);

      if (!object) {
        return respond("Model Not Found", 404);
      }

      const headers = new Headers(corsHeaders());
      headers.set("Content-Type", "application/octet-stream");
      headers.set("Content-Length", String(object.size));
      headers.set("Content-Disposition", "inline");

      return new Response(
        request.method === "HEAD" ? null : object.body,
        { status: 200, headers }
      );
    } catch (error) {
      console.error("R2 gallery error:", error);
      return respond("Unable to retrieve R2 models", 500);
    }
  },
};
