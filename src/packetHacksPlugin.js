'use strict'

const MOVEMENT_PACKETS = new Set([
  'position',
  'position_look',
  'look',
  'flying'
])

const POSITION_PACKETS = new Set([
  'position',
  'position_look'
])

function packetHacks(bot) {
  const client = bot._client
  const originalWrite = client.write.bind(client)
  const originalWriteChannel = client.writeChannel?.bind(client)

  const outboundMiddleware = []
  const inboundMiddleware = []

  const hacks = {}
  const timers = new Map()
  const intervals = new Map()

  function registerHack(name, definition) {
    if (hacks[name]) throw new Error(`Hack "${name}" already registered`)

    hacks[name] = {
      name,
      enabled: false,
      config: { ...definition.defaults },
      onEnable: definition.onEnable,
      onDisable: definition.onDisable,
      onTick: definition.onTick,
      onOutbound: definition.onOutbound,
      onInbound: definition.onInbound,
      tickInterval: definition.tickInterval ?? null
    }
  }

  function enableHack(name, config = {}) {
    const hack = hacks[name]
    if (!hack) throw new Error(`Unknown hack: "${name}"`)
    if (hack.enabled) return

    Object.assign(hack.config, config)
    hack.enabled = true

    if (hack.onEnable) hack.onEnable(hack.config, api)

    if (hack.onTick && hack.tickInterval) {
      const id = setInterval(() => {
        if (!hack.enabled || !bot.entity) return
        hack.onTick(hack.config, api)
      }, typeof hack.tickInterval === 'function' ? hack.tickInterval(hack.config) : hack.tickInterval)
      intervals.set(name, id)
    }
  }

  function disableHack(name, options = {}) {
    const hack = hacks[name]
    if (!hack) throw new Error(`Unknown hack: "${name}"`)
    if (!hack.enabled) return

    hack.enabled = false

    if (intervals.has(name)) {
      clearInterval(intervals.get(name))
      intervals.delete(name)
    }

    if (hack.onDisable) hack.onDisable(hack.config, api, options)
  }

  function isEnabled(name) {
    return hacks[name]?.enabled ?? false
  }

  function getConfig(name) {
    return hacks[name] ? { ...hacks[name].config } : null
  }

  function updateConfig(name, config) {
    const hack = hacks[name]
    if (!hack) throw new Error(`Unknown hack: "${name}"`)
    Object.assign(hack.config, config)

    if (hack.enabled && hack.onTick && hack.tickInterval && intervals.has(name)) {
      clearInterval(intervals.get(name))
      const ms = typeof hack.tickInterval === 'function' ? hack.tickInterval(hack.config) : hack.tickInterval
      const id = setInterval(() => {
        if (!hack.enabled || !bot.entity) return
        hack.onTick(hack.config, api)
      }, ms)
      intervals.set(name, id)
    }
  }

  function addOutboundMiddleware(fn) {
    outboundMiddleware.push(fn)
  }

  function addInboundMiddleware(fn) {
    inboundMiddleware.push(fn)
  }

  function sendPacket(name, params) {
    originalWrite(name, params)
  }

  function getEntity() {
    return bot.entity
  }

  function getPosition() {
    return bot.entity?.position?.clone() ?? null
  }

  function getYaw() {
    return bot.entity?.yaw ?? 0
  }

  function getPitch() {
    return bot.entity?.pitch ?? 0
  }

  function directionVector(yaw, pitch) {
    return {
      x: -Math.sin(yaw) * Math.cos(pitch),
      y: -Math.sin(pitch),
      z: Math.cos(yaw) * Math.cos(pitch)
    }
  }

  function horizontalDirection(yaw, magnitude) {
    return {
      x: -Math.sin(yaw) * magnitude,
      z: Math.cos(yaw) * magnitude
    }
  }

  function sendPositionDelta(dx, dy, dz, onGround = false) {
    const pos = getPosition()
    if (!pos) return
    sendPacket('position', {
      x: pos.x + dx,
      y: pos.y + dy,
      z: pos.z + dz,
      onGround
    })
  }

  function sendPositionAbsolute(x, y, z, onGround = false) {
    sendPacket('position', { x, y, z, onGround })
  }

  function sendPositionLook(x, y, z, yaw, pitch, onGround = false) {
    sendPacket('position_look', { x, y, z, yaw, pitch, onGround })
  }

  client.write = function interceptWrite(name, params) {
    let packet = { name, params: { ...params }, cancelled: false }

    for (const hackName of Object.keys(hacks)) {
      const hack = hacks[hackName]
      if (!hack.enabled || !hack.onOutbound) continue
      packet = hack.onOutbound(packet, hack.config, api)
      if (!packet || packet.cancelled) return
    }

    for (const mw of outboundMiddleware) {
      packet = mw(packet, api)
      if (!packet || packet.cancelled) return
    }

    originalWrite(packet.name, packet.params)
  }

  client.on('packet', (data, meta) => {
    let packet = { name: meta.name, data: { ...data }, cancelled: false }

    for (const hackName of Object.keys(hacks)) {
      const hack = hacks[hackName]
      if (!hack.enabled || !hack.onInbound) continue
      packet = hack.onInbound(packet, hack.config, api)
      if (!packet || packet.cancelled) return
    }

    for (const mw of inboundMiddleware) {
      packet = mw(packet, api)
      if (!packet || packet.cancelled) return
    }
  })

  function disableAll() {
    for (const name of Object.keys(hacks)) {
      if (hacks[name].enabled) disableHack(name)
    }
  }

  function status() {
    const result = {}
    for (const [name, hack] of Object.entries(hacks)) {
      result[name] = {
        enabled: hack.enabled,
        config: { ...hack.config }
      }
    }
    return result
  }

  function listHacks() {
    return Object.keys(hacks)
  }

  const api = {
    registerHack,
    enableHack,
    disableHack,
    isEnabled,
    getConfig,
    updateConfig,
    disableAll,
    status,
    listHacks,
    addOutboundMiddleware,
    addInboundMiddleware,
    sendPacket,
    sendPositionDelta,
    sendPositionAbsolute,
    sendPositionLook,
    getEntity,
    getPosition,
    getYaw,
    getPitch,
    directionVector,
    horizontalDirection,
    bot,
    client
  }

  registerHack('fly', {
    defaults: {
      horizontalBoost: 0.45,
      verticalBoost: 0.0,
      mode: 'velocity'
    },
    tickInterval: (cfg) => 50,
    onEnable(config, api) {},
    onDisable(config, api) {},
    onTick(config, api) {
      const dir = api.horizontalDirection(api.getYaw(), config.horizontalBoost)
      api.sendPositionDelta(dir.x, config.verticalBoost, dir.z, false)
    },
    onOutbound(packet, config, api) {
      if (MOVEMENT_PACKETS.has(packet.name)) {
        packet.params.onGround = false
      }
      return packet
    }
  })

  registerHack('nofall', {
    defaults: {},
    onOutbound(packet, config, api) {
      if (MOVEMENT_PACKETS.has(packet.name) && packet.params) {
        packet.params.onGround = true
      }
      return packet
    }
  })

  registerHack('speed', {
    defaults: {
      multiplier: 2.0,
      burstCount: 2,
      stepSize: 0.17
    },
    onOutbound(packet, config, api) {
      if (!POSITION_PACKETS.has(packet.name)) return packet

      const count = Math.max(1, Math.floor(config.burstCount))
      const step = config.stepSize * (config.multiplier - 1)
      const dir = api.horizontalDirection(api.getYaw(), step)
      const ground = Boolean(packet.params?.onGround)

      setTimeout(() => {
        for (let i = 0; i < count; i++) {
          api.sendPositionDelta(dir.x, 0, dir.z, ground)
        }
      }, 0)

      return packet
    }
  })

  registerHack('blink', {
    defaults: {
      maxQueue: 300,
      _queue: []
    },
    onEnable(config) {
      config._queue = []
    },
    onDisable(config, api, options = {}) {
      if (options.flush !== false) {
        for (const pkt of config._queue) {
          api.sendPacket(pkt.name, pkt.params)
        }
      }
      config._queue = []
    },
    onOutbound(packet, config) {
      if (!MOVEMENT_PACKETS.has(packet.name)) return packet

      if (config._queue.length < config.maxQueue) {
        config._queue.push({ name: packet.name, params: { ...packet.params } })
      }

      packet.cancelled = true
      return packet
    }
  })

  registerHack('velocity', {
    defaults: {
      horizontal: 0.0,
      vertical: 0.0
    },
    onInbound(packet, config) {
      if (packet.name !== 'entity_velocity') return packet
      if (packet.data.entityId !== api.getEntity()?.id) return packet

      packet.data.velocityX = Math.floor(packet.data.velocityX * config.horizontal)
      packet.data.velocityY = Math.floor(packet.data.velocityY * config.vertical)
      packet.data.velocityZ = Math.floor(packet.data.velocityZ * config.horizontal)

      return packet
    }
  })

  registerHack('noknockback', {
    defaults: {},
    onInbound(packet, config, api) {
      if (packet.name !== 'entity_velocity') return packet
      if (packet.data.entityId !== api.getEntity()?.id) return packet

      packet.cancelled = true
      return packet
    }
  })

  registerHack('fastbreak', {
    defaults: {
      multiplier: 1.5
    },
    onOutbound(packet, config) {
      if (packet.name === 'block_dig' && packet.params.status === 0) {
        setTimeout(() => {
          api.sendPacket('block_dig', {
            ...packet.params,
            status: 2
          })
        }, Math.floor(50 / config.multiplier))
      }
      return packet
    }
  })

  registerHack('reach', {
    defaults: {
      distance: 6.0
    },
    onEnable() {},
    onDisable() {}
  })

  registerHack('norotate', {
    defaults: {},
    onInbound(packet) {
      if (packet.name === 'entity_look' || packet.name === 'entity_head_rotation') {
        if (packet.data.entityId === api.getEntity()?.id) {
          packet.cancelled = true
        }
      }
      return packet
    }
  })

  registerHack('phase', {
    defaults: {
      speed: 0.5
    },
    tickInterval: 50,
    onTick(config, api) {
      const dir = api.directionVector(api.getYaw(), api.getPitch())
      api.sendPositionDelta(
        dir.x * config.speed,
        dir.y * config.speed,
        dir.z * config.speed,
        false
      )
    }
  })

  bot.packetHacks = api

  bot.once('end', () => {
    disableAll()
    client.write = originalWrite
  })
}

module.exports = packetHacks
