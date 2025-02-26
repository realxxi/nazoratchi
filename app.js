import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.API_TOKEN;
const admins = process.env.ADMINS.split(',').map(String);
const userInviteCount = {}; // Foydalanuvchi takliflarini saqlash

const bot = new TelegramBot(token, { polling: true });
console.log('✅ Bot ishga tushdi...');

const isAdmin = (userId) => admins.includes(userId.toString());

// /admin buyrug‘i
bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, '🚫 Sizda admin panelga kirish huquqi yo‘q.');
  }

  const adminPanel = `⚙️ *Admin Panel*\n\n/ban [user_id] - Foydalanuvchini bloklash\n/unban [user_id] - Foydalanuvchini tiklash\n/warn [user_id] - Ogohlantirish yuborish\n/stats - Guruh statistikasi`;
  bot.sendMessage(chatId, adminPanel, { parse_mode: 'Markdown' });
});

// /stats - Guruh statistikasi
bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAdmin(msg.from.id)) return bot.sendMessage(chatId, '🚫 Sizda bu buyruqni ishlatish huquqi yo‘q.');

  bot.getChatMembersCount(chatId).then((count) => {
    bot.sendMessage(chatId, `👥 Guruhdagi a'zolar soni: ${count}`);
  });
});

// /ban - foydalanuvchini bloklash
bot.onText(/\/ban (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAdmin(msg.from.id)) return bot.sendMessage(chatId, '🚫 Sizda bu buyruqni ishlatish huquqi yo‘q.');

  bot.banChatMember(chatId, match[1]).then(() => {
    bot.sendMessage(chatId, `🚷 Foydalanuvchi (${match[1]}) bloklandi.`);
  });
});

// /unban - foydalanuvchini tiklash
bot.onText(/\/unban (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAdmin(msg.from.id)) return bot.sendMessage(chatId, '🚫 Sizda bu buyruqni ishlatish huquqi yo‘q.');

  bot.unbanChatMember(chatId, match[1]).then(() => {
    bot.sendMessage(chatId, `✅ Foydalanuvchi (${match[1]}) tiklandi.`);
  });
});

// /warn - ogohlantirish yuborish
bot.onText(/\/warn (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAdmin(msg.from.id)) return bot.sendMessage(chatId, '🚫 Sizda bu buyruqni ishlatish huquqi yo‘q.');

  bot.sendMessage(chatId, `⚠️ <a href="tg://user?id=${match[1]}">Foydalanuvchi</a>, siz ogohlantirildingiz!`, { parse_mode: 'HTML' });
});

// Xabarlarni qayta ishlash
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text || "";

  if (msg.new_chat_members && msg.new_chat_members.length > 0) {
    const inviterId = msg.from.id;

    msg.new_chat_members.forEach((newMember) => {
      bot.restrictChatMember(chatId, newMember.id, {
        can_send_messages: false,
        can_send_media_messages: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false
      });
    });

    userInviteCount[inviterId] = (userInviteCount[inviterId] || 0) + msg.new_chat_members.length;
    if (userInviteCount[inviterId] >= 5) {
      bot.restrictChatMember(chatId, inviterId, {
        can_send_messages: true,
        can_send_media_messages: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
        can_invite_users: true
      });
      bot.sendMessage(chatId, `🎉 ${msg.from.first_name}, siz 5 ta odam qo‘shdingiz va endi yozish huquqiga egasiz!`);
      delete userInviteCount[inviterId];
    }
    bot.deleteMessage(chatId, msg.message_id).catch(() => {});
  }

  if (msg.left_chat_member) {
    bot.deleteMessage(chatId, msg.message_id).catch(() => {});
  }

  const linkRegex = /(https?:\/\/|t\.me\/|telegram\.me\/)/i;
  if (linkRegex.test(messageText)) {
    bot.deleteMessage(chatId, msg.message_id).catch(() => {});
    bot.sendMessage(chatId, `⚠️ ${msg.from.first_name}, guruhda ssilka tashlash taqiqlangan!`);
  }
});
