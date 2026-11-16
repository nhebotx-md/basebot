'use strict';
const os=require('node:os');const{monitorEventLoopDelay}=require('node:perf_hooks');
const finite=(v,d=0)=>Number.isFinite(v)?v:d,round=(v,n=1)=>Math.round(finite(v)*10**n)/10**n,bytesToMb=v=>round(finite(v)/1048576,1);
class HealthService{
 constructor({registry,connection,database,pluginManager,pluginWatchService=null,startupStats={},startedAt=Date.now(),processInfo=process,osInfo=os,clock=Date.now,eventLoopMonitor=monitorEventLoopDelay,sampleIntervalMs=30000,historyLimit=120,alertLimit=100}={}){
  Object.assign(this,{registry,connection,database,pluginManager,pluginWatchService,startupStats:{...startupStats},startedAt,processInfo,osInfo,clock});
  this.eventLoop=eventLoopMonitor({resolution:20});this.eventLoop.enable();this.stopped=false;this.history=[];this.alerts=[];this.activeAlerts=new Set();this.previousStatus=null;this.historyLimit=Math.max(10,Number(historyLimit)||120);this.alertLimit=Math.max(10,Number(alertLimit)||100);
  this.sampleTimer=setInterval(()=>this.sample(),Math.max(5000,Number(sampleIntervalMs)||30000));this.sampleTimer.unref?.();this.sample();
 }
 stop(){if(this.stopped)return;this.stopped=true;if(this.sampleTimer)clearInterval(this.sampleTimer);this.sampleTimer=null;this.eventLoop.disable();}
 addAlert(severity,message,report){this.alerts.push({at:report.generatedAt,severity,message});if(this.alerts.length>this.alertLimit)this.alerts.splice(0,this.alerts.length-this.alertLimit);}
 sample(){
  if(this.stopped)return null;const r=this.getReport(),item={at:r.generatedAt,status:r.status,whatsapp:r.whatsapp.state,rssMb:r.memory.rssMb,heapUsagePercent:r.memory.heapUsagePercent,eventLoopP95Ms:r.eventLoopDelay.p95Ms,pendingWrites:r.database.pendingWrites,pluginsEnabled:r.plugins.enabled,pluginsTotal:r.plugins.total};
  this.history.push(item);if(this.history.length>this.historyLimit)this.history.splice(0,this.history.length-this.historyLimit);
  if(this.previousStatus&&this.previousStatus!==r.status)this.addAlert(r.status==='critical'?'critical':r.status==='degraded'?'warning':'info','Status runtime berubah: '+this.previousStatus+' → '+r.status,r);this.previousStatus=r.status;
  for(const [key,active,msg] of [['heap',r.memory.heapUsagePercent>=90,'Heap usage mencapai 90% atau lebih.'],['loop',r.eventLoopDelay.p95Ms>=250,'Event-loop p95 mencapai 250 ms atau lebih.'],['db',r.database.pendingWrites>=100,'Antrean write database mencapai 100 operasi atau lebih.']]){
   if(active&&!this.activeAlerts.has(key)){this.activeAlerts.add(key);this.addAlert('warning',msg,r);}else if(!active&&this.activeAlerts.has(key)){this.activeAlerts.delete(key);this.addAlert('info','Pulih: '+msg,r);}
  }return item;
 }
 getHistory(limit=10){return this.history.slice(-Math.max(1,Math.min(60,Number(limit)||10))).reverse();}
 getAlerts(limit=10){return this.alerts.slice(-Math.max(1,Math.min(50,Number(limit)||10))).reverse();}
 getReport(){
  const now=this.clock(),mem=this.processInfo.memoryUsage(),conn=this.connection?.status||{},db=typeof this.database?.status==='function'?this.database.status():{initialized:false,schemaVersion:null,collections:[]};
  let stats={total:0,enabled:0,disabled:0,commands:0,categories:0},statsError=false;
  try{if(this.pluginManager?.stats)stats=this.pluginManager.stats();else{const all=this.registry?.list?.()||[],enabled=all.filter(p=>this.registry.isEnabled(p.name));stats={total:all.length,enabled:enabled.length,disabled:all.length-enabled.length,commands:enabled.reduce((n,p)=>n+p.commands.length,0),categories:new Set(all.map(p=>p.category)).size};}}catch{statsError=true;}
  const state=conn.state||(this.connection?.client?'connected':'disconnected'),ready=db.initialized===true&&db.closed!==true&&this.database?.closed!==true,skipped=Math.max(0,Number(this.startupStats.skipped)||0);
  const memory={rssMb:bytesToMb(mem.rss),heapUsedMb:bytesToMb(mem.heapUsed),heapTotalMb:bytesToMb(mem.heapTotal),externalMb:bytesToMb(mem.external),arrayBuffersMb:bytesToMb(mem.arrayBuffers)},heapUsagePercent=mem.heapTotal>0?round(mem.heapUsed/mem.heapTotal*100):0;
  const eventLoopDelay={p50Ms:round(this.eventLoop.percentile(50)/1e6,2),p95Ms:round(this.eventLoop.percentile(95)/1e6,2),maxMs:round(this.eventLoop.max/1e6,2)};
  const checks=[{name:'WhatsApp',status:state==='open'?'healthy':'degraded',detail:state},{name:'Database',status:ready?'healthy':'critical',detail:ready?'ready':'unavailable'},{name:'Plugin registry',status:statsError||skipped>0?'degraded':'healthy',detail:statsError?'stats-unavailable':skipped>0?'load-errors':'ready'}];
  const status=checks.some(c=>c.status==='critical')?'critical':checks.some(c=>c.status==='degraded')?'degraded':'healthy';
  return{generatedAt:new Date(now).toISOString(),status,uptimeSeconds:Math.max(0,Math.floor((now-this.startedAt)/1000)),runtime:{node:this.processInfo.version,platform:this.processInfo.platform,arch:this.processInfo.arch,pid:this.processInfo.pid,processUptimeSeconds:Math.floor(this.processInfo.uptime()),loadAverage:this.osInfo.loadavg().map(v=>round(v,2))},whatsapp:{state,connected:state==='open',reconnectAttempts:Math.max(0,Number(conn.reconnectAttempts)||0),lastConnectedAt:conn.lastConnectedAt?new Date(conn.lastConnectedAt).toISOString():null},database:{ready,schemaVersion:db.schemaVersion??null,collections:Array.isArray(db.collections)?[...db.collections]:[],pendingWrites:Math.max(0,Number(this.database?.pendingWrites)||0)},plugins:{...stats,skippedAtStartup:skipped,discoveredAtStartup:Math.max(0,Number(this.startupStats.discovered)||0),loadedAtStartup:Math.max(0,Number(this.startupStats.loaded)||0),autoReload:this.pluginWatchService?.status?.()||{enabled:false,watchingDirectories:0,pending:false,reloads:0,failures:0}},memory:{...memory,heapUsagePercent},eventLoopDelay,checks};
 }
}
module.exports={HealthService,bytesToMb,round};
