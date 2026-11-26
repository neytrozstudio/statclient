const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = '1566405761112744027';

const JAVA_HOST = 'Peace-8xpf.aternos.me';
const JAVA_ALT = '185.107.192.55:49154';
const BEDROCK_HOST = 'Peace-8xpf.aternos.me';
const PORT = 49154;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let statusMessage = null;

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PeaceSMP-StatusBot/1.0' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getServerStatus() {
  const [javaRes, bedrockRes] = await Promise.allSettled([
    fetchJson(`https://api.mcsrvstat.us/3/${JAVA_HOST}:${PORT}`),
    fetchJson(`https://api.mcsrvstat.us/bedrock/3/${BEDROCK_HOST}:${PORT}`)
  ]);

  const java = javaRes.status === 'fulfilled' ? javaRes.value : { online: false };
  const bedrock = bedrockRes.status === 'fulfilled' ? bedrockRes.value : { online: false };

  const isOnline = Boolean(java.online || bedrock.online);
  const version = java.version || bedrock.version || 'Inconnue';
  const playersOnline = java.players?.online ?? bedrock.players?.online ?? 0;
  const playersMax = java.players?.max ?? bedrock.players?.max ?? 0;

  return new EmbedBuilder()
    .setTitle('Peace SMP — Statut en temps réel')
    .setColor(isOnline ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: 'Statut global', value: isOnline ? '🟢 En ligne' : '🔴 Hors ligne', inline: true },
      { name: 'Joueurs', value: isOnline ? `${playersOnline} / ${playersMax}` : '0 / 0', inline: true },
      { name: 'Version', value: isOnline ? `${version}` : '—', inline: true },
      {
        name: 'Java Edition',
        value: `${java.online ? '🟢' : '🔴'} \`${JAVA_HOST}:${PORT}\`\nIP alt : \`${JAVA_ALT}\``,
        inline: false
      },
      {
        name: 'Bedrock Edition',
        value: `${bedrock.online ? '🟢' : '🔴'} Adresse : \`${BEDROCK_HOST}\` • Port : \`${PORT}\``,
        inline: false
      }
    )
    .setTimestamp()
    .setFooter({ text: 'Mise à jour automatique toutes les 60s' });
}

async function updateStatusEmbed() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const embed = await getServerStatus();

    if (!statusMessage) {
      const recent = await channel.messages.fetch({ limit: 10 });
      statusMessage = recent.find(
        (m) => m.author.id === client.user.id && m.embeds.length > 0
      ) || null;
    }

    if (statusMessage) {
      await statusMessage.edit({ embeds: [embed] });
    } else {
      statusMessage = await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('Erreur mise à jour statut :', err.message);
  }
}

client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
  await updateStatusEmbed();
  setInterval(updateStatusEmbed, 60_000);
});

client.login(TOKEN);
