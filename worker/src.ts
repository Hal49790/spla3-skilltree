export interface Env {
  DB: D1Database;
  DISCORD_BOT_TOKEN: string;
  PUBLIC_WEB_URL: string;
}

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" } });

function cors(res: Response) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Headers", "Content-Type");
  h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  return new Response(res.body, { status: res.status, headers: h });
}

async function discordRequest(env: Env, method: string, path: string, body?: unknown) {
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return res;
}

async function createTree(env: Env, seed: string, guildId: string, channelId: string, userId: string) {
  await env.DB.prepare(`
    INSERT INTO skilltrees(seed, guild_id, channel_id, created_by, web_url)
    VALUES(?, ?, ?, ?, ?)
    ON CONFLICT(seed) DO NOTHING
  `).bind(seed, guildId, channelId, userId, `${env.PUBLIC_WEB_URL}/?seed=${encodeURIComponent(seed)}`).run();
}

async function getTree(env: Env, seed: string) {
  const tree = await env.DB.prepare(`SELECT * FROM skilltrees WHERE seed = ?`).bind(seed).first();
  const rows = await env.DB.prepare(`SELECT progress_json FROM skilltree_progress WHERE seed = ?`).bind(seed).first();
  return {
    tree,
    progress: rows?.progress_json ? JSON.parse(String(rows.progress_json)) : null
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/trees" && request.method === "POST") {
        const body = await request.json<any>();
        if (!body.seed || !body.guildId || !body.channelId || !body.userId) {
          return cors(json({ error: "seed, guildId, channelId, userId are required" }, 400));
        }
        await createTree(env, body.seed, body.guildId, body.channelId, body.userId);
        return cors(json({ ok: true, seed: body.seed, url: `${env.PUBLIC_WEB_URL}/?seed=${encodeURIComponent(body.seed)}` }));
      }

      const treeMatch = url.pathname.match(/^\/api\/trees\/([^/]+)$/);
      if (treeMatch && request.method === "GET") {
        return cors(json(await getTree(env, decodeURIComponent(treeMatch[1]))));
      }

      if (url.pathname === "/api/progress" && request.method === "POST") {
        const body = await request.json<any>();
        if (!body.seed || !Array.isArray(body.progress)) {
          return cors(json({ error: "seed and progress are required" }, 400));
        }

        const progressJson = JSON.stringify(body.progress);
        await env.DB.prepare(`
          INSERT INTO skilltree_progress(seed, progress_json, updated_at)
          VALUES(?, ?, unixepoch())
          ON CONFLICT(seed) DO UPDATE SET
            progress_json = excluded.progress_json,
            updated_at = excluded.updated_at
        `).bind(body.seed, progressJson).run();

        return cors(json({ ok: true }));
      }

      if (url.pathname === "/api/discord/post-image" && request.method === "POST") {
        const form = await request.formData();
        const seed = String(form.get("seed") || "");
        const image = form.get("image");

        if (!seed || !(image instanceof File)) {
          return cors(json({ error: "seed and image are required" }, 400));
        }

        const tree = await env.DB.prepare(`
          SELECT channel_id FROM skilltrees WHERE seed = ?
        `).bind(seed).first<any>();

        if (!tree?.channel_id) {
          return cors(json({ error: "Discord channel for this seed was not found" }, 404));
        }

        const discordForm = new FormData();
        discordForm.append("payload_json", JSON.stringify({
          content: `🌳 **スキルツリー更新**\nSeed: \`${seed}\``
        }));
        discordForm.append("files[0]", image, `skilltree-${seed}.png`);

        const discordRes = await fetch(
          `https://discord.com/api/v10/channels/${tree.channel_id}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`
            },
            body: discordForm
          }
        );

        if (!discordRes.ok) {
          return cors(json({ error: await discordRes.text() }, discordRes.status));
        }

        return cors(json({ ok: true }));
      }

      return cors(json({ error: "Not found" }, 404));
    } catch (error) {
      console.error(error);
      return cors(json({ error: String(error) }, 500));
    }
  }
};
