// api/teleport.js - CORREGIDO PARA ENVIAR DATOS COMPLETOS
let teleportQueue = [];

// Función para limpiar datos expirados
function cleanExpiredData() {
    const now = Date.now();
    const expirationTime = 20000; // 20 segundos
    
    // Mantener solo los datos que no han expirado
    teleportQueue = teleportQueue.filter(item => 
        item.timestamp && (now - item.timestamp) <= expirationTime
    );
}

// Limpiar cada segundo
setInterval(cleanExpiredData, 1000);

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
        let body = {};
        if (req.body) {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        }

        if (req.method === 'GET') {
            cleanExpiredData();
            
            // ✅ CORREGIDO: Enviar TODOS los datos incluyendo animalData completo
            const activeServers = teleportQueue.map(item => ({
                placeId: item.placeId,
                gameInstanceId: item.gameInstanceId,
                animalData: item.animalData || { // ✅ Asegurar que animalData se envíe completo
                    displayName: "Desconocido",
                    value: 0,
                    generation: "?",
                    rarity: "?"
                },
                expiresIn: Math.max(0, 20000 - (Date.now() - item.timestamp)) + 'ms',
                timestamp: item.timestamp
            }));

            return res.status(200).json({
                success: true,
                message: '✅ API con sistema de cola - DATOS COMPLETOS',
                queueLength: teleportQueue.length,
                activeServers: activeServers, // ✅ Ahora incluye animalData completo
                timestamp: new Date().toISOString()
            });
        }

        if (req.method === 'POST') {
            const { action, placeId, gameInstanceId, userId, animalData, source } = body;

            cleanExpiredData();

            // Agregar nuevo servidor a la cola
            if (source === "roblox_script" && placeId && gameInstanceId) {
                const newItem = {
                    placeId: placeId,
                    gameInstanceId: gameInstanceId,
                    animalData: animalData || { // ✅ Asegurar estructura completa
                        displayName: animalData?.displayName || "Desconocido",
                        value: animalData?.value || 0,
                        generation: animalData?.generation || "?", // ✅ Generation incluida
                        rarity: animalData?.rarity || "?"
                    },
                    timestamp: Date.now(),
                    source: 'roblox_direct',
                    id: `${placeId}-${gameInstanceId}-${Date.now()}`
                };

                // Verificar si ya existe en la cola
                const exists = teleportQueue.some(item => 
                    item.placeId === placeId && item.gameInstanceId === gameInstanceId
                );

                if (!exists) {
                    teleportQueue.push(newItem);
                    console.log('🦄 Nuevo servidor en cola:', { 
                        placeId, 
                        gameInstanceId,
                        animal: animalData?.displayName,
                        generation: animalData?.generation, // ✅ Log de generation
                        value: animalData?.value,
                        rarity: animalData?.rarity,
                        queuePosition: teleportQueue.length
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: '✅ Servidor agregado a la cola',
                    queueLength: teleportQueue.length,
                    added: !exists
                });
            }

            // Obtener el PRIMER servidor de la cola (sistema FIFO)
            if (action === "getTeleportData") {
                if (teleportQueue.length > 0) {
                    const firstItem = teleportQueue[0];
                    const timeLeft = Math.max(0, 20000 - (Date.now() - firstItem.timestamp));
                    
                    return res.status(200).json({
                        success: true,
                        data: {
                            placeId: firstItem.placeId,
                            gameInstanceId: firstItem.gameInstanceId,
                            animalData: firstItem.animalData, // ✅ Incluye generation
                            timeLeft: timeLeft,
                            queuePosition: 1,
                            queueLength: teleportQueue.length
                        }
                    });
                } else {
                    return res.status(200).json({
                        success: true,
                        data: null,
                        message: 'No hay servidores en la cola'
                    });
                }
            }

            // Remover el PRIMER servidor de la cola (después del teleport)
            if (action === "removeFirstFromQueue") {
                if (teleportQueue.length > 0) {
                    const removed = teleportQueue.shift();
                    console.log('✅ Servidor removido de la cola:', {
                        gameInstanceId: removed.gameInstanceId,
                        animal: removed.animalData?.displayName,
                        generation: removed.animalData?.generation // ✅ Log de generation
                    });
                    console.log('📊 Cola restante:', teleportQueue.length);
                    
                    return res.status(200).json({
                        success: true,
                        message: 'Servidor removido de la cola',
                        removed: removed.gameInstanceId,
                        queueLength: teleportQueue.length
                    });
                }
                
                return res.status(200).json({
                    success: true,
                    message: 'Cola vacía'
                });
            }

            // Limpiar TODA la cola
            if (action === "clearQueue") {
                const count = teleportQueue.length;
                teleportQueue = [];
                console.log('💥 Cola limpiada:', count + ' servidores');
                return res.status(200).json({
                    success: true,
                    message: `Cola limpiada (${count} servidores)`
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
