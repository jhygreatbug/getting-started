#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * Wechaty - Conversational RPA SDK for Chatbot Makers.
 *  - https://github.com/wechaty/wechaty
 */
// https://stackoverflow.com/a/42817956/1123955
// https://github.com/motdotla/dotenv/issues/89#issuecomment-587753552
import 'dotenv/config.js'

import {
  Contact,
  Message,
  ScanStatus,
  WechatyBuilder,
  log,
}                  from 'wechaty'

import qrcodeTerminal from 'qrcode-terminal'
import { DelayQueueExecutor } from 'rx-queue'

const ROOM_TOPIC_TEST = '调教小屋'
const ROOM_TOPIC_ME_SUNYAN_ZHIMING = '除了美貌一无所有'
// 没弄明白这个LISTENER_ID代表什么
const LISTENER_ID = '@d4a579c0f558bfbc3eef2bd5769230584985b14d670e6f602074124057830f42'
const CONTACT_NAME_YYY = '嘤嘤嘤'

const delay = new DelayQueueExecutor(1000)

const trimMentionText = (text: string) => {
  const firstSpaceIndex = text.indexOf(' ')
  return text.slice(firstSpaceIndex + 1)
}

function onScan (qrcode: string, status: ScanStatus) {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    const qrcodeImageUrl = [
      'https://wechaty.js.org/qrcode/',
      encodeURIComponent(qrcode),
    ].join('')
    log.info('StarterBot', 'onScan: %s(%s) - %s', ScanStatus[status], status, qrcodeImageUrl)

    qrcodeTerminal.generate(qrcode, { small: true })  // show qrcode on console

  } else {
    log.info('StarterBot', 'onScan: %s(%s)', ScanStatus[status], status)
  }
}

function onLogin (user: Contact) {
  log.info('StarterBot', '%s login', user)
}

function onLogout (user: Contact) {
  log.info('StarterBot', '%s logout', user)
}

async function 吃饭小助手 (msgText: string, msg: Message) {
  if (msgText === '饭') {
    const choices = [
      'B1',
      'T3',
      'T12',
      '美食城',
      '麦当劳',
      '罗森',
      'B1新商家',
    ]
    const responseText = choices[Math.floor(Math.random() * choices.length)] ?? '出错了'
    const hours = new Date().getHours()
    let timeText = '明天中午'
    if (hours > 4 && hours <= 14) {
      timeText = '今天中午'
    } else if (hours <= 22) {
      timeText = '今天晚上'
    }
    // todo: 消除外部变量
    await delay.execute(async () => await msg.say(`又到了愉快的干饭时间，${timeText}去${responseText}觅食吧～`))
  }
}

async function 查询信息 (msgText: string, msg: Message) {
  if (msgText === 'yyy_debug') {
    const logTextList: string[] = []
    const talkContact = msg.talker()
    const listenerContact = msg.listener()
    const room = msg.room()
    logTextList.push(`date: ${msg.date()}`)
    logTextList.push(`age: ${msg.age()}`)
    if (room) {
      logTextList.push(`room id: ${room.id}`)
      logTextList.push(`room topic: ${await room.topic()}`)
      logTextList.push(`room handle: ${room.handle()}`)
    }
    logTextList.push(`talk contact id: ${talkContact.id}`)
    logTextList.push(`talk contact name: ${talkContact.name()}`)
    logTextList.push(`talk contact handle: ${talkContact.handle()}`)
    if (listenerContact) {
      logTextList.push(`listener contact id: ${listenerContact.id}`)
      logTextList.push(`listener contact name: ${listenerContact.name()}`)
      logTextList.push(`listener contact handle: ${listenerContact.handle()}`)
    }
    const text = logTextList.join('\n')
    // todo: 消除外部变量
    await delay.execute(async () => await msg.say(text))
  }
}

async function onMessage (msg: Message) {
  log.info('StarterBot', msg.toString())

  const talkContact = msg.talker()
  const room = msg.room()

  // 跳过本人的消息
  if (talkContact.self()) {
    return
  }

  // 跳过近期的消息（重启服务，会把近期消息重新走一遍……）
  // 为什么是180: massage存活180秒后换新，所以实时消息age上限是180
  if (msg.age() > 180) {
    return
  }

  if (room) {
    // 群聊
    const [ isMentionSelf, roomTopic ] = await Promise.all([ msg.mentionSelf(), room.topic() ])

    await 查询信息(trimMentionText(msg.text()), msg)

    if (roomTopic === ROOM_TOPIC_ME_SUNYAN_ZHIMING || roomTopic === ROOM_TOPIC_TEST) {
      if (isMentionSelf) {
        // todo: trimMentionText限定在文本开头at，这个策略是否合理
        await 吃饭小助手(trimMentionText(msg.text()), msg)
      }
    }
  } else {
    // 私聊

    await 查询信息(msg.text(), msg)

    if (talkContact.name() === CONTACT_NAME_YYY) {
      await 吃饭小助手(msg.text(), msg)
    }
  }
}

const bot = WechatyBuilder.build({
  name: 'ding-dong-bot',
  puppet: 'wechaty-puppet-wechat',
  puppetOptions: {
    uos: true,
  },
  /**
   * You can specific `puppet` and `puppetOptions` here with hard coding:
   *
  puppet: 'wechaty-puppet-wechat',
  puppetOptions: {
    uos: true,
  },
   */
  /**
   * How to set Wechaty Puppet Provider:
   *
   *  1. Specify a `puppet` option when instantiating Wechaty. (like `{ puppet: 'wechaty-puppet-whatsapp' }`, see below)
   *  1. Set the `WECHATY_PUPPET` environment variable to the puppet NPM module name. (like `wechaty-puppet-whatsapp`)
   *
   * You can use the following providers locally:
   *  - wechaty-puppet-wechat (web protocol, no token required)
   *  - wechaty-puppet-whatsapp (web protocol, no token required)
   *  - wechaty-puppet-padlocal (pad protocol, token required)
   *  - etc. see: <https://wechaty.js.org/docs/puppet-providers/>
   */
  // puppet: 'wechaty-puppet-whatsapp'

  /**
   * You can use wechaty puppet provider 'wechaty-puppet-service'
   *   which can connect to remote Wechaty Puppet Services
   *   for using more powerful protocol.
   * Learn more about services (and TOKEN) from https://wechaty.js.org/docs/puppet-services/
   */
  // puppet: 'wechaty-puppet-service'
  // puppetOptions: {
  //   token: 'xxx',
  // }
})

bot.on('scan',    onScan)
bot.on('login',   onLogin)
bot.on('logout',  onLogout)
bot.on('message', onMessage)

bot.start()
  .then(() => log.info('StarterBot', 'Starter Bot Started.'))
  .catch(e => log.error('StarterBot', e))
