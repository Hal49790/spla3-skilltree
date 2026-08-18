import os
import secrets
import string
import aiohttp
import discord
from discord import app_commands
from discord.ext import commands

DISCORD_TOKEN = os.environ["DISCORD_TOKEN"]
API_BASE = os.environ["SKILLTREE_API_BASE"].rstrip("/")
WEB_BASE = os.environ["SKILLTREE_WEB_BASE"].rstrip("/")

CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

def make_seed():
    return "SPLA3-" + "".join(secrets.choice(CHARS) for _ in range(6))

class SkillTreeBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.none()
        super().__init__(command_prefix="!", intents=intents)

bot = SkillTreeBot()

@bot.event
async def on_ready():
    await bot.tree.sync()
    print(f"Logged in as {bot.user} ({bot.user.id})")

@bot.tree.command(name="skilltree", description="新しいスキルツリーを生成します")
async def skilltree(interaction: discord.Interaction):
    seed = make_seed()
    url = f"{WEB_BASE}/?seed={seed}"

    payload = {
        "seed": seed,
        "guildId": str(interaction.guild_id or ""),
        "channelId": str(interaction.channel_id),
        "userId": str(interaction.user.id)
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(f"{API_BASE}/api/trees", json=payload) as res:
            if res.status >= 400:
                text = await res.text()
                await interaction.response.send_message(
                    f"スキルツリー生成に失敗しました。\n```{text[:1500]}```",
                    ephemeral=True
                )
                return

    embed = discord.Embed(
        title="🌳 HEX SKILL TREE",
        description=(
            f"**Seed:** `{seed}`\n\n"
            f"[🌐 スキルツリーを開く]({url})\n\n"
            "Webページ上でスキルを取得できます。\n"
            "保存した進捗は同じSeedを使う人と共有されます。"
        )
    )

    await interaction.response.send_message(embed=embed)

bot.run(DISCORD_TOKEN)
