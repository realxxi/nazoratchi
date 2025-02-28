import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.API_TOKEN;
const admins = process.env.ADMINS.split(',').map(String);
const userInviteCount = {}; // Foydalanuvchi takliflarini saqlash

const bot = new TelegramBot(token, { polling: true });
console.log('✅ Bot ishga tushdi...');

const isAdmin = async (chatId, userId) => {
  try {
    const adminList = await bot.getChatAdministrators(chatId);
    return adminList.some(admin => admin.user.id === userId);
  } catch (error) {
    console.error('Admin tekshiruvida xatolik:', error.message);
    return false;
  }
};

// /admin buyrug‘i
bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!(await isAdmin(chatId, userId))) {
    return bot.sendMessage(chatId, '🚫 Sizda admin panelga kirish huquqi yo‘q.');
  }

  const adminPanel = `⚙️ *Admin Panel*\n\n/ban - Foydalanuvchini bloklash\n/unban - Foydalanuvchini tiklash\n/warn  - Ogohlantirish yuborish\n/stats - Guruh statistikasi`;
  bot.sendMessage(chatId, adminPanel, { parse_mode: 'Markdown' });
});

// Kick qilish (foydalanuvchini guruhdan chiqarish)
bot.onText(/\/kick(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  let userId;

  if (msg.reply_to_message) {
    userId = msg.reply_to_message.from.id; // Reply orqali foydalanuvchi ID
  } else if (match[1]) {
    userId = Number(match[1]); // Buyruq orqali ID
  } else {
    return bot.sendMessage(chatId, '🚫 Foydalanuvchini kick qilish uchun reply qiling yoki ID kiriting.');
  }

  if (!(await isAdmin(chatId, senderId))) {
    return bot.sendMessage(chatId, '🚫 Sizda bu buyruqni ishlatish huquqi yo‘q.');
  }

  bot.banChatMember(chatId, userId) // Foydalanuvchini chiqarib yuborish (bloklash)
    .then(() => {
      bot.sendMessage(chatId, `👢 <a href="tg://user?id=${userId}">Foydalanuvchi</a> guruhdan chiqarildi.`, { parse_mode: 'HTML' });

      // Kick bo‘lgandan keyin foydalanuvchini unblock qilish (guruhga qaytishi mumkin bo‘lishi uchun)
      setTimeout(() => {
        bot.unbanChatMember(chatId, userId, { only_if_banned: true }).catch(() => {});
      }, 1000);
    })
    .catch((error) => {
      console.error('Error kicking user:', error.response?.body || error.message);
      bot.sendMessage(chatId, '🚫 Foydalanuvchini kick qilishda xatolik yuz berdi.');
    });
});


// /stats - Guruh statistikasi
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  if (!(await isAdmin(chatId, msg.from.id))) return bot.sendMessage(chatId, '🚫 Sizda bu buyruqni ishlatish huquqi yo‘q.');

  bot.getChatMemberCount(chatId).then((count) => {
    bot.sendMessage(chatId, `👥 Guruhdagi a'zolar soni: ${count}`);
  });
});
// Ban qilish (faqat reply yoki user_id orqali)
bot.onText(/\/ban(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  let userId;

  if (msg.reply_to_message) {
    userId = msg.reply_to_message.from.id; // Reply orqali foydalanuvchi ID
  } else if (match[1]) {
    userId = Number(match[1]); // Buyruq orqali ID
  } else {
    return bot.sendMessage(chatId, '🚫 Foydalanuvchini bloklash uchun reply qiling yoki ID kiriting.');
  }

  if (!(await isAdmin(chatId, senderId))) {
    return bot.sendMessage(chatId, '🚫 Sizda bu buyruqni ishlatish huquqi yo‘q.');
  }

  bot.banChatMember(chatId, userId)
    .then(() => bot.sendMessage(chatId, `🚷 <a href="tg://user?id=${userId}">Foydalanuvchi</a> bloklandi.`, { parse_mode: 'HTML' }))
    .catch((error) => {
      console.error('Error banning user:', error.response?.body || error.message);
      bot.sendMessage(chatId, '🚫 Foydalanuvchini bloklashda xatolik yuz berdi.');
    });
});

// Unban qilish (faqat ID orqali)
bot.onText(/\/unban(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  let userId;

  if (msg.reply_to_message) {
    userId = msg.reply_to_message.from.id;
  } else if (match[1]) {
    userId = Number(match[1]);
  } else {
    return bot.sendMessage(chatId, '🚫 Foydalanuvchini tiklash uchun reply qiling yoki ID kiriting.');
  }

  if (!(await isAdmin(chatId, senderId))) {
    return bot.sendMessage(chatId, '🚫 Sizda bu buyruqni ishlatish huquqi yo‘q.');
  }

  bot.unbanChatMember(chatId, userId)
    .then(() => bot.sendMessage(chatId, `✅ <a href="tg://user?id=${userId}">Foydalanuvchi</a> tiklandi.`, { parse_mode: 'HTML' }))
    .catch((error) => {
      console.error('Error unbanning user:', error.response?.body || error.message);
      bot.sendMessage(chatId, '🚫 Foydalanuvchini tiklashda xatolik yuz berdi.');
    });
});

// Warn qilish (faqat reply yoki user_id orqali)
bot.onText(/\/warn(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  let userId;

  if (msg.reply_to_message) {
    userId = msg.reply_to_message.from.id;
  } else if (match[1]) {
    userId = Number(match[1]);
  } else {
    return bot.sendMessage(chatId, '🚫 Foydalanuvchini ogohlantirish uchun reply qiling yoki ID kiriting.');
  }

  if (!(await isAdmin(chatId, senderId))) {
    return bot.sendMessage(chatId, '🚫 Sizda bu buyruqni ishlatish huquqi yo‘q.');
  }

  bot.sendMessage(chatId, `⚠️ <a href="tg://user?id=${userId}">Foydalanuvchi</a>, siz ogohlantirildingiz!`, { parse_mode: 'HTML' });
});
// Mute qilish
bot.onText(/\/mute(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  let userId;
  let duration = match[1] ? parseInt(match[1]) : null; // Mute vaqti (daqiqa)

  if (msg.reply_to_message) {
    userId = msg.reply_to_message.from.id;
  } else {
    return bot.sendMessage(chatId, '🚫 Foydalanuvchini mute qilish uchun reply qiling.');
  }

  if (!(await isAdmin(chatId, senderId))) {
    return bot.sendMessage(chatId, '🚫 Sizda bu buyruqni ishlatish huquqi yo‘q.');
  }

  let untilDate = duration ? Math.floor(Date.now() / 1000) + duration * 60 : 0; // Unix vaqt formati

  bot.restrictChatMember(chatId, userId, {
    can_send_messages: false,
    can_send_media_messages: false,
    can_send_polls: false,
    can_send_other_messages: false,
    can_add_web_page_previews: false,
    until_date: untilDate || undefined,
  })
    .then(() => {
      let timeMsg = duration ? `${duration} daqiqa` : '🔒 Cheksiz';
      bot.sendMessage(chatId, `🔇 <a href="tg://user?id=${userId}">Foydalanuvchi</a> ${timeMsg} muddatga mute qilindi.`, { parse_mode: 'HTML' });

      if (duration) {
        setTimeout(() => {
          bot.restrictChatMember(chatId, userId, {
            can_send_messages: true,
            can_send_media_messages: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
          }).then(() => {
            bot.sendMessage(chatId, `✅ <a href="tg://user?id=${userId}">Foydalanuvchi</a> mute dan chiqarildi.`, { parse_mode: 'HTML' });
          }).catch(() => {});
        }, duration * 60 * 1000);
      }
    })
    .catch((error) => {
      console.error('Error muting user:', error.response?.body || error.message);
      bot.sendMessage(chatId, '🚫 Foydalanuvchini mute qilishda xatolik yuz berdi.');
    });
});

// Unmute qilish
bot.onText(/\/unmute/, async (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  let userId;

  if (msg.reply_to_message) {
    userId = msg.reply_to_message.from.id;
  } else {
    return bot.sendMessage(chatId, '🚫 Foydalanuvchini unmute qilish uchun reply qiling.');
  }

  if (!(await isAdmin(chatId, senderId))) {
    return bot.sendMessage(chatId, '🚫 Sizda bu buyruqni ishlatish huquqi yo‘q.');
  }

  bot.restrictChatMember(chatId, userId, {
    can_send_messages: true,
    can_send_media_messages: true,
    can_send_polls: true,
    can_send_other_messages: true,
    can_add_web_page_previews: true,
  })
    .then(() => {
      bot.sendMessage(chatId, `✅ <a href="tg://user?id=${userId}">Foydalanuvchi</a> unmute qilindi.`, { parse_mode: 'HTML' });
    })
    .catch((error) => {
      console.error('Error unmuting user:', error.response?.body || error.message);
      bot.sendMessage(chatId, '🚫 Foydalanuvchini unmute qilishda xatolik yuz berdi.');
    });
});

// Xabarlarni qayta ishlash
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text || "";

  // Yangi foydalanuvchilarni cheklash
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

  // Guruhdan chiqib ketgan foydalanuvchi xabarini o‘chirish
  if (msg.left_chat_member) {
    bot.deleteMessage(chatId, msg.message_id).catch(() => {});
  }

  // Ssilkalarni tekshirish
  const linkRegex = /(https?:\/\/|t\.me\/|telegram\.me\/)/i;
  if (linkRegex.test(messageText)) {
    if (!(await isAdmin(chatId, msg.from.id))) {
      bot.deleteMessage(chatId, msg.message_id).catch(() => {});
      bot.sendMessage(chatId, `⚠️ ${msg.from.first_name}, guruhda ssilka tashlash taqiqlangan!`);
    }
  }
});
