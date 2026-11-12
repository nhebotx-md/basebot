'use strict';

module.exports = {
  name: 'menu', commands: ['menu', 'help'], category: 'system',
  description: 'Menampilkan daftar command plugin aktif.', usage: '.menu', permissions: {},
  async execute(ctx) {
    const categories = new Map();
    for (const plugin of ctx.registry.list({ includeDisabled: false })) {
      if (!categories.has(plugin.category)) categories.set(plugin.category, []);
      categories.get(plugin.category).push({ plugin, command: plugin.commands[0] });
    }
    const lines = [`*${ctx.config.botName}*`, `Mode: ${ctx.client.public === false ? 'self' : 'public'}`, ''];
    for (const [category, entries] of [...categories.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`*${category.toUpperCase()}*`);
      for (const { plugin, command } of entries.sort((a, b) => a.command.localeCompare(b.command))) {
        lines.push(`• ${ctx.prefix}${command} — ${plugin.description}`);
      }
      lines.push('');
    }
    await ctx.reply(lines.join('\n').trim());
  }
};
