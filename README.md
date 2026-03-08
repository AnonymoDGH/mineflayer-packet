# mineflayer-packet

Plugin de Mineflayer para manipular paquetes de movimiento y habilitar modos tipo **fly**, **noFall**, **speed** y **blink**.

> ⚠️ Úsalo solo en entornos de prueba (servidores privados o laboratorio).

![Flujo de paquetes](docs/assets/packet-flow.svg)
![Resumen de hacks](docs/assets/hacks-overview.svg)

## 1) Instalación rápida

```bash
npm install mineflayer
```

Copia este repo en tu proyecto y carga el plugin:

```js
const mineflayer = require('mineflayer')
const packetHacksPlugin = require('./src')

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'PacketBot'
})

bot.loadPlugin(packetHacksPlugin)
```

---

## 2) API del plugin

Al cargar el plugin, se expone `bot.packetHacks` con estos métodos:

- `enableFly(config)`
- `disableFly()`
- `enableNoFall()`
- `disableNoFall()`
- `enableSpeed(config)`
- `disableSpeed()`
- `enableBlink(config)`
- `disableBlink({ flush })`
- `flushBlinkQueue()`
- `status()`

### Configuración de `enableFly(config)`

- `horizontalBoost` (default: `0.45`) → avance horizontal por tick de fly.
- `verticalBoost` (default: `0.0`) → empuje vertical por tick.
- `intervalMs` (default: `50`) → cada cuánto se envía el paquete.

### Configuración de `enableSpeed(config)`

- `multiplier` (default: `2.0`) → cuánto “acelera” el movimiento.
- `burstPackets` (default: `2`) → cuántos paquetes extra mandar por movimiento.

### Configuración de `enableBlink(config)`

- `maxQueue` (default: `300`) → máximo de paquetes en cola.

---

## 3) Ejemplos de cada hack

## 3.1 Fly

```js
bot.packetHacks.enableFly({
  horizontalBoost: 0.55,
  verticalBoost: 0.03,
  intervalMs: 50
})
```

- `horizontalBoost` alto = más velocidad frontal.
- `verticalBoost` positivo = gana altura de forma constante.

Para apagar:

```js
bot.packetHacks.disableFly()
```

## 3.2 NoFall

```js
bot.packetHacks.enableNoFall()
```

Esto fuerza `onGround: true` en paquetes de movimiento salientes.

Para apagar:

```js
bot.packetHacks.disableNoFall()
```

## 3.3 Speed

```js
bot.packetHacks.enableSpeed({ multiplier: 2.5, burstPackets: 3 })
```

Esto inyecta paquetes extra con pequeños offsets en dirección de mirada.

Para apagar:

```js
bot.packetHacks.disableSpeed()
```

## 3.4 Blink

```js
bot.packetHacks.enableBlink({ maxQueue: 200 })
```

Durante Blink, los paquetes de movimiento se guardan en cola en vez de enviarse.

Para apagar y enviar todo de golpe:

```js
bot.packetHacks.disableBlink({ flush: true })
```

Para apagar y tirar la cola:

```js
bot.packetHacks.disableBlink({ flush: false })
```

---

## 4) Script de ejemplo completo

Tienes un script listo en:

- `examples/basic-usage.js`

Ejecuta:

```bash
node examples/basic-usage.js
```

Comandos por chat en el ejemplo:

- `!blink on`
- `!blink off`
- `!hacks off`

---

## 5) ¿Cómo funciona internamente?

1. El plugin guarda la función original `bot._client.write`.
2. Sobrescribe `write` para interceptar paquetes de movimiento.
3. Según el hack activo:
   - **noFall** modifica `onGround`.
   - **speed** duplica/inserta paquetes de posición.
   - **blink** encola paquetes y los libera luego.
   - **fly** usa un loop con `setInterval` para empujar posición.
4. Al terminar el bot (`end`), restaura `write` original.

---

## 6) Consejos para estabilidad

- No actives todos los hacks al máximo al mismo tiempo.
- Ajusta `intervalMs`, `multiplier` y `burstPackets` gradualmente.
- Si el servidor tiene anticheat, prueba valores bajos.
- Usa `bot.packetHacks.status()` para inspeccionar estado interno.

