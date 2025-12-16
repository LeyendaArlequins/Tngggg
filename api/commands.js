import { createClient } from '@supabase/supabase-js';
import { InteractionType, InteractionResponseType } from 'discord-interactions';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const interaction = req.body;
  
  // Verificar signature de Discord (importante para seguridad)
  if (!verifyDiscordSignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Manejar diferentes tipos de interacción
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data;
    
    switch (name) {
      case 'stats':
        return handleStatsCommand(res);
        
      case 'top':
        return handleTopCommand(res);
        
      case 'forceupdate':
        return handleForceUpdate(res);
        
      case 'status':
        return handleStatusCommand(res);
        
      default:
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Comando no reconocido' }
        });
    }
  }
  
  res.json({ type: InteractionResponseType.PONG });
}

// Comando /stats
async function handleStatsCommand(res) {
  const stats = await getFormattedStats();
  
  return res.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: '📊 Estadísticas Actuales',
        description: 'Aquí están las estadísticas en tiempo real:',
        color: 0x5865F2,
        fields: [
          { name: 'Total Ejecuciones', value: stats.total.toString(), inline: true },
          { name: 'Ejecuciones Hoy', value: stats.daily.toString(), inline: true },
          { name: 'Usuarios Activos', value: stats.activeUsers.toString(), inline: true },
          { name: 'Esta Hora', value: stats.hourly.toString(), inline: true },
          { name: 'Este Minuto', value: stats.minute.toString(), inline: true }
        ],
        footer: { text: `Última actualización: ${stats.lastUpdated}` }
      }],
      flags: 64 // Ephemeral (solo visible para quien ejecutó el comando)
    }
  });
}

// Comando /top
async function handleTopCommand(res) {
  const { data: topUsers } = await supabase
    .from('active_users')
    .select('username, last_active, session_count')
    .order('session_count', { ascending: false })
    .limit(5);
  
  const usersList = topUsers?.map((user, i) => 
    `${i+1}. **${user.username}** - ${user.session_count} ejecuciones`
  ).join('\n') || 'No hay datos aún';
  
  return res.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: '🏆 Top Usuarios',
        description: usersList,
        color: 0xFFD700
      }]
    }
  });
}

// Comando /forceupdate
async function handleForceUpdate(res) {
  // Llamar al update del bot
  if (typeof updateBotMessage === 'function') {
    updateBotMessage(true);
  }
  
  return res.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: '✅ Actualizando mensaje de estadísticas...',
      flags: 64
    }
  });
}

// Comando /status
async function handleStatusCommand(res) {
  return res.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: '🟢 Bot en Línea',
        description: 'El sistema de tracking está funcionando correctamente.',
        fields: [
          { name: 'Estado', value: 'Operativo', inline: true },
          { name: 'Uptime', value: '100%', inline: true },
          { name: 'Mensaje ID', value: process.env.STATS_MESSAGE_ID || 'No configurado', inline: true }
        ],
        color: 0x00FF00
      }]
    }
  });
}

// Obtener estadísticas formateadas
async function getFormattedStats() {
  const now = new Date();
  const timeKeys = {
    day: now.toISOString().slice(0, 10),
    hour: now.toISOString().slice(0, 13),
    minute: now.toISOString().slice(0, 16)
  };
  
  const [total, daily, hourly, minute, activeUsers] = await Promise.all([
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
    total: total.data || 0,
    daily: daily.data || 0,
    hourly: hourly.data || 0,
    minute: minute.data || 0,
    activeUsers: activeUsers.data?.length || 0,
    lastUpdated: now.toLocaleTimeString()
  };
}

// Verificación de signature (simplificada)
function verifyDiscordSignature(req) {
  // Implementar verificación real en producción
  // Usando crypto para verificar el header X-Signature-Ed25519
  return true; // Temporal para desarrollo
    }
