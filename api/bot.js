import { Client, GatewayIntentBits } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
// Configuración
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Variables del bot
let discordClient = null;
let statsMessage = null;
let lastUpdate = 0;
const UPDATE_INTERVAL = 30000; // 30 segundos entre actualizaciones

// Cache de estadísticas
let cachedStats = {
  total: 0,
  daily: 0,
  hourly: 0,
  minute: 0,
  activeUsers: 0,
  lastUpdated: null
};

// Inicializar bot de Discord
async function initializeBot() {
  if (!process.env.DISCORD_TOKEN || discordClient) return;
  
  discordClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });
  
  discordClient.once('ready', async () => {
    console.log(`✅ Bot conectado como ${discordClient.user.tag}`);
    
    // Buscar o crear mensaje de estadísticas
    await setupStatsMessage();
    
    // Actualizar mensaje periódicamente
    setInterval(updateBotMessage, UPDATE_INTERVAL);
  });
  
  await discordClient.login(process.env.DISCORD_TOKEN);
}

// Configurar mensaje de estadísticas
async function setupStatsMessage() {
  try {
    const channelId = process.env.STATS_CHANNEL_ID;
    const messageId = process.env.STATS_MESSAGE_ID;
    
    if (channelId && messageId) {
      const channel = await discordClient.channels.fetch(channelId);
      statsMessage = await channel.messages.fetch(messageId);
      console.log('📌 Mensaje de stats encontrado:', messageId);
    } else {
      // Crear nuevo mensaje si no existe
      const channel = await discordClient.channels.fetch(channelId || process.env.DEFAULT_CHANNEL_ID);
      statsMessage = await channel.send('🔄 Inicializando estadísticas...');
      
      // Guardar ID para uso futuro
      console.log('📝 Nuevo mensaje creado:', statsMessage.id);
      // Puedes guardar este ID en una variable de entorno
    }
  } catch (error) {
    console.error('Error configurando mensaje:', error);
  }
}

// Actualizar mensaje del bot
async function updateBotMessage(force = false) {
  if (!statsMessage || !discordClient) return;
  
  const now = Date.now();
  if (!force && (now - lastUpdate) < UPDATE_INTERVAL) {
    return;
  }
  
  try {
    // Obtener estadísticas actualizadas
    const stats = await getLiveStats();
    cachedStats = { ...stats, lastUpdated: new Date().toISOString() };
    
    // Crear embed actualizado
    const embed = {
      title: '📊 Estadísticas de Ejecuciones en Tiempo Real',
      color: 0x00ff00,
      fields: [
        {
          name: '👥 Usuarios Activos',
          value: `**${stats.activeUsers}** usuarios en línea`,
          inline: true
        },
        {
          name: '🎯 Total Ejecuciones',
          value: `**${stats.total.toLocaleString()}** total`,
          inline: true
        },
        {
          name: '📅 Ejecuciones Hoy',
          value: `**${stats.daily}** hoy`,
          inline: true
        },
        {
          name: '⏰ Esta Hora',
          value: `**${stats.hourly}** esta hora`,
          inline: true
        },
        {
          name: '🕐 Este Minuto',
          value: `**${stats.minute}** este minuto`,
          inline: true
        },
        {
          name: '🖥️ Servidores Activos',
          value: `**${stats.activeServers || 1}** servidores`,
          inline: true
        }
      ],
      footer: {
        text: `Actualizado: ${new Date().toLocaleTimeString()} | ID: ${process.env.BOT_ID || 'N/A'}`
      },
      timestamp: new Date().toISOString()
    };
    
    // Editar mensaje existente
    await statsMessage.edit({
      content: '',
      embeds: [embed]
    });
    
    lastUpdate = now;
    console.log('✅ Mensaje del bot actualizado');
    
  } catch (error) {
    console.error('Error actualizando mensaje:', error);
  }
}

// Obtener estadísticas en vivo
async function getLiveStats() {
  const now = new Date();
  const timeKeys = {
    day: now.toISOString().slice(0, 10),
    hour: now.toISOString().slice(0, 13),
    minute: now.toISOString().slice(0, 16)
  };
  
  try {
    // Ejecutar todas las consultas en paralelo
    const [totalRes, dailyRes, hourlyRes, minuteRes, activeUsersRes] = await Promise.allSettled([
      supabase.rpc('get_counter', { counter_name: 'total_executions' }),
      supabase.rpc('get_counter', { counter_name: `executions_day_${timeKeys.day}` }),
      supabase.rpc('get_counter', { counter_name: `executions_hour_${timeKeys.hour}` }),
      supabase.rpc('get_counter', { counter_name: `executions_minute_${timeKeys.minute}` }),
      supabase
        .from('active_users')
        .select('user_id')
        .gte('last_active', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    ]);
    
    return {
      total: totalRes.status === 'fulfilled' ? (totalRes.value.data || 0) : cachedStats.total,
      daily: dailyRes.status === 'fulfilled' ? (dailyRes.value.data || 0) : cachedStats.daily,
      hourly: hourlyRes.status === 'fulfilled' ? (hourlyRes.value.data || 0) : cachedStats.hourly,
      minute: minuteRes.status === 'fulfilled' ? (minuteRes.value.data || 0) : cachedStats.minute,
      activeUsers: activeUsersRes.status === 'fulfilled' ? (activeUsersRes.value.data?.length || 0) : cachedStats.activeUsers,
      lastUpdated: now.toISOString()
    };
    
  } catch (error) {
    console.error('Error obteniendo stats:', error);
    return cachedStats;
  }
}

// Manejar ejecuciones entrantes
export default async function handler(req, res) {
  // Permitir solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const data = req.body;
    const eventType = data.type || 'execute';
    
    // 1. Guardar en base de datos
    await saveToDatabase(data, eventType);
    
    // 2. Actualizar estadísticas en caché
    await updateStatistics(data.userId, eventType);
    
    // 3. Actualizar mensaje del bot (con throttling)
    const now = Date.now();
    if (now - lastUpdate > 10000) { // Solo actualizar cada 10 segundos
      updateBotMessage();
    }
    
    // 4. Responder rápido
    res.status(200).json({
      success: true,
      botUpdated: true,
      nextUpdate: Math.ceil((UPDATE_INTERVAL - (now - lastUpdate)) / 1000) + 's'
    });
    
  } catch (error) {
    console.error('Error en bot handler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Guardar en base de datos
async function saveToDatabase(data, eventType) {
  const { error } = await supabase
    .from('bot_executions')
    .insert({
      user_id: data.userId,
      username: data.username,
      session_id: data.sessionId,
      event_type: eventType,
      game_id: data.gameId,
      timestamp: new Date().toISOString(),
      bot_processed: true
    });
  
  if (error) throw error;
}

// Actualizar estadísticas
async function updateStatistics(userId, eventType) {
  const now = new Date();
  const timeKey = {
    minute: now.toISOString().slice(0, 16),
    hour: now.toISOString().slice(0, 13),
    day: now.toISOString().slice(0, 10),
  };
  
  // Solo incrementar si es una ejecución nueva
  if (eventType === 'execute') {
    await Promise.allSettled([
      supabase.rpc('increment_counter', {
        counter_name: 'total_executions',
        increment_value: 1
      }),
      supabase.rpc('increment_counter', {
        counter_name: `executions_day_${timeKey.day}`,
        increment_value: 1
      })
    ]);
  }
  
  if (userId) {
    await supabase
      .from('active_users')
      .upsert({
        user_id: userId,
        last_active: now.toISOString()
      }, {
        onConflict: 'user_id'
      });
  }
}

// Inicializar bot cuando se carga el módulo
if (process.env.NODE_ENV !== 'test') {
  initializeBot().catch(console.error);
        }
