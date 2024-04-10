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

const ROOM_ID_TEST = '@@7e58d4f873814046603721917a3702e4800ececb46ab1ad5aada10e52b0793a1'
const ROOM_ID_ME_SUNYAN_ZHIMING = '@@9e122b45ddc8485a5ddab5fa0ad30f59bb3a9bad92f1b4791388cebb846e1558'
// 没弄明白这个LISTENER_ID代表什么
const LISTENER_ID = '@d4a579c0f558bfbc3eef2bd5769230584985b14d670e6f602074124057830f42'
const CONTACT_ID_YYY = '@99e12c136d8f6898a36752894d3425aac9289f578fa98b58f0c1cee6cca17e49'

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
    if (room) {
      logTextList.push(`room id: ${room.id}`)
    }
    logTextList.push(`talk contact id: ${talkContact.id}`)
    logTextList.push(`talk contact name: ${talkContact.name()}`)
    if (listenerContact) {
      logTextList.push(`listener contact id: ${listenerContact.id}`)
      logTextList.push(`listener contact name: ${listenerContact.name()}`)
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
  if (msg.age() > 60) {
    return
  }

  if (room) {
    // 群聊
    const isMentionSelf = await msg.mentionSelf()

    if (room.id === ROOM_ID_ME_SUNYAN_ZHIMING || room.id === ROOM_ID_TEST) {
      // 我、孙燕、志明
      if (isMentionSelf) {
        // todo: trimMentionText限定在文本开头at，这个策略是否合理
        await 吃饭小助手(trimMentionText(msg.text()), msg)
        await 查询信息(trimMentionText(msg.text()), msg)
      }
    }
  } else {
    // 私聊

    if (talkContact.id === CONTACT_ID_YYY) {
      await 吃饭小助手(msg.text(), msg)
      await 查询信息(msg.text(), msg)
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
