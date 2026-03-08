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
  console.log('Bot listo, activando fly + noFall...')

  bot.packetHacks.enableFly({
    horizontalBoost: 0.55,
    verticalBoost: 0.03,
    intervalMs: 50
  })

  bot.packetHacks.enableNoFall()

  setTimeout(() => {
    console.log('Activando speed x2.5 por 8 segundos')
    bot.packetHacks.enableSpeed({ multiplier: 2.5, burstPackets: 3 })
  }, 5000)

  setTimeout(() => {
    console.log('Desactivando speed')
    bot.packetHacks.disableSpeed()
  }, 13000)
})

bot.on('chat', (username, message) => {
  if (username === bot.username) return

  if (message === '!blink on') {
    bot.packetHacks.enableBlink({ maxQueue: 200 })
    bot.chat('Blink ON')
  }

  if (message === '!blink off') {
    bot.packetHacks.disableBlink({ flush: true })
    bot.chat('Blink OFF (flush)')
  }

  if (message === '!hacks off') {
    bot.packetHacks.disableFly()
    bot.packetHacks.disableNoFall()
    bot.packetHacks.disableSpeed()
    bot.packetHacks.disableBlink({ flush: false })
    bot.chat('Todos los hacks desactivados')
  }
})
