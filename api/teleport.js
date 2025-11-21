const axios = require('axios');

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { placeId, gameInstanceId, robloxUserId } = req.body;
      
      console.log('📨 Datos recibidos:', { placeId, gameInstanceId, robloxUserId });
      
      // Validar datos requeridos
      if (!placeId || !gameInstanceId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Se requieren placeId y gameInstanceId' 
        });
      }

      // Simular guardado en base de datos (por ahora)
      // Más adelante integraremos Roblox Datastore
      
      res.status(200).json({ 
        success: true, 
        message: '✅ Datos recibidos para auto-join',
        data: { 
          placeId: placeId,
          gameInstanceId: gameInstanceId,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor: ' + error.message 
      });
    }
  } else if (req.method === 'GET') {
    // Para testing - verificar que el endpoint funciona
    res.status(200).json({ 
      success: true, 
      message: '✅ Endpoint de auto-join funcionando',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(405).json({ 
      success: false, 
      error: 'Método no permitido. Use POST o GET' 
    });
  }
}
