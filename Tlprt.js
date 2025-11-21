const axios = require('axios');

module.exports = async (req, res) => {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Manejar preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { placeId, gameInstanceId, robloxUserId } = req.body;
      
      // Validar datos
      if (!placeId || !gameInstanceId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Faltan placeId o gameInstanceId' 
        });
      }

      // Aquí guardarías en Roblox Datastore
      // Por ahora simulamos éxito
      console.log('Datos recibidos:', { placeId, gameInstanceId, robloxUserId });
      
      res.status(200).json({ 
        success: true, 
        message: 'Datos recibidos para auto-join',
        data: { placeId, gameInstanceId }
      });
      
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  } else {
    res.status(405).json({ 
      success: false, 
      error: 'Método no permitido' 
    });
  }
};
