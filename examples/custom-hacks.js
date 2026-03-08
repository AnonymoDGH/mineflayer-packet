'use strict'

const mineflayer = require('mineflayer')
const packetHacksPlugin = require('../src')

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'HackDev'
})

bot.loadPlugin(packetHacksPlugin)

bot.once('spawn', () => {
  console.log('[HackDev] Spawned, registering custom hacks...')

  // ──────────────────────────────────────────────
  // HACK 1: Jesus (walk on water)
  // Spoofs Y position to water surface level
  // ──────────────────────────────────────────────
  bot.packetHacks.registerHack('jesus', {
    defaults: {
      offset: 0.12
    },
    onOutbound(packet, config, api) {
      if (packet.name !== 'position' && packet.name !== 'position_look') return packet

      const pos = api.getPosition()
      if (!pos) return packet

      const block = api.bot.blockAt(pos.offset(0, -0.5, 0))
      if (!block) return packet

      const isWater = block.name === 'water' || block.name === 'flowing_water'
      const isLava = block.name === 'lava' || block.name === 'flowing_lava'

      if (isWater || isLava) {
        packet.params.y = Math.floor(packet.params.y) + 1.0 + config.offset
        packet.params.onGround = true
      }

      return packet
    }
  })

  // ──────────────────────────────────────────────
  // HACK 2: Spider (climb any wall)
  // Sends upward position when touching a wall
  // ──────────────────────────────────────────────
  bot.packetHacks.registerHack('spider', {
    defaults: {
      climbSpeed: 0.22
    },
    tickInterval: 50,
    onTick(config, api) {
      const pos = api.getPosition()
      if (!pos) return

      const yaw = api.getYaw()
      const checkDist = 0.3
      const frontX = pos.x + (-Math.sin(yaw) * checkDist)
      const frontZ = pos.z + (Math.cos(yaw) * checkDist)

      const blockInFront = api.bot.blockAt(api.bot.entity.position.offset(
        -Math.sin(yaw) * checkDist, 0, Math.cos(yaw) * checkDist
      ))

      if (blockInFront && blockInFront.boundingBox === 'block') {
        api.sendPositionDelta(0, config.climbSpeed, 0, true)
      }
    }
  })

  // ──────────────────────────────────────────────
  // HACK 3: HighJump (boosted jumps)
  // Intercepts jump and adds extra upward velocity
  // ──────────────────────────────────────────────
  bot.packetHacks.registerHack('highjump', {
    defaults: {
      boostHeight: 0.8,
      _lastY: 0,
      _jumping: false
    },
    onOutbound(packet, config, api) {
      if (packet.name !== 'position' && packet.name !== 'position_look') return packet

      const currentY = packet.params.y
      const deltaY = currentY - config._lastY
      config._lastY = currentY

      if (deltaY > 0.3 && !config._jumping) {
        config._jumping = true
        packet.params.y += config.boostHeight

        setTimeout(() => {
          config._jumping = false
        }, 600)
      }

      return packet
    }
  })

  // ──────────────────────────────────────────────
  // HACK 4: Glide (slow falling like elytra)
  // Reduces downward velocity to simulate gliding
  // ──────────────────────────────────────────────
  bot.packetHacks.registerHack('glide', {
    defaults: {
      fallSpeed: 0.04,
      _lastY: 0
    },
    onOutbound(packet, config, api) {
      if (packet.name !== 'position' && packet.name !== 'position_look') return packet

      const currentY = packet.params.y
      const deltaY = currentY - config._lastY

      if (deltaY < -0.1) {
        packet.params.y = config._lastY - config.fallSpeed
        packet.params.onGround = false
      }

      config._lastY = packet.params.y
      return packet
    }
  })

  // ──────────────────────────────────────────────
  // HACK 5: Step (auto step up blocks)
  // Teleports player on top of blocks in the way
  // ──────────────────────────────────────────────
  bot.packetHacks.registerHack('step', {
    defaults: {
      height: 1.0
    },
    tickInterval: 50,
    onTick(config, api) {
      const entity = api.getEntity()
      if (!entity) return

      if (!entity.isCollidedHorizontally) return

      const pos = api.getPosition()
      if (!pos) return

      const yaw = api.getYaw()
      const checkX = pos.x + (-Math.sin(yaw) * 0.5)
      const checkZ = pos.z + (Math.cos(yaw) * 0.5)

      const blockAbove = api.bot.blockAt(api.bot.entity.position.offset(
        -Math.sin(yaw) * 0.5, config.height, Math.cos(yaw) * 0.5
      ))

      if (!blockAbove || blockAbove.boundingBox !== 'block') {
        api.sendPositionDelta(0, config.height + 0.1, 0, false)
        setTimeout(() => {
          const dir = api.horizontalDirection(yaw, 0.3)
          api.sendPositionDelta(dir.x, 0, dir.z, true)
        }, 50)
      }
    }
  })

  // ──────────────────────────────────────────────
  // HACK 6: Derp (spin head randomly)
  // Sends random yaw/pitch to confuse other players
  // ──────────────────────────────────────────────
  bot.packetHacks.registerHack('derp', {
    defaults: {
      speed: 20
    },
    tickInterval: 50,
    onTick(config, api) {
      const pos = api.getPosition()
      if (!pos) return

      const randomYaw = Math.random() * 360 - 180
      const randomPitch = Math.random() * 180 - 90

      api.sendPacket('look', {
        yaw: randomYaw,
        pitch: randomPitch,
        onGround: true
      })
    }
  })

  // ──────────────────────────────────────────────
  // HACK 7: AntiAFK (prevents AFK kick)
  // Sends small movements and swings arm periodically
  // ──────────────────────────────────────────────
  bot.packetHacks.registerHack('antiafk', {
    defaults: {
      _tick: 0
    },
    tickInterval: 3000,
    onTick(config, api) {
      config._tick++
      const actions = config._tick % 4

      if (actions === 0) {
        api.sendPositionDelta(0.01, 0, 0, true)
        setTimeout(() => api.sendPositionDelta(-0.01, 0, 0, true), 100)
      }

      if (actions === 1) {
        api.sendPacket('arm_animation', { hand: 0 })
      }

      if (actions === 2) {
        const yaw = api.getYaw() + (Math.random() * 30 - 15)
        api.sendPacket('look', { yaw, pitch: 0, onGround: true })
      }

      if (actions === 3) {
        api.bot.setControlState('jump', true)
        setTimeout(() => api.bot.setControlState('jump', false), 100)
      }
    }
  })

  // ──────────────────────────────────────────────
  // HACK 8: PacketLogger (debug tool)
  // Logs all outbound movement packets to console
  // ──────────────────────────────────────────────
  bot.packetHacks.registerHack('logger', {
    defaults: {
      logInbound: false,
      filter: null
    },
    onOutbound(packet, config) {
      if (config.filter && packet.name !== config.filter) return packet
      console.log(`[OUT] ${packet.name}`, JSON.stringify(packet.params))
      return packet
    },
    onInbound(packet, config) {
      if (!config.logInbound) return packet
      if (config.filter && packet.name !== config.filter) return packet
      console.log(`[IN] ${packet.name}`, JSON.stringify(packet.data))
      return packet
    }
  })

  // ──────────────────────────────────────────────
  // HACK 9: Custom middleware example
  // Adds raw packet interception outside the hack system
  // ──────────────────────────────────────────────
  bot.packetHacks.addOutboundMiddleware((packet, api) => {
    if (packet.name === 'chat' && packet.params.message?.startsWith('/op ')) {
      console.log('[Middleware] Blocked /op command')
      packet.cancelled = true
    }
    return packet
  })

  console.log('[HackDev] Registered:', bot.packetHacks.listHacks().join(', '))
})

bot.on('chat', (username, message) => {
  if (username === bot.username) return
  const parts = message.trim().toLowerCase().split(' ')
  const cmd = parts[0]
  const arg = parts[1]

  if (cmd === '!on' && arg) {
    try {
      bot.packetHacks.enableHack(arg)
      bot.chat(`${arg} ON`)
    } catch (e) {
      bot.chat(`Unknown hack: ${arg}`)
    }
  }

  if (cmd === '!off' && arg) {
    try {
      bot.packetHacks.disableHack(arg)
      bot.chat(`${arg} OFF`)
    } catch (e) {
      bot.chat(`Unknown hack: ${arg}`)
    }
  }

  if (cmd === '!set' && parts.length >= 4) {
    const hack = parts[1]
    const key = parts[2]
    const value = parseFloat(parts[3])
    try {
      bot.packetHacks.updateConfig(hack, { [key]: isNaN(value) ? parts[3] : value })
      bot.chat(`${hack}.${key} = ${parts[3]}`)
    } catch (e) {
      bot.chat(`Error: ${e.message}`)
    }
  }

  if (cmd === '!list') {
    bot.chat(`Hacks: ${bot.packetHacks.listHacks().join(', ')}`)
  }

  if (cmd === '!status') {
    const s = bot.packetHacks.status()
    const active = Object.entries(s).filter(([, v]) => v.enabled).map(([k]) => k)
    bot.chat(active.length ? `Active: ${active.join(', ')}` : 'Nothing active')
  }

  if (cmd === '!panic' || cmd === '!hacks') {
    bot.packetHacks.disableAll()
    bot.chat('All hacks disabled')
  }
})

bot.on('error', (err) => console.error('[HackDev] Error:', err.message))
bot.once('end', () => console.log('[HackDev] Disconnected'))
