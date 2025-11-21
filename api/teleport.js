// api/teleport.js - VERSIÓN CORREGIDA
module.exports = async (req, res) => {
  // Configurar CORS primero
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Endpoint de prueba
      return res.status(200).json({
        success: true,
        message: '✅ API de Auto-Join funcionando',
        timestamp: new Date().toISOString(),
        endpoints: {
          'GET /api/teleport': 'Estado del servicio',
          'POST /api/teleport': 'Enviar datos de teleport'
        }
      });
    }

    if (req.method === 'POST') {
      // Parsear el body
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'Body JSON inválido'
        });
      }

      const { placeId, gameInstanceId, robloxUserId } = body;
      
      console.log('📨 Datos recibidos:', { placeId, gameInstanceId, robloxUserId });
      
      // Validaciones básicas
      if (!placeId) {
        return res.status(400).json({
          success: false,
          error: 'placeId es requerido'
        });
      }
      
      if (!gameInstanceId) {
        return res.status(400).json({
          success: false,
          error: 'gameInstanceId es requerido'
        });
      }

      // Simulamos éxito (aquí después guardarás en Datastore)
      const responseData = {
        success: true,
        message: '✅ Datos recibidos para auto-join',
        data: {
          placeId: placeId.toString(),
          gameInstanceId: gameInstanceId.toString(),
          robloxUserId: robloxUserId || 'no-provided',
          receivedAt: new Date().toISOString()
        }
      };

      return res.status(200).json(responseData);
    }

    // Método no permitido
    return res.status(405).json({
      success: false,
      error: 'Método no permitido. Use GET o POST'
    });

  } catch (error) {
    console.error('❌ Error interno:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
};
