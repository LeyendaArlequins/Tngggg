// api/teleport.js - VERSIÓN ACTUALIZADA
let teleportData = {};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let body = {};
    if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        message: ' API de Auto-Join funcionando',
        activeTeleports: Object.keys(teleportData).length,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === 'POST') {
      const { action, placeId, gameInstanceId, userId, animalData, source } = body;

      // Si viene del script de Roblox (discreto)
      if (source === "roblox_script" && placeId && gameInstanceId) {
        console.log('🦄 Datos recibidos de Roblox:', { 
          placeId, 
          gameInstanceId,
          animal: animalData?.displayName,
          value: animalData?.value
        });

        // Guardar para auto-join
        teleportData['auto-join'] = {
          placeId: placeId,
          gameInstanceId: gameInstanceId,
          animalData: animalData,
          timestamp: new Date().toISOString(),
          source: 'roblox_direct'
        };

        return res.status(200).json({
          success: true,
          message: '✅ Datos recibidos discretamente',
          received: true
        });
      }

      // Resto del código para otras acciones...
      if (action === "getTeleportData") {
        const userData = teleportData[userId] || teleportData['auto-join'];
        if (userData && userData.placeId && userData.gameInstanceId) {
          return res.status(200).json({
            success: true,
            data: {
              placeId: userData.placeId,
              gameInstanceId: userData.gameInstanceId,
              animalData: userData.animalData
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
        delete teleportData[userId];
        delete teleportData['auto-join'];
        return res.status(200).json({
          success: true,
          message: 'Datos limpiados'
        });
      }
      else if (placeId && gameInstanceId) {
        // De Discord (como antes)
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

      return res.status(400).json({
        success: false,
        error: 'Datos incompletos'
      });
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
