'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { reloadPluginsDetailed } = require('./plugin-loader');
const { validatePlugin } = require('./plugin-validator');
const { fetchPublic } = require('../security/safe-url');

const MAX_PLUGIN_BYTES = 256 * 1024;
const CATEGORY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const COMMAND_PATTERN = /^[a-z0-9_-]{1,40}$/i;

function safeInside(root, relativePath) {
  const absolute = path.resolve(root, relativePath);
  return absolute.startsWith(root + path.sep) ? absolute : null;
}

class PluginManager {
  constructor({ registry, directory, logger = console, stateRepository = null, watchService = null, fetchSource = fetchPublic } = {}) {
    if (!registry || typeof registry.list !== 'function') throw new TypeError('PluginManager membutuhkan PluginRegistry.');
    if (!directory) throw new TypeError('PluginManager membutuhkan direktori plugin.');
    this.registry = registry;
    this.directory = directory;
    this.logger = logger;
    this.stateRepository = stateRepository;
    this.watchService = watchService;
    this.fetchSource = fetchSource;
  }

  async restore() {
    if (!this.stateRepository) return [];
    const disabled = new Set(await this.stateRepository.getDisabledPlugins());
    for (const plugin of this.registry.list()) {
      if (disabled.has(plugin.name)) this.registry.disable(plugin.name);
      else this.registry.enable(plugin.name);
    }
    return [...disabled];
  }

  list() {
    return this.registry.list().map(plugin => ({
      name: plugin.name,
      category: plugin.category,
      description: plugin.description,
      commands: [...plugin.commands],
      enabled: this.registry.isEnabled(plugin.name),
      filePath: plugin.filePath
    })).sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }

  info(name) {
    const plugin = this.registry.get(name);
    if (!plugin) return null;
    return {
      name: plugin.name,
      category: plugin.category,
      description: plugin.description,
      usage: plugin.usage,
      commands: [...plugin.commands],
      enabled: this.registry.isEnabled(plugin.name),
      filePath: plugin.filePath
    };
  }

  async enable(name) {
    const plugin = this.registry.get(name);
    if (!plugin) return { success: false, reason: 'not-found' };
    const changed = !this.registry.isEnabled(plugin.name);
    this.registry.enable(plugin.name);
    try { await this.stateRepository?.setEnabled(plugin.name, true); }
    catch (error) { if (changed) this.registry.disable(plugin.name); this.logger.error?.('Status plugin gagal disimpan.', { plugin: plugin.name, error }); return { success: false, reason: 'persistence-failed' }; }
    this.logger.info?.('Plugin diaktifkan oleh owner.', { plugin: plugin.name, changed });
    return { success: true, changed, plugin: plugin.name };
  }

  async disable(name) {
    const key = String(name || '').trim().toLowerCase();
    if (key === 'plugin-manager') return { success: false, reason: 'protected' };
    const plugin = this.registry.get(key);
    if (!plugin) return { success: false, reason: 'not-found' };
    const changed = this.registry.isEnabled(plugin.name);
    this.registry.disable(plugin.name);
    try { await this.stateRepository?.setEnabled(plugin.name, false); }
    catch (error) { if (changed) this.registry.enable(plugin.name); this.logger.error?.('Status plugin gagal disimpan.', { plugin: plugin.name, error }); return { success: false, reason: 'persistence-failed' }; }
    this.logger.info?.('Plugin dinonaktifkan oleh owner.', { plugin: plugin.name, changed });
    return { success: true, changed, plugin: plugin.name };
  }

  reload() {
    return reloadPluginsDetailed({
      directory: this.directory,
      registry: this.registry,
      logger: this.logger
    });
  }

  async addPluginFromUrl(url, { category = null } = {}) {
    let parsed;
    try { parsed = new URL(String(url || '').trim()); } catch { return { success: false, reason: 'invalid-url' }; }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return { success: false, reason: 'invalid-url' };
    let response;
    try {
      response = await this.fetchSource(parsed.toString(), { timeoutMs: 15000, maxBytes: MAX_PLUGIN_BYTES, headers: { accept: 'text/plain, application/javascript, */*' } });
    } catch (error) {
      this.logger.warn?.('Pengambilan source plugin gagal.', { error: error.message });
      return { success: false, reason: 'download-failed' };
    }
    if (!response?.ok || !Buffer.isBuffer(response.buffer) || response.buffer.length === 0 || response.buffer.length > MAX_PLUGIN_BYTES) return { success: false, reason: 'invalid-response' };
    const source = response.buffer.toString('utf8');
    if (source.includes(String.fromCharCode(0)) || source.trim().length === 0) return { success: false, reason: 'invalid-source' };
    return this.installPluginSource(source, { category });
  }


  async installPluginSource(source, { category = null } = {}) {
    if (typeof source !== 'string' || Buffer.byteLength(source, 'utf8') > MAX_PLUGIN_BYTES) return { success: false, reason: 'invalid-source' };
    const root = path.resolve(this.directory);
    let stagePath = '';
    try {
      const requestedCategory = category === null ? null : String(category).trim().toLowerCase();
      if (requestedCategory !== null && !CATEGORY_PATTERN.test(requestedCategory)) return { success: false, reason: 'invalid-category' };
      const embeddedCategory = source.match(/category\s*:\s*(['"])([a-z0-9][a-z0-9_-]{0,31})\1/i)?.[2]?.toLowerCase() || null;
      const stageCategory = requestedCategory || embeddedCategory;
      const stageDirectory = stageCategory ? safeInside(root, stageCategory) : root;
      if (!stageDirectory) return { success: false, reason: 'invalid-category' };
      await fs.mkdir(stageDirectory, { recursive: true, mode: 0o700 });
      stagePath = path.join(stageDirectory, '.addplugin-stage-' + crypto.randomBytes(8).toString('hex') + '.cjs');
      await fs.writeFile(stagePath, source, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      const resolved = require.resolve(stagePath);
      delete require.cache[resolved];
      let exported;
      try { exported = require(resolved); } finally { delete require.cache[resolved]; }
      if (!exported || typeof exported !== 'object' || Array.isArray(exported)) return { success: false, reason: 'invalid-plugin' };
      const plugin = { ...exported };
      const selectedCategory = requestedCategory || String(plugin.category || '').trim().toLowerCase();
      if (!CATEGORY_PATTERN.test(selectedCategory)) return { success: false, reason: 'invalid-category' };
      if (requestedCategory) plugin.category = selectedCategory;
      if (!Array.isArray(plugin.commands) || plugin.commands.length !== 1 || typeof plugin.commands[0] !== 'string' || !COMMAND_PATTERN.test(plugin.commands[0])) return { success: false, reason: 'one-command-required' };
      const validation = validatePlugin(plugin, 'downloaded-plugin');
      if (!validation.valid) return { success: false, reason: 'validation-failed', errors: validation.errors };
      const command = plugin.commands[0].toLowerCase();
      const targetRelative = path.join(selectedCategory, command + '.js');
      const targetPath = safeInside(root, targetRelative);
      if (!targetPath) return { success: false, reason: 'invalid-path' };
      const matches = this.registry.list().filter(item => item.name === plugin.name.toLowerCase() || item.commands.includes(command));
      const uniqueMatches = [...new Map(matches.map(item => [item.filePath, item])).values()];
      if (uniqueMatches.length > 1) return { success: false, reason: 'multiple-conflicts' };
      const existing = uniqueMatches[0] || null;
      if (existing && ['owner-addplugin', 'owner-getplugin', 'owner-plugin', 'owner-plugins'].includes(existing.name)) return { success: false, reason: 'protected-plugin' };
      const oldPath = existing ? safeInside(root, existing.filePath) : null;
      if (existing && !oldPath) return { success: false, reason: 'invalid-existing-path' };
      const targetStat = await fs.stat(targetPath).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
      const targetRelativePosix = path.relative(root, targetPath).split(path.sep).join('/');
      const targetPlugin = this.registry.list().find(item => item.filePath === targetRelativePosix);
      const targetTracked = Boolean(targetPlugin);
      if (targetTracked && targetPath !== oldPath && targetPlugin !== existing) return { success: false, reason: 'file-already-exists' };
      if (targetStat && !targetTracked && targetPath !== oldPath) return { success: false, reason: 'file-already-exists' };

      const targetBackup = targetStat ? await fs.readFile(targetPath) : null;
      const oldBackup = oldPath && oldPath !== targetPath ? await fs.readFile(oldPath).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error)) : null;
      const oldSourcePath = existing?.sourceFile ? safeInside(root, path.join(path.dirname(existing.filePath), existing.sourceFile)) : null;
      const oldSourceBackup = oldSourcePath ? await fs.readFile(oldSourcePath).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error)) : null;
      const customSource = Boolean(requestedCategory);
      const sourceHash = crypto.createHash('sha256').update(source).digest('hex').slice(0, 12);
      const sourceFileName = command + '.source-' + sourceHash + '.cjs';
      const sourcePath = customSource ? safeInside(root, path.join(selectedCategory, sourceFileName)) : null;
      const sourceBackup = sourcePath ? await fs.readFile(sourcePath).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error)) : null;
      const installedSource = customSource
        ? [
            "'use strict';",
            "const plugin = require('./" + sourceFileName + "');",
            "module.exports = { ...plugin, category: " + JSON.stringify(selectedCategory) + ", sourceFile: " + JSON.stringify(sourceFileName) + " };",
            ''
          ].join('\n')
        : source;
      await fs.mkdir(path.dirname(targetPath), { recursive: true, mode: 0o700 });
      const tempTarget = targetPath + '.tmp-' + crypto.randomBytes(6).toString('hex');
      const tempSource = sourcePath ? sourcePath + '.tmp-' + crypto.randomBytes(6).toString('hex') : null;
      try {
        if (sourcePath) {
          await fs.writeFile(tempSource, source, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
          await fs.rename(tempSource, sourcePath);
        }
        await fs.writeFile(tempTarget, installedSource, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
        await fs.rename(tempTarget, targetPath);
        if (oldPath && oldPath !== targetPath) await fs.rm(oldPath, { force: true });
        const result = this.reload();
        if (!result.success) throw new Error('plugin-reload-validation-failed');
        if (oldSourcePath && oldSourcePath !== sourcePath) await fs.rm(oldSourcePath, { force: true });
        const installed = this.registry.get(plugin.name) || this.registry.getByCommand(command);
        this.logger.info?.('Plugin berhasil dipasang atau diperbarui oleh owner.', { name: plugin.name, category: selectedCategory, command, overwritten: Boolean(existing) });
        return { success: true, overwritten: Boolean(existing), plugin: installed?.name || plugin.name, category: selectedCategory, command, filePath: targetRelativePosix };
      } catch (error) {
        await fs.rm(tempTarget, { force: true }).catch(() => {});
        if (tempSource) await fs.rm(tempSource, { force: true }).catch(() => {});
        if (targetBackup) await fs.writeFile(targetPath, targetBackup, { mode: 0o600 });
        else await fs.rm(targetPath, { force: true });
        if (oldPath && oldPath !== targetPath && oldBackup) await fs.writeFile(oldPath, oldBackup, { mode: 0o600 });
        if (sourcePath) {
          if (sourceBackup) await fs.writeFile(sourcePath, sourceBackup, { mode: 0o600 });
          else await fs.rm(sourcePath, { force: true });
        }
        if (oldSourcePath && oldSourcePath !== sourcePath && oldSourceBackup) await fs.writeFile(oldSourcePath, oldSourceBackup, { mode: 0o600 });
        this.reload();
        this.logger.warn?.('Pemasangan plugin dibatalkan dan perubahan file dipulihkan.', { error: error.message });
        return { success: false, reason: 'reload-validation-failed' };
      }
    } catch (error) {
      this.logger.warn?.('Source plugin ditolak saat validasi.', { error: error.message });
      return { success: false, reason: 'validation-failed' };
    } finally {
      if (stagePath) {
        try { delete require.cache[require.resolve(stagePath)]; } catch {}
        await fs.rm(stagePath, { force: true }).catch(() => {});
      }
    }
  }

  async getSource(nameOrCommand) {
    const query = String(nameOrCommand || '').trim().toLowerCase();
    if (!query) return null;
    const plugin = this.registry.get(query) || this.registry.list().find(item => item.commands.includes(query));
    if (!plugin) return null;
    const root = path.resolve(this.directory);
    const sourceRelative = plugin.sourceFile ? path.join(path.dirname(plugin.filePath), plugin.sourceFile) : plugin.filePath;
    const absolute = safeInside(root, sourceRelative);
    if (!absolute) return null;
    const source = await fs.readFile(absolute, 'utf8');
    return { name: plugin.name, category: plugin.category, commands: [...plugin.commands], filePath: plugin.filePath, enabled: this.registry.isEnabled(plugin.name), source };
  }

  watchStatus() {
    return this.watchService?.status?.() || { enabled: false, watchingDirectories: 0, pending: false, reloads: 0, failures: 0 };
  }

  stats() {
    const plugins = this.registry.list();
    const enabled = plugins.filter(plugin => this.registry.isEnabled(plugin.name));
    const commands = enabled.reduce((total, plugin) => total + plugin.commands.length, 0);
    return {
      total: plugins.length,
      enabled: enabled.length,
      disabled: plugins.length - enabled.length,
      commands,
      categories: new Set(plugins.map(plugin => plugin.category)).size,
      autoReload: this.watchStatus()
    };
  }
}

module.exports = { PluginManager };
