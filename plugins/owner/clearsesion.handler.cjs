/*
╭────────────────────────────────────────
│ GitHub   : https://github.com/r-serex
│ YouTube  : https://youtube.com/@zxruzx
│ WhatsApp : https://wa.me/6288980698613
│ Telegram : https://rujekaciw.t.me
╰─────────────────────────────────────────
*/

const { 
  readdirSync,
  statSync,
  unlinkSync
} = require('fs');

const { join } = require('path');

const handler = async (m, { config, reply, args }) => {
  const sesi = [config.paths.session];
  const array = [];

  sesi.forEach(dirname => {
    readdirSync(dirname).forEach(file => {
      if (file !== 'creds.json') { 
        array.push(join(dirname, file));
      }
    });
  });

  const deletedFiles = [];

  array.forEach(file => {
    const stats = statSync(file);

    if (stats.isDirectory()) {
      console.log(`skipping directory: ${file}`);
    } else {
      unlinkSync(file);
      deletedFiles.push(file);
    }
  });

  reply('success');

  if (deletedFiles.length > 0) {
    console.log('Deleted files:', deletedFiles);
  }

  if (deletedFiles.length == 0) {
    reply('tidak ada file yang tersisa di folder session');
  }
};

module.exports = {
  name: "clearsesion",
  commands: ["csesi", "clearsesi"],
  category: "owner",
  description: "clearsession",
  usage: ".csesi",
  permissions: { ownerOnly: true },
  async execute(ctx) {
    return handler(ctx.m, {
      client: ctx.client, text: ctx.text, reply: ctx.reply, reaction: ctx.react,
      prefix: ctx.prefix, command: ctx.command, args: ctx.args, quoted: ctx.quoted,
      mime: ctx.mime, pushname: ctx.pushname, Access: ctx.isOwner,
      sleep: ctx.services.sleep, fetchJson: ctx.services.fetchJson, config: ctx.config
    });
  }
};
