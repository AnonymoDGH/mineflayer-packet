'use strict'

const MOVEMENT_PACKETS = new Set(['position', 'position_look', 'look', 'flying'])

function mineflayerPacketHacks (bot, options = {}) {
  const state = {
    enabled: {
      fly: false,
      noFall: false,
      speed: false,
      blink: false
    },
    fly: {
      intervalMs: options.flyIntervalMs ?? 50,
      verticalBoost: options.flyVerticalBoost ?? 0.0,
      horizontalBoost: options.flyHorizontalBoost ?? 0.45,
      timer: null
    },
    speed: {
      multiplier: options.speedMultiplier ?? 2.0,
      burstPackets: options.speedBurstPackets ?? 2
    },
    blink: {
      queue: [],
      maxQueue: options.maxBlinkQueue ?? 300
    }
  }

  const client = bot._client
  const originalWrite = client.write.bind(client)

  function currentYawRad () {
    return (bot.entity?.yaw ?? 0)
  }

  function writePositionLikePacket (dx, dy, dz, onGround = false) {
    const entity = bot.entity
    if (!entity) return

    const x = entity.position.x + dx
    const y = entity.position.y + dy
    const z = entity.position.z + dz

    originalWrite('position', {
      x,
      y,
      z,
      onGround
    })
  }

  function flyTick () {
    if (!state.enabled.fly || !bot.entity) return

    const yaw = currentYawRad()
    const forwardX = -Math.sin(yaw) * state.fly.horizontalBoost
    const forwardZ = Math.cos(yaw) * state.fly.horizontalBoost
    const up = state.fly.verticalBoost

    writePositionLikePacket(forwardX, up, forwardZ, false)
  }

  function startFlyLoop () {
    if (state.fly.timer) clearInterval(state.fly.timer)
    state.fly.timer = setInterval(flyTick, state.fly.intervalMs)
  }

  function stopFlyLoop () {
    if (state.fly.timer) {
      clearInterval(state.fly.timer)
      state.fly.timer = null
    }
  }

  function flushBlinkQueue () {
    const packets = state.blink.queue.splice(0, state.blink.queue.length)
    for (const { name, params } of packets) originalWrite(name, params)
  }

  client.write = function writeIntercept (name, params) {
    if (MOVEMENT_PACKETS.has(name)) {
      if (state.enabled.noFall && params && typeof params === 'object') {
        params = { ...params, onGround: true }
      }

      if (state.enabled.speed && (name === 'position' || name === 'position_look')) {
        const extraPackets = Math.max(1, Math.floor(state.speed.burstPackets))
        originalWrite(name, params)

        const yaw = currentYawRad()
        const step = 0.17 * (state.speed.multiplier - 1)
        const dx = -Math.sin(yaw) * step
        const dz = Math.cos(yaw) * step

        for (let i = 0; i < extraPackets; i++) {
          writePositionLikePacket(dx, 0, dz, Boolean(params?.onGround))
        }
        return
      }

      if (state.enabled.blink) {
        if (state.blink.queue.length < state.blink.maxQueue) {
          state.blink.queue.push({ name, params })
        }
        return
      }
    }

    originalWrite(name, params)
  }

  bot.packetHacks = {
    enableFly (config = {}) {
      state.fly.horizontalBoost = config.horizontalBoost ?? state.fly.horizontalBoost
      state.fly.verticalBoost = config.verticalBoost ?? state.fly.verticalBoost
      state.fly.intervalMs = config.intervalMs ?? state.fly.intervalMs
      state.enabled.fly = true
      startFlyLoop()
    },

    disableFly () {
      state.enabled.fly = false
      stopFlyLoop()
    },

    enableNoFall () {
      state.enabled.noFall = true
    },

    disableNoFall () {
      state.enabled.noFall = false
    },

    enableSpeed (config = {}) {
      state.speed.multiplier = config.multiplier ?? state.speed.multiplier
      state.speed.burstPackets = config.burstPackets ?? state.speed.burstPackets
      state.enabled.speed = true
    },

    disableSpeed () {
      state.enabled.speed = false
    },

    enableBlink (config = {}) {
      state.blink.maxQueue = config.maxQueue ?? state.blink.maxQueue
      state.enabled.blink = true
    },

    disableBlink ({ flush = true } = {}) {
      state.enabled.blink = false
      if (flush) flushBlinkQueue()
      else state.blink.queue.splice(0, state.blink.queue.length)
    },

    flushBlinkQueue,

    status () {
      return {
        ...state.enabled,
        queuedBlinkPackets: state.blink.queue.length,
        fly: { ...state.fly, timer: Boolean(state.fly.timer) },
        speed: { ...state.speed }
      }
    }
  }

  bot.once('end', () => {
    stopFlyLoop()
    client.write = originalWrite
  })
}

module.exports = mineflayerPacketHacks
