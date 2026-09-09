module.exports = {
    // 1. BAJAMOS LOS LÍMITES PARA QUE ENCAJEN CON EL DIBUJO DEL CSS
    limites: { yMin: 36, yMax: 73, xTop: 28, xBottom: 10 },
    tiempoS: 120,
    // 2. CENTRAMOS LA MONEDA INICIAL EN LA NUEVA PISTA
    moneda: { x: 50, y: 65, activa: true, id: 0 },
    terminado: false,

    iniciar(jugadores) {
        this.tiempoS = 120;
        this.moneda = { x: 50, y: 65, activa: true, id: 0 };
        this.terminado = false;
        
        // 3. BAJAMOS LOS SPAWNS A LA PISTA DE HIELO REAL
        const spawns = [ {x: 35, y: 55}, {x: 65, y: 55}, {x: 25, y: 70}, {x: 75, y: 70} ];
        let index = 0;
        
        Object.values(jugadores).forEach(j => {
            j.puntos = 0;
            j.muertes = 0;
            j.cayendo = false;
            j.caidaInicio = 0;
            j.spawnInicial = spawns[index % 4];
            this.respawn(j);
            index++;
        });
        
        if(this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.tiempoS--;
            if (this.tiempoS <= 0) {
                this.terminado = true;
                clearInterval(this.timer);
            }
        }, 1000);
        
        return jugadores;
    },

    respawn(j) {
        j.x = j.spawnInicial.x; 
        j.y = j.spawnInicial.y;
        j.vx = 0; j.vy = 0;
        j.cayendo = false;
        j.caidaInicio = 0;
    },

    actualizar(jugadores) {
        if (this.terminado) return { terminado: true, jugadores };

        const lista = Object.values(jugadores);

        lista.forEach(j => {
            if (j.cayendo) return;
            j.x += j.vx;
            j.y += j.vy;
            j.vx *= 0.95; // friccion
            j.vy *= 0.95;

            const pctY = (j.y - this.limites.yMin) / (this.limites.yMax - this.limites.yMin);
            const margenX = this.limites.xTop + (pctY * (this.limites.xBottom - this.limites.xTop));
            
            // Si sale del trapecio (caída sin bordes)
            if (j.y < this.limites.yMin || j.y > this.limites.yMax || j.x < margenX || j.x > (100 - margenX)) {
                this.iniciarMuerte(j);
            }

            // Agarrar moneda
            const distMoneda = Math.hypot(j.x - this.moneda.x, j.y - this.moneda.y);
            // Amplié un poquito el rango de la moneda también para que coincida con su nuevo tamaño
            if (distMoneda < 6) { 
                j.puntos++;
                this.spawnMoneda();
            }
        });

        // --- NUEVAS COLISIONES TIPO CARRITOS CHOCONES ---
        const RADIO_COLISION = 2; // <--- Sube a 11 si se siguen atravesando un poco, o baja a 7 si chocan con el aire
        const FUERZA_REBOTE = 0.7; // <--- Qué tan fuerte salen volando al chocar

        for (let i = 0; i < lista.length; i++) {
            for (let k = i + 1; k < lista.length; k++) {
                const a = lista[i];
                const b = lista[k];
                
                if (a.cayendo || b.cayendo) continue;

                // Distancia matemática entre los dos jugadores
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.hypot(dx, dy);

                if (dist < RADIO_COLISION && dist > 0) {
                    // 1. Calcular el ángulo/dirección del choque
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // 2. Separarlos físicamente para que no se queden "fusionados" (Overlap)
                    const overlap = (RADIO_COLISION - dist) / 2;
                    a.x += nx * overlap;
                    a.y += ny * overlap;
                    b.x -= nx * overlap;
                    b.y -= ny * overlap;

                    // 3. Aplicar la fuerza de empuje en direcciones opuestas
                    a.vx += nx * FUERZA_REBOTE;
                    a.vy += ny * FUERZA_REBOTE;
                    b.vx -= nx * FUERZA_REBOTE;
                    b.vy -= ny * FUERZA_REBOTE;
                }
            }
        }

        return { terminado: false, jugadores, moneda: this.moneda, tiempo: this.tiempoS };
    },

    iniciarMuerte(j) {
        if (j.cayendo) return;
        j.cayendo = true;
        j.caidaInicio = Date.now();
        j.vx = 0;
        j.vy = 0;
        j.muertes++;
        setTimeout(() => {
            if (j.cayendo) this.respawn(j);
        }, 2000); // Revive a los 2 segundos
    },

    // 4. ASEGURAMOS QUE LAS NUEVAS MONEDAS APAREZCAN EN LA ZONA CORRECTA
    spawnMoneda() {
        // 1. Elegimos una altura (Y) al azar, pero le damos un pequeño margen (2%) para que no toque los bordes superior/inferior
        const margenY = 2;
        this.moneda.y = (this.limites.yMin + margenY) + Math.random() * (this.limites.yMax - this.limites.yMin - margenY * 2);

        // 2. Calculamos EXACTAMENTE qué tan ancha es la pista en esa altura Y (usando la misma fórmula de las caídas)
        const pctY = (this.moneda.y - this.limites.yMin) / (this.limites.yMax - this.limites.yMin);
        const margenLateralX = this.limites.xTop + (pctY * (this.limites.xBottom - this.limites.xTop));

        // 3. Le damos un margen de seguridad a los lados (3%) para que no aparezca colgando del borde
        const paddingX = 3;
        const limiteIzq = margenLateralX + paddingX;
        const limiteDer = 100 - margenLateralX - paddingX;

        // 4. Ponemos la moneda en un lugar seguro entre esos dos límites
        this.moneda.x = limiteIzq + Math.random() * (limiteDer - limiteIzq);
        this.moneda.id = (this.moneda.id || 0) + 1;
    }
};