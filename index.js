'use strict'

const { promisify } = require('util')

const unix = require('unix-dgram')

const NOTIFY_SOCKET = process.env.NOTIFY_SOCKET || ''
const WATCHDOG_USEC = process.env.WATCHDOG_USEC || 0
const WATCHDOG_PID = +(process.env.WATCHDOG_PID || '')

const noop = async () => {}

try {
  if (!NOTIFY_SOCKET) throw new Error('NOTIFY_SOCKET is not set. Make sure you are running under systemd with Type=notify')

  const NOTIFY_SOCKET_PATH = NOTIFY_SOCKET.replace(/^@/, '\0')
  const WATCHDOG_MS = Math.trunc(+WATCHDOG_USEC / 1000)

  const socket = unix.createSocket('unix_dgram')
  const notify = promisify(socket.send.bind(socket))

  /**
   */
  const barrier = () => notify(Buffer.from('BARRIER=1'), 0, 9, NOTIFY_SOCKET_PATH)

  const ready = () => {
    return notify(Buffer.from('READY=1'), 0, 7, NOTIFY_SOCKET_PATH)
      .then(barrier)
  }

  const stopping = () => notify(Buffer.from('STOPPING=1'), 0, 10, NOTIFY_SOCKET_PATH)

  const watchdog = () => notify(Buffer.from('WATCHDOG=1'), 0, 10, NOTIFY_SOCKET_PATH)

  const watchdogInterval = () => WATCHDOG_MS

  const status = (msg = '') => {
    const buf = Buffer.concat([
      Buffer.from('STATUS='),
      Buffer.isBuffer(msg) ? msg : Buffer.from(msg),
    ])
    return notify(buf, 0, buf.length, NOTIFY_SOCKET_PATH)
  }

  module.exports = {
    NOTIFY_SOCKET,
    WATCHDOG_USEC,
    WATCHDOG_PID,

    barrier,
    ready,
    stopping,
    watchdog,
    watchdogInterval,
    status,
  }
} catch (err) {
  console.warn(err.message)

  module.exports = {
    NOTIFY_SOCKET,
    WATCHDOG_USEC,
    WATCHDOG_PID,

    ready: noop,
    stopping: noop,
    watchdog: noop,
    watchdogInterval: noop,
    status: noop,
  }
}
