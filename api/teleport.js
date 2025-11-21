// api/teleport.js - VERSIÓN MEJORADA
// Simulamos una "base de datos" en memoria (para empezar)
let teleportData = {};

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parsear body
    let body = {};
    if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        message: '✅ API de Auto-Join funcionando',
        activeTeleports: Object.keys(teleportData).length,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === 'POST') {
      const { action, placeId, gameInstanceId, userId } = body;

      if (action === "getTeleportData") {
        // Roblox pide datos de teleport
        const userData = teleportData[userId];
        if (userData && userData.placeId && userData.gameInstanceId) {
          return res.status(200).json({
            success: true,
            data: {
              placeId: userData.placeId,
              gameInstanceId: userData.gameInstanceId
            }
          });
        } else {
          return res.status(200).json({
            success: true,
            data: null
          });
        }
      }
      else if (action === "clearTeleportData") {
        // Limpiar datos después del teleport
        delete teleportData[userId];
        return res.status(200).json({
          success: true,
          message: 'Datos limpiados'
        });
      }
      else if (placeId && gameInstanceId) {
        // Discord envía nuevos datos
        const targetUserId = userId || 'default-user';
        
        teleportData[targetUserId] = {
          placeId: placeId,
          gameInstanceId: gameInstanceId,
          timestamp: new Date().toISOString(),
          discordData: body.discordUsername ? {
            username: body.discordUsername,
            userId: body.discordUserId
          } : null
        };

        console.log('💾 Datos guardados para usuario:', targetUserId);
        console.log('📋 Datos:', teleportData[targetUserId]);

        return res.status(200).json({
          success: true,
          message: '✅ Datos guardados para auto-join',
          data: {
            placeId: placeId,
            gameInstanceId: gameInstanceId,
            userId: targetUserId
          }
        });
      }
      else {
        return res.status(400).json({
          success: false,
          error: 'Datos incompletos'
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Método no permitido'
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno: ' + error.message
    });
  }
};
