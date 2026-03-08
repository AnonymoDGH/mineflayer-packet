'use strict'

const mineflayer = require('mineflayer')
const packetHacksPlugin = require('../src')

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'PacketBot'
})

bot.loadPlugin(packetHacksPlugin)

bot.once('spawn', () => {
  console.log('[PacketBot] Spawned, enabling fly + nofall...')

  bot.packetHacks.enableHack('fly', {
    horizontalBoost: 0.55,
    verticalBoost: 0.03
  })

  bot.packetHacks.enableHack('nofall')

  setTimeout(() => {
    console.log('[PacketBot] Enabling speed x2.5 for 8 seconds')
    bot.packetHacks.enableHack('speed', {
      multiplier: 2.5,
      burstCount: 3
    })
  }, 5000)

  setTimeout(() => {
    console.log('[PacketBot] Disabling speed')
    bot.packetHacks.disableHack('speed')
  }, 13000)
})

bot.on('chat', (username, message) => {
  if (username === bot.username) return
  const msg = message.trim().toLowerCase()

  if (msg === '!fly on') {
    bot.packetHacks.enableHack('fly', { horizontalBoost: 0.5, verticalBoost: 0.02 })
    bot.chat('Fly ON')
  }

  if (msg === '!fly off') {
    bot.packetHacks.disableHack('fly')
    bot.chat('Fly OFF')
  }

  if (msg === '!nofall on') {
    bot.packetHacks.enableHack('nofall')
    bot.chat('NoFall ON')
  }

  if (msg === '!nofall off') {
    bot.packetHacks.disableHack('nofall')
    bot.chat('NoFall OFF')
  }

  if (msg === '!speed on') {
    bot.packetHacks.enableHack('speed', { multiplier: 2.0, burstCount: 2 })
    bot.chat('Speed ON')
  }

  if (msg === '!speed off') {
    bot.packetHacks.disableHack('speed')
    bot.chat('Speed OFF')
  }

  if (msg === '!blink on') {
    bot.packetHacks.enableHack('blink', { maxQueue: 200 })
    bot.chat('Blink ON')
  }

  if (msg === '!blink off') {
    bot.packetHacks.disableHack('blink', { flush: true })
    bot.chat('Blink OFF (flushed)')
  }

  if (msg === '!nokb on') {
    bot.packetHacks.enableHack('noknockback')
    bot.chat('NoKnockback ON')
  }

  if (msg === '!nokb off') {
    bot.packetHacks.disableHack('noknockback')
    bot.chat('NoKnockback OFF')
  }

  if (msg === '!phase on') {
    bot.packetHacks.enableHack('phase', { speed: 0.6 })
    bot.chat('Phase ON')
  }

  if (msg === '!phase off') {
    bot.packetHacks.disableHack('phase')
    bot.chat('Phase OFF')
  }

  if (msg === '!velocity on') {
    bot.packetHacks.enableHack('velocity', { horizontal: 0.0, vertical: 0.0 })
    bot.chat('Velocity OFF (zeroed)')
  }

  if (msg === '!velocity off') {
    bot.packetHacks.disableHack('velocity')
    bot.chat('Velocity reset to normal')
  }

  if (msg === '!hacks off') {
    bot.packetHacks.disableAll()
    bot.chat('All hacks disabled')
  }

  if (msg === '!status') {
    const s = bot.packetHacks.status()
    const active = Object.entries(s)
      .filter(([, v]) => v.enabled)
      .map(([k]) => k)

    bot.chat(active.length ? `Active: ${active.join(', ')}` : 'No hacks active')
    console.log('[PacketBot] Status:', JSON.stringify(s, null, 2))
  }

  if (msg === '!list') {
    const all = bot.packetHacks.listHacks()
    bot.chat(`Available: ${all.join(', ')}`)
  }
})

bot.on('error', (err) => {
  console.error('[PacketBot] Error:', err.message)
})

bot.once('end', () => {
  console.log('[PacketBot] Disconnected')
})
