/**
 * BHIV Dashboard Capability Starter Kit - Test 3
 * 
 * What this file contains (in order):
 * 1. Design tokens (DS object)
 * 2. Type definitions (JSDoc)
 * 3. Mock data + mock services
 * 4. Zustand-style stores (useState-based, same interface)
 * 5. Primitive components (StatusDot, Badge, Avatar, etc.)
 * 6. Widget components (KpiCard, MetricCard, AlertCard, etc.)
 * 7. Chart wrappers (AreaChartCard, BarChartCard, etc.)
 * 8. Layout components (DashboardShell, Sidebar, Topbar)
 * 9. Command system (useCommand, CommandDialog)
 * 10. Dashboard pages (Executive, Operations, SOC, Finance, Analytics, Government)
 * 11. Root App with navigation between dashboards
 */

import { useState, useEffect, useCallback, useReducer, useRef, createContext, useContext } from "react";
import BucketWidget from "./bucket-integration";
import RuntimeServicesWidget from "./runtime-services-widget";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  LayoutGrid, Activity, Cpu, BarChart3, Briefcase,
  FileText, AlertTriangle, Users, Settings, Bell, ChevronDown,
  Sun, Moon, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  CheckCircle2, XCircle, AlertCircle, Clock, Server, Database, Wifi,
  Shield, CreditCard, Mail, Layers, GitBranch, Gauge, Zap, PlusCircle,
  Download, ChevronRight, Rocket, RotateCcw,
  Pause, StopCircle, AlertOctagon, Terminal,
  History, CheckSquare, X, Loader2, ShieldAlert, LogIn, GitCommit,
  RefreshCw, Eye, Ban, Siren, ClipboardCheck, Inbox, Radio,
  DollarSign, BarChart2, Target, ShieldCheck, ArrowRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// 1. DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const DS = {
  color: {
    dark: {
      bg: "#090C12", bgElevated: "#0C1018", surface: "#101520",
      surfaceHover: "#141A24", surfaceActive: "#182030",
      border: "#1C2230", borderStrong: "#263040",
      text: "#DDE2EC", textSub: "#8892A6", textMuted: "#546070",
    },
    light: {
      bg: "#F0F2F6", bgElevated: "#FAFBFD", surface: "#FFFFFF",
      surfaceHover: "#F4F6FA", surfaceActive: "#EAF0FC",
      border: "#E0E4EE", borderStrong: "#C8CEDC",
      text: "#111520", textSub: "#505C72", textMuted: "#8892A6",
    },
  },
  status: { healthy: "#22C55E", warning: "#F59E0B", critical: "#EF4444", info: "#6366F1", neutral: "#64748B" },
  accent: { primary: "#2E7CF6", secondary: "#06B8D0", gradient: "linear-gradient(135deg,#2E7CF6,#06B8D0)", glow: "rgba(46,124,246,0.18)" },
  chart: ["#2E7CF6", "#06B8D0", "#8B5CF6", "#F59E0B", "#10B981", "#F97316"],
  font: { display: "'Sora','Inter',system-ui,sans-serif", body: "'Inter',system-ui,sans-serif", mono: "'JetBrains Mono','IBM Plex Mono',monospace" },
  radius: { xs: 4, sm: 6, md: 10, lg: 14, xl: 18, full: 9999 },
  shadow: { card: "0 1px 3px rgba(0,0,0,0.08)", elevated: "0 4px 12px rgba(0,0,0,0.16)", overlay: "0 8px 32px rgba(0,0,0,0.32)" },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
};

// ─────────────────────────────────────────────────────────────
// 2. CSS INJECTION (no style tags - useEffect only)
// ─────────────────────────────────────────────────────────────
function useGlobalCss(t) {
  useEffect(function() {
    var id = "bhiv-kit-css";
    var el = document.getElementById(id);
    if (!el) { el = document.createElement("style"); el.id = id; document.head.appendChild(el); }
    el.textContent = [
      "*{box-sizing:border-box;}body{margin:0;}",
      "::-webkit-scrollbar{width:5px;height:5px;}",
      "::-webkit-scrollbar-thumb{background:" + t.borderStrong + ";border-radius:99px;}",
      "::-webkit-scrollbar-track{background:transparent;}",
      "@keyframes pulseRing{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.8);opacity:0}}",
      "@keyframes spin{to{transform:rotate(360deg)}}",
      "@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}",
      "@keyframes progress{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}",
      "@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}",
      "button:focus-visible{outline:2px solid #2E7CF6;outline-offset:1px;}",
      "@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}",
    ].join(" ");
    return function() { if (el) el.textContent = ""; };
  }, [t]);
}

// ─────────────────────────────────────────────────────────────
// 3. MOCK DATA
// ─────────────────────────────────────────────────────────────
function seededRand(seed) { var s=seed||42; return function(){s=(s*9301+49297)%233280;return s/233280;}; }
var rng = seededRand(42);
function makeDays(n) { return Array.from({length:n},function(_,i){var d=new Date();d.setDate(d.getDate()-(n-1-i));return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});}); }

var MOCK = {
  // Live service states
  services: [
    {id:"api",   name:"API Gateway",         icon:Server,    status:"healthy",  latency:"42ms",   uptime:"99.98%", rpm:8420, region:"Mumbai"},
    {id:"app",   name:"App Servers",          icon:Cpu,       status:"healthy",  latency:"61ms",   uptime:"99.95%", rpm:6100, region:"Mumbai"},
    {id:"db",    name:"Primary DB",           icon:Database,  status:"healthy",  latency:"8ms",    uptime:"99.99%", rpm:3200, region:"Mumbai"},
    {id:"cdn",   name:"Network / CDN",        icon:Wifi,      status:"healthy",  latency:"12ms",   uptime:"100%",   rpm:12000,region:"Global"},
    {id:"mesh",  name:"Microservices Mesh",   icon:Layers,    status:"warning",  latency:"210ms",  uptime:"99.61%", rpm:2400, region:"Mumbai"},
    {id:"queue", name:"Job Queue",            icon:GitBranch, status:"healthy",  latency:"18ms",   uptime:"99.97%", rpm:940,  region:"Mumbai"},
    {id:"auth",  name:"Auth Service",         icon:Shield,    status:"healthy",  latency:"33ms",   uptime:"99.99%", rpm:5500, region:"Mumbai"},
    {id:"pay",   name:"Payment Service",      icon:CreditCard,status:"critical", latency:"1240ms", uptime:"97.42%", rpm:310,  region:"Mumbai"},
    {id:"notif", name:"Notification Service", icon:Mail,      status:"healthy",  latency:"55ms",   uptime:"99.93%", rpm:780,  region:"Mumbai"},
  ],
  activeIncidents: [
    {id:"INC-2291", title:"Payment Service P99 latency breach (>1200ms)", severity:"critical", status:"investigating", age:"6 min",  owner:"Platform", assignee:"Kunal S."},
    {id:"INC-2287", title:"Microservices mesh elevated error rate (4.2%)", severity:"warning",  status:"monitoring",    age:"41 min", owner:"Platform", assignee:"Ananya R."},
    {id:"INC-2280", title:"Auth service elevated 401 rate - resolved",     severity:"warning",  status:"resolved",      age:"3 hr",   owner:"Security", assignee:"Priya N."},
  ],
  pendingApprovals: [
    {id:"APR-0101", title:"Deploy v4.2.0 to Production",   requester:"Ananya R.", dept:"Platform",  priority:"high",   age:"18 min", type:"deployment"},
    {id:"APR-0100", title:"Q3 Marketing Budget +18%",      requester:"Priya N.",  dept:"Marketing", priority:"medium", age:"2 hr",   type:"budget"},
    {id:"APR-0099", title:"Incident Escalation: INC-2291", requester:"Kunal S.",  dept:"Platform",  priority:"high",   age:"6 min",  type:"incident"},
    {id:"APR-0098", title:"New Vendor Onboarding - AWS",   requester:"Ravi M.",   dept:"Infra",     priority:"low",    age:"1 day",  type:"vendor"},
  ],
  runningOps: [
    {id:"OP-0044", title:"Data lake sync - Q2 export", progress:62, startedBy:"Scheduled", elapsed:"14 min"},
    {id:"OP-0043", title:"User cohort re-indexing",     progress:31, startedBy:"Rahul M.",  elapsed:"8 min"},
    {id:"OP-0042", title:"Security audit scan - prod",  progress:88, startedBy:"Scheduled", elapsed:"22 min"},
  ],
  commandHistory: [
    {id:"CMD-0091", cmd:"Acknowledge Alert",   target:"INC-2287",  status:"success",  actor:"Raghav S.", time:"8 min ago"},
    {id:"CMD-0090", cmd:"Rollback Deployment", target:"v4.1.8-rc", status:"success",  actor:"Ananya R.", time:"32 min ago"},
    {id:"CMD-0089", cmd:"Approve Budget",      target:"APR-0097",  status:"success",  actor:"Raghav S.", time:"2 hr ago"},
    {id:"CMD-0088", cmd:"Create Incident",     target:"INC-2291",  status:"success",  actor:"Kunal S.",  time:"6 min ago"},
    {id:"CMD-0087", cmd:"Escalate Incident",   target:"INC-2280",  status:"failure",  actor:"Priya N.",  time:"3 hr ago"},
  ],
  kpis: [
    {id:"rev",  label:"Revenue (MTD)",     value:"2.94Cr", change:8.4,  up:true,  icon:TrendingUp,    spark:[182,188,191,187,195,201,210,218,224,232,239,248]},
    {id:"mau",  label:"Active Users",      value:"26,840", change:5.1,  up:true,  icon:Users,         spark:[24.5,24.7,24.9,25.1,25.3,25.6,25.8,26.0,26.2,26.4,26.6,26.8]},
    {id:"proj", label:"Active Projects",   value:"23",     change:2.0,  up:true,  icon:Briefcase,     spark:[18,19,20,19,21,22,22,22,23,23,23,23]},
    {id:"inc",  label:"Open Incidents",    value:"2",      change:100,  up:false, icon:AlertTriangle, spark:[0,0,1,0,0,0,1,1,1,2,2,2]},
    {id:"up",   label:"System Uptime",     value:"99.94%", change:0.03, up:false, icon:Activity,      spark:[99.99,99.98,99.97,99.96,99.95,99.95,99.94,99.94,99.94,99.94,99.94,99.94]},
    {id:"dep",  label:"Deploy Success",    value:"96.2%",  change:1.8,  up:true,  icon:GitBranch,     spark:[91,92,93,94,94,95,95,95,96,96,96,96.2]},
    {id:"iss",  label:"Open Issues",       value:"47",     change:6.3,  up:false, icon:AlertCircle,   spark:[38,40,41,44,45,45,46,46,47,47,47,47]},
    {id:"csat", label:"CSAT Score",        value:"4.6/5",  change:1.1,  up:true,  icon:CheckCircle2,  spark:[4.3,4.4,4.4,4.4,4.5,4.5,4.5,4.5,4.6,4.6,4.6,4.6]},
  ],
  // Finance data
  financeKpis: [
    {id:"arr",  label:"Annual Recurring Revenue", value:"35.3Cr",  change:22.4, up:true,  icon:TrendingUp,   spark:[28,29,30,31,31,32,33,34,34,35,35,35.3]},
    {id:"mrr",  label:"Monthly Revenue",          value:"2.94Cr",  change:8.4,  up:true,  icon:DollarSign,   spark:[2.3,2.4,2.5,2.6,2.6,2.7,2.8,2.8,2.9,2.9,2.9,2.94]},
    {id:"burn", label:"Monthly Burn Rate",         value:"1.82Cr",  change:-3.2, up:true,  icon:TrendingDown, spark:[2.1,2.0,1.98,1.95,1.92,1.9,1.88,1.85,1.84,1.83,1.82,1.82]},
    {id:"run",  label:"Runway",                    value:"19 mo",   change:2.0,  up:true,  icon:Target,       spark:[14,15,15,16,16,17,17,18,18,18,19,19]},
  ],
  // SOC data  
  threats: [
    {id:"THR-001", title:"Brute force attempt - Admin portal",       severity:"critical", source:"185.234.x.x", country:"RU", time:"2 min ago",  status:"active"},
    {id:"THR-002", title:"Anomalous data exfiltration pattern",      severity:"critical", source:"Internal",    country:"IN", time:"14 min ago", status:"investigating"},
    {id:"THR-003", title:"Suspicious login - APAC region",           severity:"warning",  source:"103.xx.x.x",  country:"CN", time:"41 min ago", status:"monitoring"},
    {id:"THR-004", title:"Port scan detected - perimeter",           severity:"warning",  source:"45.xx.xx.x",  country:"US", time:"1 hr ago",   status:"contained"},
    {id:"THR-005", title:"Outdated TLS certificate - api.bhiv.in",   severity:"info",     source:"Internal",    country:"IN", time:"3 hr ago",   status:"scheduled"},
  ],
  // Chart data
  revenueTrend: makeDays(14).map(function(d,i){return{day:d,revenue:Math.round(182000+i*4200+rng()*18000-9000),target:190000+i*4000};}),
  deployFreq:   makeDays(10).map(function(d){return{day:d,ok:Math.round(3+rng()*9),fail:Math.round(rng()*2)};}),
  latencyData:  makeDays(12).map(function(d){return{day:d,p50:Math.round(80+rng()*30),p95:Math.round(180+rng()*70),p99:Math.round(310+rng()*120)};}),
  burndownData: Array.from({length:10},function(_,i){return{day:"D"+(i+1),ideal:120-i*12,actual:Math.max(8,Math.round(120-i*11.2-rng()*8))};}),
  userGrowth:   makeDays(14).map(function(d,i){return{day:d,users:Math.round(24500+i*310+rng()*600),newUsers:Math.round(180+rng()*90)};}),
  revenueByProduct: [
    {name:"BHIV Core", value:38, color:"#2E7CF6"},
    {name:"Analytics", value:26, color:"#8B5CF6"},
    {name:"Workflow",  value:19, color:"#06B8D0"},
    {name:"Mobile SDK",value:11, color:"#F59E0B"},
    {name:"Other",     value:6,  color:"#546070"},
  ],
  teamPerf: [
    {dept:"Engineering", prod:87, comp:91, eff:84},
    {dept:"Product",     prod:79, comp:88, eff:81},
    {dept:"Operations",  prod:92, comp:95, eff:89},
    {dept:"Support",     prod:74, comp:82, eff:77},
    {dept:"Sales",       prod:81, comp:86, eff:79},
    {dept:"Marketing",   prod:76, comp:84, eff:80},
  ],
  activityFeed: [
    {icon:ShieldAlert,  text:"INC-2291 opened - Payment Service P99 breach",  time:"6 min ago"},
    {icon:Rocket,       text:"v4.1.9 deployed to production by Ananya R.",     time:"12 min ago"},
    {icon:LogIn,        text:"Raghav Shah logged in from Pune office",         time:"34 min ago"},
    {icon:CheckCircle2, text:"INC-2287 acknowledged by Raghav S.",             time:"8 min ago"},
    {icon:GitCommit,    text:"142 commits merged to release/4.2.0",            time:"2 hr ago"},
    {icon:Rocket,       text:"mobile-sdk-v2 deployment failed - auto-rollback",time:"5 hr ago"},
  ],
};

// ─────────────────────────────────────────────────────────────
// 4. MOCK SERVICES
// ─────────────────────────────────────────────────────────────
var MockService = {
  approveRequest:   function(id)   { return new Promise(function(res){setTimeout(function(){res({id:id,approved:true});},1200);}); },
  rejectRequest:    function(id)   { return new Promise(function(res){setTimeout(function(){res({id:id,rejected:true});},800);}); },
  acknowledgeAlert: function(id)   { return new Promise(function(res){setTimeout(function(){res({id:id,acknowledged:true});},800);}); },
  restartService:   function(id)   { return new Promise(function(res,rej){setTimeout(function(){id==="pay"?rej(new Error("Locked - requires Platform Lead")):res({restarted:id});},1400);}); },
  createIncident:   function(data) { return new Promise(function(res){setTimeout(function(){res(Object.assign({id:"INC-"+Date.now()},data));},1000);}); },
  generateReport:   function(type) { return new Promise(function(res){setTimeout(function(){res({type:type,url:"/reports/"+type+"-"+Date.now()+".pdf"});},1600);}); },
  pauseOperation:   function(id)   { return new Promise(function(res){setTimeout(function(){res({id:id,paused:true});},1000);}); },
  stopOperation:    function(id)   { return new Promise(function(res){setTimeout(function(){res({id:id,stopped:true});},800);}); },
  escalateIncident: function(id)   { return new Promise(function(res){setTimeout(function(){res({id:id,escalated:true});},1200);}); },
  rollbackCommand:  function(id)   { return new Promise(function(res){setTimeout(function(){res({rolledBack:id});},900);}); },
  silenceAlert:     function(id)   { return new Promise(function(res){setTimeout(function(){res({id:id,silenced:true});},700);}); },
};

// ─────────────────────────────────────────────────────────────
// 5. CONTEXTS (Zustand-equivalent using React Context)
// ─────────────────────────────────────────────────────────────
var ThemeCtx  = createContext(null);
var AuditCtx  = createContext(null);
var PanelCtx  = createContext(null);
var NotifCtx  = createContext(null);
var NavCtx    = createContext(null);

function useTheme() { return useContext(ThemeCtx); }
function useAudit() { return useContext(AuditCtx); }
function usePanel() { return useContext(PanelCtx); }
function useNotif() { return useContext(NotifCtx); }
function useNav()   { return useContext(NavCtx); }

// ─────────────────────────────────────────────────────────────
// 6. COMMAND ENGINE
// ─────────────────────────────────────────────────────────────
var CMD = {IDLE:"idle",CONFIRM:"confirm",EXECUTING:"executing",SUCCESS:"success",FAILURE:"failure",ROLLING_BACK:"rolling_back",ROLLED_BACK:"rolled_back"};

function cmdReducer(state,action){
  switch(action.type){
    case "OPEN":          return Object.assign({},state,{phase:CMD.CONFIRM,target:action.target});
    case "START":         return Object.assign({},state,{phase:CMD.EXECUTING,error:null});
    case "SUCCESS":       return Object.assign({},state,{phase:CMD.SUCCESS,result:action.result,auditId:action.auditId});
    case "FAILURE":       return Object.assign({},state,{phase:CMD.FAILURE,error:action.error});
    case "ROLLBACK_START":return Object.assign({},state,{phase:CMD.ROLLING_BACK});
    case "ROLLBACK_END":  return Object.assign({},state,{phase:CMD.ROLLED_BACK});
    case "RESET":         return {phase:CMD.IDLE,target:null,error:null,result:null,auditId:null};
    default:              return state;
  }
}

function useCommand(opts){
  var label=opts.label,serviceCall=opts.serviceCall,canRollback=opts.canRollback||false,onAudit=opts.onAudit;
  var pair=useReducer(cmdReducer,{phase:CMD.IDLE,target:null,error:null,result:null,auditId:null});
  var state=pair[0],dispatch=pair[1];
  var stateRef=useRef(state); stateRef.current=state;

  var confirm=useCallback(function(target){dispatch({type:"OPEN",target:target});},[]);
  var cancel=useCallback(function(){dispatch({type:"RESET"});},[]);
  var reset=useCallback(function(){dispatch({type:"RESET"});},[]);
  var execute=useCallback(function(payload){
    dispatch({type:"START"});
    var target=payload!==undefined?payload:stateRef.current.target;
    serviceCall(target).then(function(result){
      var auditId="AUD-"+Date.now();
      dispatch({type:"SUCCESS",result:result,auditId:auditId});
      if(onAudit)onAudit({label:label,target:stateRef.current.target,status:"success",auditId:auditId});
    }).catch(function(err){
      dispatch({type:"FAILURE",error:err.message});
      if(onAudit)onAudit({label:label,target:stateRef.current.target,status:"failure",error:err.message});
    });
  },[label,serviceCall,onAudit]);
  var rollback=useCallback(function(){
    if(!canRollback||!stateRef.current.auditId)return;
    dispatch({type:"ROLLBACK_START"});
    MockService.rollbackCommand(stateRef.current.auditId).then(function(){
      dispatch({type:"ROLLBACK_END"});
      if(onAudit)onAudit({label:"ROLLBACK: "+label,target:stateRef.current.auditId,status:"rollback"});
    });
  },[canRollback,label,onAudit]);

  return{state:state,confirm:confirm,cancel:cancel,execute:execute,reset:reset,rollback:rollback,phase:state.phase};
}

// ─────────────────────────────────────────────────────────────
// 7. PRIMITIVE COMPONENTS
// ─────────────────────────────────────────────────────────────

function StatusDot({s,pulse,size}){
  var c=DS.status[s]||DS.status.info;
  var sz=size||7;
  return(
    <span style={{position:"relative",display:"inline-flex",width:sz,height:sz,flexShrink:0}}>
      <span style={{width:sz,height:sz,borderRadius:99,background:c,display:"block"}}/>
      {pulse&&<span style={{position:"absolute",inset:0,borderRadius:99,background:c,animation:"pulseRing 1.8s ease-out infinite"}}/>}
    </span>
  );
}

function StatusBadge({status,label}){
  var colors={healthy:DS.status.healthy,warning:DS.status.warning,critical:DS.status.critical,info:DS.status.info,neutral:DS.status.neutral};
  var c=colors[status]||colors.neutral;
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:9.5,fontFamily:DS.font.mono,fontWeight:600,color:c,background:c+"18",padding:"2px 7px",borderRadius:DS.radius.full}}>
      <span style={{width:4,height:4,borderRadius:99,background:c}}/>
      {label||status.toUpperCase()}
    </span>
  );
}

function StatusIcon({s,withLabel}){
  var map={success:{icon:CheckCircle2,color:DS.status.healthy},failure:{icon:XCircle,color:DS.status.critical},rollback:{icon:RotateCcw,color:DS.status.warning}};
  var m=map[s]||map.success;
  return(
    <span style={{display:"flex",alignItems:"center",gap:4,color:m.color,fontSize:11}}>
      <m.icon size={12} color={m.color}/>
      {withLabel&&<span style={{fontFamily:DS.font.mono,fontWeight:600}}>{s}</span>}
    </span>
  );
}

function PriorityIcon({p}){
  var c={high:DS.status.critical,medium:DS.status.warning,low:DS.status.neutral}[p]||DS.status.neutral;
  return <AlertOctagon size={14} color={c}/>;
}

function Avatar({initials,color,size}){
  var sz=size||28;
  return(
    <div style={{width:sz,height:sz,borderRadius:99,background:color||DS.accent.gradient,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:sz*0.36,fontFamily:DS.font.display,flexShrink:0}}>
      {initials}
    </div>
  );
}

function ProgressBar({val,t,color}){
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11}}>
        <span style={{color:t.textSub}}>Progress</span>
        <span style={{fontFamily:DS.font.mono,fontWeight:700}}>{val}%</span>
      </div>
      <div style={{height:5,borderRadius:99,background:t.surfaceHover,overflow:"hidden"}}>
        <div style={{height:"100%",width:val+"%",borderRadius:99,background:color||DS.accent.gradient}}/>
      </div>
    </div>
  );
}

function MiniProgress({val,t,color}){
  return(
    <div style={{height:4,borderRadius:99,background:t.border,overflow:"hidden"}}>
      <div style={{height:"100%",width:val+"%",borderRadius:99,background:color||DS.accent.gradient}}/>
    </div>
  );
}

function Sparkline({data,color,height}){
  var h=height||28;
  var pts=data.map(function(v,i){return{i:i,v:v};});
  var c=color||DS.accent.primary;
  var gradId="sp-"+c.replace("#","");
  return(
    <ResponsiveContainer width="100%" height={h}>
      <AreaChart data={pts} margin={{top:0,right:0,bottom:0,left:0}}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity={0.35}/>
            <stop offset="100%" stopColor={c} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={c} strokeWidth={1.5} fill={"url(#"+gradId+")"} dot={false}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Btn({variant,t,children,onClick,small,style,disabled}){
  var v=variant||"primary";
  var base=Object.assign({display:"flex",alignItems:"center",gap:4,border:"none",borderRadius:DS.radius.sm,cursor:disabled?"not-allowed":"pointer",fontFamily:DS.font.body,fontWeight:600,fontSize:small?11:12,padding:small?"4px 9px":"6px 12px",opacity:disabled?0.5:1},style||{});
  var vars={
    primary:{background:DS.accent.primary,color:"#fff"},
    ghost:{background:t.surfaceHover,border:"1px solid "+t.border,color:t.text},
    danger:{background:DS.status.critical+"15",border:"1px solid "+DS.status.critical+"44",color:DS.status.critical},
    success:{background:DS.status.healthy+"15",border:"1px solid "+DS.status.healthy+"44",color:DS.status.healthy},
    warning:{background:DS.status.warning+"15",border:"1px solid "+DS.status.warning+"44",color:DS.status.warning},
  };
  return <button onClick={disabled?undefined:onClick} disabled={disabled} style={Object.assign({},base,vars[v]||vars.primary)}>{children}</button>;
}

function Card({t,children,p,style,loading,empty,emptyIcon,emptyMsg,error}){
  var padding=p!==undefined?p:14;
  if(loading){
    return(
      <div style={Object.assign({background:t.surface,border:"1px solid "+t.border,borderRadius:DS.radius.lg,padding:padding,boxShadow:DS.shadow.card},style||{})}>
        {[1,2,3].map(function(i){return <div key={i} style={{height:i===1?18:12,background:t.surfaceHover,borderRadius:4,marginBottom:8,width:i===1?"60%":"90%",animation:"blink 1.4s ease infinite"}}/>;})}
      </div>
    );
  }
  if(error){
    return(
      <div style={Object.assign({background:t.surface,border:"1px solid "+DS.status.critical+"44",borderRadius:DS.radius.lg,padding:padding,boxShadow:DS.shadow.card},style||{})}>
        <div style={{display:"flex",alignItems:"center",gap:8,color:DS.status.critical,fontSize:12}}>
          <XCircle size={14}/>{error}
        </div>
      </div>
    );
  }
  if(empty){
    return(
      <div style={Object.assign({background:t.surface,border:"1px solid "+t.border,borderRadius:DS.radius.lg,padding:padding,boxShadow:DS.shadow.card,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,color:t.textMuted},style||{})}>
        {emptyIcon&&<emptyIcon size={20}/>}
        <div style={{fontSize:12}}>{emptyMsg||"No data"}</div>
      </div>
    );
  }
  return <div style={Object.assign({background:t.surface,border:"1px solid "+t.border,borderRadius:DS.radius.lg,padding:padding,boxShadow:DS.shadow.card},style||{})}>{children}</div>;
}

function SectionHeader({t,title,sub,action}){
  return(
    <div style={{marginTop:2,display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
      <div>
        <h2 style={{fontFamily:DS.font.display,fontSize:14,fontWeight:700,margin:0,letterSpacing:"-0.01em",color:t.text}}>{title}</h2>
        {sub&&<p style={{fontSize:10.5,color:t.textMuted,margin:"2px 0 0"}}>{sub}</p>}
      </div>
      {action&&<div>{action}</div>}
    </div>
  );
}

function MonoTooltip({active,payload,label,t}){
  if(!active||!payload||!payload.length)return null;
  return(
    <div style={{background:t.surface,border:"1px solid "+t.borderStrong,borderRadius:7,padding:"6px 9px",fontSize:10.5,fontFamily:DS.font.mono,color:t.text,boxShadow:DS.shadow.overlay}}>
      <div style={{color:t.textMuted,marginBottom:3}}>{label}</div>
      {payload.map(function(p,i){return <div key={i} style={{color:p.color||p.stroke||p.fill}}>{p.name}: <strong>{typeof p.value==="number"?p.value.toLocaleString():p.value}</strong></div>;})}
    </div>
  );
}

function iconBtnStyle(t){
  return{width:30,height:30,borderRadius:7,border:"1px solid "+t.border,background:t.surface,color:t.textSub,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative"};
}

function StatPill({label,val,color}){
  return <div style={{textAlign:"center"}}><div style={{fontFamily:DS.font.mono,fontSize:16,fontWeight:700,color:color}}>{val}</div><div style={{fontSize:9.5,color:"#8892A6"}}>{label}</div></div>;
}

// ─────────────────────────────────────────────────────────────
// 8. WIDGET COMPONENTS
// ─────────────────────────────────────────────────────────────

function KpiCard({k,t,loading}){
  var c=k.up?DS.status.healthy:DS.status.critical;
  if(loading)return <Card t={t} p={12} loading={true}/>;
  return(
    <Card t={t} p={12} style={{animation:"fadeIn .3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:11,color:t.textSub,fontWeight:500}}>{k.label}</div>
        <k.icon size={13} color={t.textMuted}/>
      </div>
      <div style={{fontFamily:DS.font.mono,fontSize:20,fontWeight:700,margin:"4px 0 2px"}}>{k.value}</div>
      <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:6}}>
        {k.up?<ArrowUpRight size={11} color={c}/>:<ArrowDownRight size={11} color={c}/>}
        <span style={{fontSize:10.5,color:c,fontFamily:DS.font.mono,fontWeight:600}}>{Math.abs(k.change)}%</span>
        <span style={{fontSize:9.5,color:t.textMuted}}>vs last period</span>
      </div>
      <Sparkline data={k.spark} color={c} height={26}/>
    </Card>
  );
}

function MetricCard({t,label,value,icon,note,color,variant,loading}){
  var Icon=icon;
  if(loading)return <Card t={t} p={12} loading={true}/>;
  return(
    <Card t={t} p={12}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:11,color:t.textSub}}>{label}</div>
        {Icon&&<Icon size={13} color={color||t.textMuted}/>}
      </div>
      <div style={{fontFamily:DS.font.mono,fontSize:variant==="large"?24:19,fontWeight:700,margin:"4px 0 2px",color:color||t.text}}>{value}</div>
      {note&&<div style={{fontSize:10.5,color:t.textMuted}}>{note}</div>}
    </Card>
  );
}

function AlertCard({a,t,addAudit,addNotif}){
  var silenceCmd=useCommand({label:"Silence "+a.id,serviceCall:function(){return MockService.silenceAlert(a.id);},onAudit:function(e){if(addAudit)addAudit(e);if(addNotif)addNotif({text:a.id+" silenced",severity:"info"});}});
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:DS.radius.md,border:"1px solid "+(a.severity==="critical"?DS.status.critical+"44":t.border),background:t.bgElevated,animation:"fadeIn .2s ease"}}>
      <StatusDot s={a.severity} pulse={a.severity==="critical"}/>
      <span style={{fontSize:10,fontFamily:DS.font.mono,color:t.textMuted,width:70,flexShrink:0}}>{a.id}</span>
      <span style={{fontSize:12,flex:1}}>{a.title}</span>
      <span style={{fontSize:10,background:t.surfaceHover,padding:"2px 6px",borderRadius:99,color:t.textSub,flexShrink:0}}>{a.owner}</span>
      <span style={{fontSize:10,fontFamily:DS.font.mono,color:t.textMuted,width:60,textAlign:"right",flexShrink:0}}>{a.age}</span>
      <CommandDialog cmd={silenceCmd} label={"Silence "+a.id} description={"Silence notifications for \""+a.title+"\" for 30 minutes."} trigger={function(p){return <Btn variant="ghost" t={t} small onClick={p.onClick}><Ban size={10}/></Btn>;}}/>
    </div>
  );
}

function IncidentCard({inc,t,addAudit,addNotif}){
  var ackCmd=useCommand({label:"Acknowledge "+inc.id,serviceCall:function(){return MockService.acknowledgeAlert(inc.id);},onAudit:function(e){if(addAudit)addAudit(e);if(addNotif)addNotif({text:inc.id+" acknowledged",severity:"info"});}});
  var escCmd=useCommand({label:"Escalate "+inc.id,serviceCall:function(){return MockService.escalateIncident(inc.id);},canRollback:true,onAudit:function(e){if(addAudit)addAudit(e);if(addNotif)addNotif({text:inc.id+" escalated",severity:"warning"});}});
  return(
    <div style={{padding:"10px 12px",borderRadius:DS.radius.md,border:"1px solid "+(inc.severity==="critical"?DS.status.critical+"44":t.border),background:inc.severity==="critical"?DS.status.critical+"07":t.surface,animation:"fadeIn .2s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:4}}>
        <StatusDot s={inc.severity} pulse={inc.severity==="critical"}/>
        <div style={{fontSize:9.5,fontFamily:DS.font.mono,color:t.textMuted,flex:1}}>{inc.id} - {inc.owner} - {inc.age}</div>
        <StatusBadge status={inc.status}/>
      </div>
      <div style={{fontSize:12.5,fontWeight:600,marginBottom:7}}>{inc.title}</div>
      <div style={{display:"flex",gap:5}}>
        <CommandDialog cmd={escCmd} label={"Escalate "+inc.id} description={"Escalate \""+inc.title+"\" to leadership. All on-call engineers will be paged."} canRollback={true} trigger={function(p){return <Btn variant="ghost" t={t} small onClick={p.onClick}><Siren size={11}/> Escalate</Btn>;}}/>
        {inc.status!=="resolved"&&<CommandDialog cmd={ackCmd} label={"Acknowledge "+inc.id} description={"Acknowledge \""+inc.title+"\". You are taking ownership."} trigger={function(p){return <Btn variant="primary" t={t} small onClick={p.onClick}><Eye size={11}/> Acknowledge</Btn>;}}/>}
      </div>
    </div>
  );
}

function ApprovalCard({a,t,addAudit,addNotif,onDismiss}){
  var approveCmd=useCommand({label:"Approve "+a.id,serviceCall:function(){return MockService.approveRequest(a.id);},onAudit:function(e){if(addAudit)addAudit(e);if(addNotif)addNotif({text:a.id+" approved",severity:"info"});if(onDismiss)onDismiss();}});
  var rejectCmd=useCommand({label:"Reject "+a.id,serviceCall:function(){return MockService.rejectRequest(a.id);},onAudit:function(e){if(addAudit)addAudit(e);if(addNotif)addNotif({text:a.id+" rejected",severity:"warning"});if(onDismiss)onDismiss();}});
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:DS.radius.md,border:"1px solid "+t.border,background:t.surface}}>
      <PriorityIcon p={a.priority}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:9.5,fontFamily:DS.font.mono,color:t.textMuted}}>{a.id} - {a.type}</div>
        <div style={{fontSize:12,fontWeight:600}}>{a.title}</div>
        <div style={{fontSize:10.5,color:t.textSub}}>{a.requester} - {a.dept} - {a.age}</div>
      </div>
      <div style={{display:"flex",gap:5}}>
        <CommandDialog cmd={rejectCmd}  label={"Reject: "+a.id}  description={"Reject \""+a.title+"\" from "+a.requester+"."} trigger={function(p){return <Btn variant="ghost" t={t} small onClick={p.onClick}><Ban size={11}/> Reject</Btn>;}}/>
        <CommandDialog cmd={approveCmd} label={"Approve: "+a.id} description={"Approve \""+a.title+"\" from "+a.requester+" ("+a.dept+"). Confirm policy compliance."} trigger={function(p){return <Btn variant="success" t={t} small onClick={p.onClick}><CheckSquare size={11}/> Approve</Btn>;}}/>
      </div>
    </div>
  );
}

function HealthCard({s,t,addAudit,addNotif}){
  var restartCmd=useCommand({label:"Restart "+s.name,serviceCall:function(){return MockService.restartService(s.id);},onAudit:function(e){if(addAudit)addAudit(e);if(addNotif)addNotif({text:s.name+" restart "+(e.status==="success"?"complete":"failed"),severity:e.status==="success"?"info":"critical"});}});
  return(
    <div style={{padding:"10px 12px",borderRadius:DS.radius.md,border:"1px solid "+(s.status==="critical"?DS.status.critical+"55":t.border),background:t.surface}}>
      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
        <s.icon size={13} color={t.textSub}/>
        <span style={{fontSize:12,fontWeight:600,flex:1}}>{s.name}</span>
        <StatusDot s={s.status} pulse={s.status!=="healthy"}/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:s.status!=="healthy"?8:0}}>
        <div style={{fontSize:10,fontFamily:DS.font.mono}}><span style={{color:t.textMuted}}>LAT </span>{s.latency}</div>
        <div style={{fontSize:10,fontFamily:DS.font.mono}}><span style={{color:t.textMuted}}>UP </span>{s.uptime}</div>
        <div style={{fontSize:10,fontFamily:DS.font.mono}}><span style={{color:t.textMuted}}>RPM </span>{s.rpm.toLocaleString()}</div>
      </div>
      {s.status!=="healthy"&&<CommandDialog cmd={restartCmd} label={"Restart: "+s.name} description={"Restart \""+s.name+"\". Brief interruption expected."} trigger={function(p){return <Btn variant="danger" t={t} small onClick={p.onClick} style={{width:"100%",justifyContent:"center"}}><RefreshCw size={11}/> Restart service</Btn>;}}/>}
    </div>
  );
}

function OpCard({op,t,addAudit}){
  var pauseCmd=useCommand({label:"Pause "+op.id,serviceCall:function(){return MockService.pauseOperation(op.id);},canRollback:true,onAudit:addAudit});
  var stopCmd=useCommand({label:"Stop "+op.id,serviceCall:function(){return MockService.stopOperation(op.id);},onAudit:addAudit});
  return(
    <div style={{padding:"12px",borderRadius:DS.radius.md,border:"1px solid "+t.border,background:t.surface}}>
      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
        <div style={{width:6,height:6,borderRadius:99,background:DS.status.healthy,animation:"blink 1.4s ease infinite",flexShrink:0}}/>
        <div style={{fontSize:9.5,fontFamily:DS.font.mono,color:t.textMuted}}>{op.id}</div>
        <div style={{fontSize:9.5,color:t.textMuted,marginLeft:"auto",fontFamily:DS.font.mono}}>{op.elapsed}</div>
      </div>
      <div style={{fontSize:12,fontWeight:600,marginBottom:8}}>{op.title}</div>
      <MiniProgress val={op.progress} t={t}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
        <div style={{fontSize:10,color:t.textMuted}}>{op.startedBy}</div>
        <div style={{display:"flex",gap:5}}>
          <CommandDialog cmd={pauseCmd} label={"Pause "+op.id} description={"Pause \""+op.title+"\". Can be resumed from Operations."} trigger={function(p){return <Btn variant="ghost" t={t} small onClick={p.onClick}><Pause size={10}/></Btn>;}}/>
          <CommandDialog cmd={stopCmd}  label={"Stop "+op.id}  description={"Stop \""+op.title+"\" permanently. Progress will be lost."} trigger={function(p){return <Btn variant="danger" t={t} small onClick={p.onClick}><StopCircle size={10}/></Btn>;}}/>
        </div>
      </div>
    </div>
  );
}

function TimelineCard({t}){
  return(
    <Card t={t} p={14}>
      {MOCK.activityFeed.map(function(e,i){
        return(
          <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<MOCK.activityFeed.length-1?"1px solid "+t.border:"none"}}>
            <div style={{width:24,height:24,borderRadius:6,background:t.surfaceHover,border:"1px solid "+t.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <e.icon size={12} color={t.textSub}/>
            </div>
            <div style={{flex:1,fontSize:12}}>{e.text}</div>
            <div style={{fontSize:9.5,color:t.textMuted,fontFamily:DS.font.mono,whiteSpace:"nowrap"}}>{e.time}</div>
          </div>
        );
      })}
    </Card>
  );
}

function SystemPulseWidget({t}){
  var score=73;
  var s=score>85?"healthy":score>65?"warning":"critical";
  var vals=[62,66,70,64,58,61,67,72,69,73].map(function(v,i){return{i:i,v:v};});
  return(
    <div style={{display:"flex",alignItems:"center",gap:7,padding:"4px 10px",borderRadius:99,background:t.surface,border:"1px solid "+t.border}}>
      <StatusDot s={s} pulse/>
      <span style={{fontSize:9.5,color:t.textMuted,fontFamily:DS.font.mono}}>SYS PULSE</span>
      <div style={{width:56,height:16}}>
        <ResponsiveContainer width="100%" height={16}>
          <AreaChart data={vals} margin={{top:0,right:0,bottom:0,left:0}}>
            <defs>
              <linearGradient id="syspulse" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DS.status[s]} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={DS.status[s]} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={DS.status[s]} strokeWidth={1.5} fill="url(#syspulse)" dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <span style={{fontSize:10.5,fontFamily:DS.font.mono,fontWeight:700,color:DS.status[s]}}>{score}</span>
    </div>
  );
}

function SituationBar({t}){
  var items=[
    {label:"Critical alerts", val:2,        color:DS.status.critical, icon:AlertOctagon},
    {label:"Pending approvals",val:4,       color:DS.status.warning,  icon:ClipboardCheck},
    {label:"Running ops",     val:3,        color:DS.accent.primary,  icon:Activity},
    {label:"Services degraded",val:2,       color:DS.status.critical, icon:Server},
    {label:"System uptime",   val:"99.94%", color:DS.status.healthy,  icon:CheckCircle2},
    {label:"Deploy pipeline", val:"OK",     color:DS.status.healthy,  icon:GitBranch},
  ];
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,padding:"12px 14px",borderRadius:DS.radius.lg,border:"1px solid "+t.border,background:t.bgElevated}}>
      {items.map(function(item,i){
        return(
          <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
            <item.icon size={15} color={item.color}/>
            <div>
              <div style={{fontFamily:DS.font.mono,fontSize:15,fontWeight:700,color:item.color,lineHeight:1}}>{item.val}</div>
              <div style={{fontSize:9.5,color:t.textMuted,marginTop:1}}>{item.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ThreatCard({threat,t}){
  var sevColor={critical:DS.status.critical,warning:DS.status.warning,info:DS.status.info}[threat.severity]||DS.status.neutral;
  return(
    <div style={{padding:"10px 12px",borderRadius:DS.radius.md,border:"1px solid "+(threat.severity==="critical"?DS.status.critical+"44":t.border),background:threat.severity==="critical"?DS.status.critical+"07":t.bgElevated,animation:"fadeIn .2s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <StatusDot s={threat.severity} pulse={threat.severity==="critical"}/>
        <span style={{fontSize:9.5,fontFamily:DS.font.mono,color:t.textMuted,flex:1}}>{threat.id}</span>
        <StatusBadge status={threat.status}/>
        <span style={{fontSize:9.5,fontFamily:DS.font.mono,color:t.textMuted}}>{threat.time}</span>
      </div>
      <div style={{fontSize:12.5,fontWeight:600}}>{threat.title}</div>
      <div style={{fontSize:10,color:t.textSub,marginTop:3}}>Source: {threat.source} ({threat.country})</div>
    </div>
  );
}

// ExecutiveMetricCard - large format for board-level metrics
function ExecutiveMetricCard({t,label,value,change,up,note,color}){
  var c=color||(up?DS.status.healthy:DS.status.critical);
  return(
    <Card t={t} p={16}>
      <div style={{fontSize:11,color:t.textMuted,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{label}</div>
      <div style={{fontFamily:DS.font.mono,fontSize:28,fontWeight:700,color:t.text,lineHeight:1,marginBottom:6}}>{value}</div>
      {change!==undefined&&(
        <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4}}>
          {up?<ArrowUpRight size={13} color={c}/>:<ArrowDownRight size={13} color={c}/>}
          <span style={{fontSize:11.5,color:c,fontFamily:DS.font.mono,fontWeight:600}}>{Math.abs(change)}%</span>
          <span style={{fontSize:10,color:t.textMuted}}>vs last period</span>
        </div>
      )}
      {note&&<div style={{fontSize:10.5,color:t.textMuted}}>{note}</div>}
    </Card>
  );
}

// WorkflowCard - shows a multi-step process with current step highlighted
function WorkflowCard({t,title,steps,currentStep}){
  return(
    <Card t={t} p={14}>
      <div style={{fontSize:12,fontWeight:600,marginBottom:12}}>{title}</div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {steps.map(function(step,i){
          var isDone=i<currentStep;
          var isCurrent=i===currentStep;
          var c=isDone?DS.status.healthy:isCurrent?DS.accent.primary:t.textMuted;
          return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:22,height:22,borderRadius:99,border:"2px solid "+c,background:isDone?DS.status.healthy:isCurrent?DS.accent.primary+"22":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {isDone?<CheckCircle2 size={12} color="#fff"/>:<span style={{fontSize:9.5,fontFamily:DS.font.mono,fontWeight:700,color:c}}>{i+1}</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:isCurrent?600:400,color:isCurrent?t.text:isDone?t.textSub:t.textMuted}}>{step.label}</div>
                {step.detail&&isCurrent&&<div style={{fontSize:10,color:t.textMuted,marginTop:1}}>{step.detail}</div>}
              </div>
              {isDone&&<span style={{fontSize:9.5,color:DS.status.healthy,fontFamily:DS.font.mono}}>done</span>}
              {isCurrent&&<span style={{fontSize:9.5,color:DS.accent.primary,fontFamily:DS.font.mono}}>active</span>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ReplayCard - shows a past event that can be replayed or reviewed
function ReplayCard({t,event}){
  return(
    <Card t={t} p={14}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        <div style={{width:30,height:30,borderRadius:8,background:DS.accent.primary+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Clock size={14} color={DS.accent.primary}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,fontFamily:DS.font.mono,color:t.textMuted,marginBottom:2}}>{event.id} - {event.time}</div>
          <div style={{fontSize:12.5,fontWeight:600,marginBottom:3}}>{event.title}</div>
          <div style={{fontSize:11,color:t.textSub,marginBottom:8}}>{event.summary}</div>
          <div style={{display:"flex",gap:6}}>
            <span style={{fontSize:10,fontFamily:DS.font.mono,color:t.textMuted,background:t.surfaceHover,padding:"2px 7px",borderRadius:4}}>Duration: {event.duration}</span>
            <span style={{fontSize:10,fontFamily:DS.font.mono,color:t.textMuted,background:t.surfaceHover,padding:"2px 7px",borderRadius:4}}>Impact: {event.impact}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// TelemetryCard - real-time telemetry value with threshold indicator
function TelemetryCard({t,label,value,unit,threshold,thresholdLabel,status}){
  var s=status||"healthy";
  var c=DS.status[s]||DS.status.neutral;
  var pct=threshold?Math.min(100,Math.round((parseFloat(value)/threshold)*100)):null;
  return(
    <Card t={t} p={12}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <div style={{fontSize:11,color:t.textSub}}>{label}</div>
        <StatusDot s={s} pulse={s==="critical"}/>
      </div>
      <div style={{fontFamily:DS.font.mono,fontSize:22,fontWeight:700,color:c,marginBottom:2}}>
        {value}<span style={{fontSize:13,fontWeight:400,color:t.textMuted,marginLeft:2}}>{unit}</span>
      </div>
      {threshold&&(
        <>
          <MiniProgress val={pct} t={t} color={c}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:9.5,color:t.textMuted}}>
            <span>0</span>
            <span>{thresholdLabel||"threshold: "+threshold+unit}</span>
          </div>
        </>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// 9. CHART WRAPPER COMPONENTS
// ─────────────────────────────────────────────────────────────

function ChartCard({t,title,sub,children,span}){
  return(
    <Card t={t} p={12} style={span?{gridColumn:"span "+span}:{}}>
      <div style={{marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:600}}>{title}</div>
        {sub&&<div style={{fontSize:10,color:t.textMuted}}>{sub}</div>}
      </div>
      {children}
    </Card>
  );
}

function AreaChartCard({t,title,sub,data,dataKey,color,target}){
  var c=color||DS.accent.primary;
  var gid="ac-"+title.replace(/\s/g,"");
  return(
    <ChartCard t={t} title={title} sub={sub}>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity={0.4}/>
              <stop offset="100%" stopColor={c} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke={t.border} strokeDasharray="3 3" vertical={false}/>
          <XAxis dataKey="day" tick={{fontSize:9,fill:t.textMuted}} axisLine={{stroke:t.border}} tickLine={false}/>
          <YAxis tick={{fontSize:9,fill:t.textMuted}} axisLine={false} tickLine={false} width={40} tickFormatter={function(v){return typeof v==="number"&&v>10000?(v/1000).toFixed(0)+"k":v;}}/>
          <Tooltip content={<MonoTooltip t={t}/>}/>
          <Area type="monotone" dataKey={dataKey} stroke={c} strokeWidth={2} fill={"url(#"+gid+")"} name={dataKey}/>
          {target&&<Line type="monotone" dataKey={target} stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Target"/>}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function BarChartCard({t,title,sub,data,bars,stacked}){
  return(
    <ChartCard t={t} title={title} sub={sub}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <CartesianGrid stroke={t.border} strokeDasharray="3 3" vertical={false}/>
          <XAxis dataKey="day" tick={{fontSize:9,fill:t.textMuted}} axisLine={{stroke:t.border}} tickLine={false}/>
          <YAxis tick={{fontSize:9,fill:t.textMuted}} axisLine={false} tickLine={false} width={22}/>
          <Tooltip content={<MonoTooltip t={t}/>}/>
          {bars.map(function(b,i){return <Bar key={i} dataKey={b.key} stackId={stacked?"s":undefined} fill={b.color||DS.chart[i]} radius={[4,4,0,0]} name={b.name||b.key}/>;}) }
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function LineChartCard({t,title,sub,data,lines}){
  return(
    <ChartCard t={t} title={title} sub={sub}>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid stroke={t.border} strokeDasharray="3 3" vertical={false}/>
          <XAxis dataKey="day" tick={{fontSize:9,fill:t.textMuted}} axisLine={{stroke:t.border}} tickLine={false}/>
          <YAxis tick={{fontSize:9,fill:t.textMuted}} axisLine={false} tickLine={false} width={30}/>
          <Tooltip content={<MonoTooltip t={t}/>}/>
          {lines.map(function(l,i){return <Line key={i} type="monotone" dataKey={l.key} stroke={l.color||DS.chart[i]} strokeWidth={2} dot={false} name={l.name||l.key}/>;}) }
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function DonutChartCard({t,title,sub,data}){
  return(
    <ChartCard t={t} title={title} sub={sub}>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={46} outerRadius={74} paddingAngle={2}>
            {data.map(function(p,i){return <Cell key={i} fill={p.color||DS.chart[i%DS.chart.length]} stroke={t.surface} strokeWidth={2}/>;}) }
          </Pie>
          <Tooltip content={<MonoTooltip t={t}/>}/>
        </PieChart>
      </ResponsiveContainer>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>
        {data.map(function(p){return(
          <div key={p.name} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:t.textSub}}>
            <span style={{width:6,height:6,borderRadius:99,background:p.color}}/>
            {p.name} <span style={{fontFamily:DS.font.mono,color:t.text}}>{p.value}%</span>
          </div>
        );})}
      </div>
    </ChartCard>
  );
}

// ─────────────────────────────────────────────────────────────
// 10. COMMAND DIALOG
// ─────────────────────────────────────────────────────────────
function CommandDialog({cmd,label,description,canRollback,children,trigger}){
  var t=useTheme().t;
  var phase=cmd.phase,cancel=cmd.cancel,execute=cmd.execute,rollback=cmd.rollback,reset=cmd.reset,state=cmd.state;
  var open=phase!==CMD.IDLE;
  if(!open)return trigger({onClick:function(){cmd.confirm(null);}});
  var spinStyle={animation:"spin 1s linear infinite"};
  var phaseUI={};
  phaseUI[CMD.CONFIRM]     ={icon:<AlertCircle size={20} color={DS.status.warning}/>,     title:"Confirm action"};
  phaseUI[CMD.EXECUTING]   ={icon:<Loader2 size={20} color={DS.accent.primary} style={spinStyle}/>,title:"Executing..."};
  phaseUI[CMD.SUCCESS]     ={icon:<CheckCircle2 size={20} color={DS.status.healthy}/>,    title:"Success"};
  phaseUI[CMD.FAILURE]     ={icon:<XCircle size={20} color={DS.status.critical}/>,        title:"Failed"};
  phaseUI[CMD.ROLLING_BACK]={icon:<Loader2 size={20} color={DS.status.warning} style={spinStyle}/>,title:"Rolling back..."};
  phaseUI[CMD.ROLLED_BACK] ={icon:<RotateCcw size={20} color={DS.status.neutral}/>,      title:"Rolled back"};
  var ui=phaseUI[phase]||phaseUI[CMD.CONFIRM];
  var terminalPhases=[CMD.SUCCESS,CMD.FAILURE,CMD.ROLLED_BACK];
  return(
    <>
      {trigger({onClick:function(){}})}
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={phase===CMD.CONFIRM?cancel:undefined}>
        <div style={{width:420,background:t.surface,borderRadius:DS.radius.xl,border:"1px solid "+t.borderStrong,boxShadow:DS.shadow.overlay,overflow:"hidden"}} onClick={function(e){e.stopPropagation();}}>
          <div style={{padding:"16px 18px 12px",borderBottom:"1px solid "+t.border,display:"flex",gap:10,alignItems:"flex-start"}}>
            {ui.icon}
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,marginBottom:1}}>{label}</div><div style={{fontSize:11.5,color:t.textSub}}>{ui.title}</div></div>
            {terminalPhases.indexOf(phase)>=0&&<button onClick={reset} style={iconBtnStyle(t)}><X size={14}/></button>}
          </div>
          <div style={{padding:"14px 18px"}}>
            {phase===CMD.CONFIRM&&<><p style={{margin:"0 0 12px",fontSize:12.5,color:t.textSub,lineHeight:1.6}}>{description}</p>{children}</>}
            {phase===CMD.EXECUTING&&(
              <div style={{textAlign:"center",padding:"10px 0 2px",color:t.textSub,fontSize:12.5}}>
                <div style={{height:3,borderRadius:99,background:t.border,overflow:"hidden",marginBottom:12}}>
                  <div style={{height:"100%",background:DS.accent.gradient,animation:"progress 1.4s ease-in-out infinite",borderRadius:99}}/>
                </div>
                Processing - do not close this dialog.
              </div>
            )}
            {phase===CMD.SUCCESS&&<div style={{fontSize:12.5,color:DS.status.healthy}}>Completed.{state.auditId&&<div style={{fontSize:10.5,fontFamily:DS.font.mono,color:t.textMuted,marginTop:5}}>Audit: {state.auditId}</div>}</div>}
            {phase===CMD.FAILURE&&<div style={{fontSize:12.5,color:DS.status.critical}}>{state.error}<div style={{fontSize:11,color:t.textMuted,marginTop:4}}>Check audit log.</div></div>}
            {(phase===CMD.ROLLING_BACK||phase===CMD.ROLLED_BACK)&&<div style={{fontSize:12.5,color:t.textSub}}>{phase===CMD.ROLLING_BACK?"Rolling back...":"Rollback complete."}</div>}
          </div>
          <div style={{padding:"10px 18px 16px",display:"flex",gap:7,justifyContent:"flex-end",borderTop:"1px solid "+t.border}}>
            {phase===CMD.CONFIRM&&<><Btn variant="ghost" t={t} onClick={cancel}>Cancel</Btn><Btn variant="primary" t={t} onClick={function(){execute();}}>Confirm</Btn></>}
            {phase===CMD.SUCCESS&&canRollback&&<><Btn variant="ghost" t={t} onClick={reset}>Close</Btn><Btn variant="danger" t={t} onClick={rollback}>Rollback</Btn></>}
            {phase===CMD.SUCCESS&&!canRollback&&<Btn variant="primary" t={t} onClick={reset}>Done</Btn>}
            {phase===CMD.FAILURE&&<><Btn variant="ghost" t={t} onClick={reset}>Close</Btn><Btn variant="primary" t={t} onClick={function(){execute();}}>Retry</Btn></>}
            {phase===CMD.ROLLED_BACK&&<Btn variant="ghost" t={t} onClick={reset}>Close</Btn>}
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 11. COMMAND PANEL
// ─────────────────────────────────────────────────────────────
function CommandPanel(){
  var t=useTheme().t;
  var pctx=usePanel();
  var auditLog=useAudit().auditLog;
  var tabState=useState("history"); var tab=tabState[0]; var setTab=tabState[1];
  var tabs=[{id:"history",label:"History",icon:History},{id:"pending",label:"Pending",icon:Inbox},{id:"ops",label:"Running",icon:Activity}];
  return(
    <aside style={{width:280,flexShrink:0,background:t.bgElevated,borderLeft:"1px solid "+t.border,display:"flex",flexDirection:"column",height:"100vh",position:"sticky",top:0,overflowY:"auto"}}>
      <div style={{padding:"12px 14px",borderBottom:"1px solid "+t.border,display:"flex",alignItems:"center",gap:8}}>
        <Terminal size={14} color={DS.accent.primary}/>
        <span style={{fontWeight:700,fontSize:13,flex:1}}>Command Panel</span>
        <button onClick={function(){pctx.setPanelOpen(false);}} style={iconBtnStyle(t)}><X size={14}/></button>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid "+t.border}}>
        {tabs.map(function(tb){
          return(
            <button key={tb.id} onClick={function(){setTab(tb.id);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"8px 0",border:"none",background:"transparent",borderBottom:"2px solid "+(tab===tb.id?DS.accent.primary:"transparent"),color:tab===tb.id?DS.accent.primary:t.textSub,fontSize:11,fontWeight:tab===tb.id?600:500,cursor:"pointer",fontFamily:DS.font.body}}>
              <tb.icon size={11}/>{tb.label}
            </button>
          );
        })}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:10}}>
        {tab==="history"&&auditLog.slice(0,10).map(function(e,i){
          return(
            <div key={i} style={{display:"flex",gap:9,padding:"8px 10px",borderRadius:DS.radius.md,marginBottom:3,background:t.surface,border:"1px solid "+t.border}}>
              <StatusIcon s={e.status}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:600}}>{e.cmd}</div>
                <div style={{fontSize:10,color:t.textMuted,fontFamily:DS.font.mono}}>{e.target}</div>
              </div>
              <div style={{fontSize:9.5,color:t.textMuted,fontFamily:DS.font.mono,textAlign:"right",flexShrink:0}}>
                <div>{e.actor}</div><div>{e.time}</div>
              </div>
            </div>
          );
        })}
        {tab==="pending"&&MOCK.pendingApprovals.map(function(a){
          return(
            <div key={a.id} style={{padding:"8px 10px",borderRadius:DS.radius.md,marginBottom:3,background:t.surface,border:"1px solid "+t.border}}>
              <div style={{fontSize:10,color:t.textMuted,fontFamily:DS.font.mono,marginBottom:2}}>{a.id}</div>
              <div style={{fontSize:11,fontWeight:600,marginBottom:2}}>{a.title}</div>
              <div style={{fontSize:10,color:t.textMuted}}>{a.requester} - {a.dept}</div>
            </div>
          );
        })}
        {tab==="ops"&&MOCK.runningOps.map(function(op){
          return(
            <div key={op.id} style={{padding:"8px 10px",borderRadius:DS.radius.md,marginBottom:3,background:t.surface,border:"1px solid "+t.border}}>
              <div style={{fontSize:10,color:t.textMuted,fontFamily:DS.font.mono,marginBottom:2}}>{op.id}</div>
              <div style={{fontSize:11,fontWeight:600,marginBottom:4}}>{op.title}</div>
              <MiniProgress val={op.progress} t={t}/>
              <div style={{fontSize:10,color:t.textMuted,marginTop:4}}>{op.startedBy} - {op.elapsed}</div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// 12. LAYOUT - SIDEBAR
// ─────────────────────────────────────────────────────────────
var DASHBOARDS = [
  {id:"executive",   label:"Executive",          icon:LayoutGrid, color:DS.accent.primary},
  {id:"operations",  label:"Operations",         icon:Activity,   color:DS.status.warning},
  {id:"engineering", label:"Engineering",        icon:Cpu,        color:DS.chart[2]},
  {id:"soc",         label:"SOC Dashboard",      icon:ShieldCheck,color:DS.status.critical},
  {id:"finance",     label:"Finance",            icon:DollarSign, color:DS.status.healthy},
  {id:"analytics",   label:"Analytics",          icon:BarChart3,  color:DS.chart[4]},
  {id:"government",  label:"Gov Command Center", icon:ClipboardCheck, color:DS.chart[2]},
  {id:"bucket", label:"Bucket / Evidence", icon:Database, color:"#22C55E"},
  {id: "runtime",label: "Runtime Services",icon: Activity,color: "#22C55E",},
];

var SETTINGS_NAV = [
  {id:"settings", label:"Settings", icon:Settings},
  {id:"reports",  label:"Reports",  icon:FileText},
];

function Sidebar({activeDash,setActiveDash}){
  var tctx=useTheme(); var t=tctx.t; var theme=tctx.theme;
  var pctx=usePanel(); var panelOpen=pctx.panelOpen; var setPanelOpen=pctx.setPanelOpen;
  return(
    <aside style={{width:216,flexShrink:0,background:t.bgElevated,borderRight:"1px solid "+t.border,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh"}}>
      <div style={{padding:"16px 14px 12px",display:"flex",alignItems:"center",gap:9,borderBottom:"1px solid "+t.border}}>
        <div style={{width:30,height:30,borderRadius:8,background:DS.accent.gradient,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:DS.shadow.elevated,flexShrink:0}}>
          <Gauge size={16} color="#fff" strokeWidth={2.4}/>
        </div>
        <div>
          <div style={{fontFamily:DS.font.display,fontWeight:700,fontSize:14.5,letterSpacing:"-0.01em"}}>BHIV<span style={{color:DS.accent.primary}}>-ECC</span></div>
          <div style={{fontSize:9,color:t.textMuted,letterSpacing:"0.06em",fontFamily:DS.font.mono}}>DASHBOARD KIT v3</div>
        </div>
      </div>

      <div style={{padding:"8px 8px 2px"}}>
        <button onClick={function(){setPanelOpen(!panelOpen);}} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:DS.radius.md,border:"1px solid "+(panelOpen?DS.accent.primary:t.border),background:panelOpen?DS.accent.glow:"transparent",color:panelOpen?DS.accent.primary:t.textSub,fontSize:12,cursor:"pointer",fontFamily:DS.font.body,fontWeight:500}}>
          <Terminal size={13} strokeWidth={2}/>
          <span style={{flex:1,textAlign:"left"}}>Command Panel</span>
          <Radio size={11} color={panelOpen?DS.status.healthy:t.textMuted}/>
        </button>
      </div>

      <div style={{padding:"8px 8px 4px"}}>
        <div style={{fontSize:9.5,fontWeight:600,color:t.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",padding:"2px 10px 6px"}}>Dashboards</div>
        {DASHBOARDS.map(function(d){
          var isA=activeDash===d.id;
          return(
            <button key={d.id} onClick={function(){setActiveDash(d.id);}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"7px 10px",marginBottom:1,borderRadius:DS.radius.md,border:"none",background:isA?(theme==="dark"?"#1A2436":"#E8F0FE"):"transparent",color:isA?DS.accent.primary:t.textSub,fontWeight:isA?600:500,fontSize:12.5,cursor:"pointer",fontFamily:DS.font.body,textAlign:"left"}}
              onMouseEnter={function(e){if(!isA)e.currentTarget.style.background=t.surfaceHover;}}
              onMouseLeave={function(e){if(!isA)e.currentTarget.style.background="transparent";}}>
              <d.icon size={14} strokeWidth={2} color={isA?DS.accent.primary:d.color+"88"}/>
              <span style={{flex:1}}>{d.label}</span>
              {isA&&<ChevronRight size={12}/>}
            </button>
          );
        })}
      </div>

      <div style={{flex:1}}/>

      <div style={{padding:"4px 8px",borderTop:"1px solid "+t.border}}>
        {SETTINGS_NAV.map(function(n){
          return(
            <button key={n.id} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"7px 10px",marginBottom:1,borderRadius:DS.radius.md,border:"none",background:"transparent",color:t.textSub,fontWeight:500,fontSize:12.5,cursor:"pointer",fontFamily:DS.font.body,textAlign:"left"}}
              onMouseEnter={function(e){e.currentTarget.style.background=t.surfaceHover;}}
              onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}>
              <n.icon size={14} strokeWidth={2}/>
              <span>{n.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{padding:"8px 8px 12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:DS.radius.md,background:t.surface,border:"1px solid "+t.border}}>
          <Avatar initials="RS" size={26}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11.5,fontWeight:600,whiteSpace:"nowrap"}}>Raghav Shah</div>
            <div style={{fontSize:9.5,color:t.textMuted}}>CFO - BHIV</div>
          </div>
          <ChevronDown size={12} color={t.textMuted}/>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// 13. LAYOUT - TOPBAR
// ─────────────────────────────────────────────────────────────
function Topbar({activeDash}){
  var tctx=useTheme(); var t=tctx.t; var theme=tctx.theme; var setTheme=tctx.setTheme;
  var nctx=useNotif(); var notifs=nctx.notifs; var markRead=nctx.markRead;
  var notifState=useState(false); var notifOpen=notifState[0]; var setNotifOpen=notifState[1];
  var unread=notifs.filter(function(n){return !n.read;}).length;
  var dash=DASHBOARDS.find(function(d){return d.id===activeDash;})||DASHBOARDS[0];

  return(
    <header style={{height:54,flexShrink:0,display:"flex",alignItems:"center",gap:10,padding:"0 20px",borderBottom:"1px solid "+t.border,background:t.bgElevated,position:"sticky",top:0,zIndex:20}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <dash.icon size={14} color={dash.color}/>
        <span style={{fontFamily:DS.font.display,fontWeight:700,fontSize:13.5,color:t.text}}>{dash.label} Dashboard</span>
        <ChevronRight size={11} color={t.textMuted}/>
        <span style={{fontFamily:DS.font.mono,fontSize:10,color:t.textMuted}}>
          {new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} - {new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})} IST
        </span>
      </div>
      <SystemPulseWidget t={t}/>
      <div style={{flex:1}}/>
      <button onClick={function(){setTheme(theme==="dark"?"light":"dark");}} style={iconBtnStyle(t)} aria-label="Toggle theme">
        {theme==="dark"?<Sun size={14}/>:<Moon size={14}/>}
      </button>
      <div style={{position:"relative"}}>
        <button onClick={function(){setNotifOpen(!notifOpen);}} style={Object.assign({},iconBtnStyle(t),{position:"relative"})} aria-label="Notifications">
          <Bell size={14}/>
          {unread>0&&<span style={{position:"absolute",top:7,right:8,width:6,height:6,borderRadius:99,background:DS.status.critical}}/>}
        </button>
        {notifOpen&&(
          <div style={{position:"absolute",right:0,top:42,width:290,background:t.surface,border:"1px solid "+t.border,borderRadius:DS.radius.lg,boxShadow:DS.shadow.overlay,zIndex:99,overflow:"hidden"}}>
            <div style={{padding:"10px 12px 7px",borderBottom:"1px solid "+t.border,fontSize:12,fontWeight:600}}>Notifications <span style={{color:t.textMuted,fontWeight:400}}>({unread} unread)</span></div>
            {notifs.map(function(n){
              return(
                <div key={n.id} onClick={function(){markRead(n.id);setNotifOpen(false);}}
                  style={{display:"flex",gap:8,padding:"9px 12px",borderBottom:"1px solid "+t.border,cursor:"pointer",background:n.read?undefined:t.surfaceActive}}
                  onMouseEnter={function(e){e.currentTarget.style.background=t.surfaceHover;}}
                  onMouseLeave={function(e){e.currentTarget.style.background=n.read?"":t.surfaceActive;}}>
                  <StatusDot s={n.severity} pulse={!n.read}/>
                  <div style={{flex:1,fontSize:11}}>{n.text}</div>
                  <div style={{fontSize:9.5,color:t.textMuted,fontFamily:DS.font.mono,flexShrink:0}}>{n.time}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// 14. DASHBOARD PAGES
// ─────────────────────────────────────────────────────────────

// EXECUTIVE DASHBOARD - CSS Grid, no scrolling primary content
function ExecutiveDashboard(){
  var t=useTheme().t;
  var actx=useAudit(); var addAudit=actx.addAudit;
  var nctx=useNotif(); var addNotif=nctx.addNotif;
  var dismissedState=useState([]); var dismissed=dismissedState[0]; var setDismissed=dismissedState[1];
  var visible=MOCK.pendingApprovals.filter(function(a){return dismissed.indexOf(a.id)<0;});

  return(
    <div style={{display:"grid",gridTemplateRows:"auto auto 1fr auto",gap:16,height:"calc(100vh - 54px)",overflowY:"auto",padding:"16px 20px 24px"}}>
      {/* Row 1: Situation bar */}
      <SituationBar t={t}/>

      {/* Row 2: KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {MOCK.kpis.slice(0,4).map(function(k){return <KpiCard key={k.id} k={k} t={t}/>;}) }
        {MOCK.kpis.slice(4,8).map(function(k){return <KpiCard key={k.id} k={k} t={t}/>;}) }
      </div>

      {/* Row 3: Main grid - 3 columns */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 320px",gap:12,minHeight:0}}>
        {/* Col 1: Approvals */}
        <div style={{display:"flex",flexDirection:"column",gap:10,overflow:"hidden"}}>
          <SectionHeader t={t} title="Pending approvals" sub="Act on these first"/>
          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:7}}>
            {visible.length===0&&<div style={{color:t.textMuted,fontSize:12,padding:"20px 0",textAlign:"center"}}>All handled</div>}
            {visible.map(function(a){return <ApprovalCard key={a.id} a={a} t={t} addAudit={addAudit} addNotif={addNotif} onDismiss={function(){setDismissed(function(p){return p.concat([a.id]);});}}/>;}) }
          </div>
        </div>

        {/* Col 2: Incidents + ops */}
        <div style={{display:"flex",flexDirection:"column",gap:10,overflow:"hidden"}}>
          <SectionHeader t={t} title="Active incidents" sub="What requires immediate attention"/>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {MOCK.activeIncidents.map(function(inc){return <IncidentCard key={inc.id} inc={inc} t={t} addAudit={addAudit} addNotif={addNotif}/>;}) }
          </div>
          <SectionHeader t={t} title="Running operations" sub="In progress"/>
          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:7}}>
            {MOCK.runningOps.map(function(op){return <OpCard key={op.id} op={op} t={t} addAudit={addAudit}/>;}) }
          </div>
        </div>

        {/* Col 3: Service health */}
        <div style={{display:"flex",flexDirection:"column",gap:10,overflow:"hidden"}}>
          <SectionHeader t={t} title="Service health" sub="Live status"/>
          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:7}}>
            {MOCK.services.map(function(s){return <HealthCard key={s.id} s={s} t={t} addAudit={addAudit} addNotif={addNotif}/>;}) }
          </div>
        </div>
      </div>

      {/* Row 4: Activity feed */}
      <div>
        <SectionHeader t={t} title="What just happened" sub="Last 6 hours"/>
        <div style={{marginTop:8}}><TimelineCard t={t}/></div>
      </div>
    </div>
  );
}

// OPERATIONS DASHBOARD
function OperationsDashboard(){
  var t=useTheme().t;
  var actx=useAudit(); var addAudit=actx.addAudit;
  var nctx=useNotif(); var addNotif=nctx.addNotif;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,padding:"16px 20px 24px",overflowY:"auto"}}>
      <SituationBar t={t}/>
      <SectionHeader t={t} title="Service health - all monitored services"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {MOCK.services.map(function(s){return <HealthCard key={s.id} s={s} t={t} addAudit={addAudit} addNotif={addNotif}/>;}) }
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div>
          <SectionHeader t={t} title="Active incidents"/>
          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:7}}>
            {MOCK.activeIncidents.map(function(inc){return <IncidentCard key={inc.id} inc={inc} t={t} addAudit={addAudit} addNotif={addNotif}/>;}) }
          </div>
        </div>
        <div>
          <SectionHeader t={t} title="Running operations"/>
          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:7}}>
            {MOCK.runningOps.map(function(op){return <OpCard key={op.id} op={op} t={t} addAudit={addAudit}/>;}) }
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <BarChartCard t={t} title="Deployment frequency" sub="Last 10 days" data={MOCK.deployFreq} bars={[{key:"ok",name:"Success",color:DS.status.healthy},{key:"fail",name:"Failed",color:DS.status.critical}]} stacked={true}/>
        <LineChartCard t={t} title="Latency percentiles" sub="P50 / P95 / P99 (ms)" data={MOCK.latencyData} lines={[{key:"p50",name:"P50",color:DS.status.healthy},{key:"p95",name:"P95",color:DS.status.warning},{key:"p99",name:"P99",color:DS.status.critical}]}/>
      </div>
      <SectionHeader t={t} title="Activity"/>
      <TimelineCard t={t}/>
    </div>
  );
}

// ENGINEERING DASHBOARD
function EngineeringDashboard(){
  var t=useTheme().t;
  var actx=useAudit(); var addAudit=actx.addAudit;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,padding:"16px 20px 24px",overflowY:"auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <MetricCard t={t} label="Current Release" value="v4.1.9" icon={GitBranch} note="Deployed 12 min ago"/>
        <MetricCard t={t} label="Code Coverage"   value="84.2%"  icon={CheckCircle2} note="+1.3% this week" color={DS.status.healthy}/>
        <MetricCard t={t} label="P50 Latency"     value="96ms"   icon={Zap} note="P95 at 248ms"/>
        <MetricCard t={t} label="Prod Errors 24h" value="14"     icon={XCircle} note="3 more than yesterday" color={DS.status.warning}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <BarChartCard t={t} title="Deployment frequency" sub="Last 10 days" data={MOCK.deployFreq} bars={[{key:"ok",name:"Success",color:DS.status.healthy},{key:"fail",name:"Failed",color:DS.status.critical}]} stacked={true}/>
        <LineChartCard t={t} title="Latency percentiles" sub="ms" data={MOCK.latencyData} lines={[{key:"p50",color:DS.status.healthy,name:"P50"},{key:"p95",color:DS.status.warning,name:"P95"},{key:"p99",color:DS.status.critical,name:"P99"}]}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        <Card t={t} p={14}>
          <div style={{fontSize:12,color:t.textSub,marginBottom:9}}>Sprint 24 progress</div>
          <ProgressBar val={69} t={t}/>
          <div style={{display:"flex",justifyContent:"space-around",marginTop:12}}>
            <StatPill label="Done" val={38} color={DS.status.healthy}/>
            <StatPill label="Pending" val={14} color={DS.status.warning}/>
            <StatPill label="Blocked" val={3}  color={DS.status.critical}/>
          </div>
        </Card>
        <ChartCard t={t} title="Burn-down" sub="Remaining story points">
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={MOCK.burndownData}>
              <CartesianGrid stroke={t.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="day" tick={{fontSize:8.5,fill:t.textMuted}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:8.5,fill:t.textMuted}} axisLine={false} tickLine={false} width={20}/>
              <Tooltip content={<MonoTooltip t={t}/>}/>
              <Line type="monotone" dataKey="ideal"  stroke={t.textMuted} strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Ideal"/>
              <Line type="monotone" dataKey="actual" stroke={DS.accent.primary} strokeWidth={2} dot={false} name="Actual"/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card t={t} p={14}>
          <div style={{fontSize:12,color:t.textSub,marginBottom:9}}>Upcoming releases</div>
          {[{v:"v4.2.0",d:"Jul 4",s:"ECC GA"},{v:"v4.2.1",d:"Jul 11",s:"Payment hardening"},{v:"v4.3.0",d:"Jul 28",s:"Mobile SDK v2"}].map(function(rel){
            return(
              <div key={rel.v} style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}>
                <Rocket size={12} color={DS.accent.primary}/>
                <div style={{flex:1}}><div style={{fontSize:11.5,fontWeight:600,fontFamily:DS.font.mono}}>{rel.v}</div><div style={{fontSize:10,color:t.textMuted}}>{rel.s}</div></div>
                <div style={{fontSize:10,fontFamily:DS.font.mono,color:t.textSub}}>{rel.d}</div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

// SOC DASHBOARD
function SOCDashboard(){
  var t=useTheme().t;
  var actx=useAudit(); var addAudit=actx.addAudit;
  var nctx=useNotif(); var addNotif=nctx.addNotif;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,padding:"16px 20px 24px",overflowY:"auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <MetricCard t={t} label="Active Threats"     value="2"       icon={ShieldAlert} note="2 critical, 2 warning" color={DS.status.critical} variant="large"/>
        <MetricCard t={t} label="Events (24h)"       value="14,820"  icon={Activity}    note="+3.2% vs yesterday"/>
        <MetricCard t={t} label="Mean Time to Detect" value="4.2 min" icon={Clock}      note="-1.1 min this week" color={DS.status.healthy}/>
        <MetricCard t={t} label="Assets Monitored"   value="247"     icon={Server}      note="All reporting"/>
      </div>
      <SectionHeader t={t} title="Active threats" sub="Ranked by severity - most critical first"/>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {MOCK.threats.map(function(th){return <ThreatCard key={th.id} threat={th} t={t}/>;}) }
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <AreaChartCard t={t} title="Security events over time" sub="Events per hour, last 12h" data={MOCK.latencyData} dataKey="p50" color={DS.status.critical}/>
        <BarChartCard t={t} title="Threats by category" sub="Last 7 days" data={[
          {day:"Brute Force",ok:12,fail:3},{day:"Injection",ok:4,fail:1},{day:"Exfil",ok:2,fail:2},{day:"Scan",ok:8,fail:0},{day:"Malware",ok:1,fail:1}
        ]} bars={[{key:"ok",name:"Contained",color:DS.status.healthy},{key:"fail",name:"Active",color:DS.status.critical}]} stacked={true}/>
      </div>
      <SectionHeader t={t} title="Recent security events"/>
      <TimelineCard t={t}/>
    </div>
  );
}

// FINANCE DASHBOARD
function FinanceDashboard(){
  var t=useTheme().t;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,padding:"16px 20px 24px",overflowY:"auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {MOCK.financeKpis.map(function(k){return <KpiCard key={k.id} k={k} t={t}/>;}) }
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
        <AreaChartCard t={t} title="Revenue trend vs target" sub="Last 14 days (INR)" data={MOCK.revenueTrend} dataKey="revenue" target="target"/>
        <DonutChartCard t={t} title="Revenue by product" sub="Share %" data={MOCK.revenueByProduct}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <AreaChartCard t={t} title="User growth" sub="MAU - 14 days" data={MOCK.userGrowth} dataKey="users" color={DS.status.healthy}/>
        <BarChartCard t={t} title="New signups daily" sub="Last 14 days" data={MOCK.userGrowth} bars={[{key:"newUsers",name:"New Users",color:DS.accent.primary}]}/>
      </div>
      <SectionHeader t={t} title="Team performance" sub="Productivity, completion and efficiency"/>
      <Card t={t} p={14}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={MOCK.teamPerf}>
            <CartesianGrid stroke={t.border} strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="dept" tick={{fontSize:10,fill:t.textMuted}} axisLine={{stroke:t.border}} tickLine={false}/>
            <YAxis tick={{fontSize:10,fill:t.textMuted}} axisLine={false} tickLine={false} width={28}/>
            <Tooltip content={<MonoTooltip t={t}/>}/>
            <Legend wrapperStyle={{fontSize:10.5}}/>
            <Bar dataKey="prod" fill={DS.accent.primary} radius={[4,4,0,0]} name="Productivity %"/>
            <Bar dataKey="comp" fill={DS.status.healthy} radius={[4,4,0,0]} name="Completion %"/>
            <Bar dataKey="eff"  fill={DS.chart[2]}       radius={[4,4,0,0]} name="Efficiency %"/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ANALYTICS DASHBOARD
function AnalyticsDashboard(){
  var t=useTheme().t;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,padding:"16px 20px 24px",overflowY:"auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <MetricCard t={t} label="Total Sessions (7d)"  value="182,440" icon={BarChart2} note="+12.3% vs last week"/>
        <MetricCard t={t} label="Avg Session Duration"  value="6m 42s"  icon={Clock}    note="-0.4 min vs last week"/>
        <MetricCard t={t} label="Bounce Rate"           value="28.4%"   icon={ArrowRight} note="-3.1% (improving)" color={DS.status.healthy}/>
        <MetricCard t={t} label="Conversion Rate"       value="3.8%"    icon={Target}   note="+0.4% vs last month" color={DS.status.healthy}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <AreaChartCard t={t} title="Daily active users" sub="Last 14 days" data={MOCK.userGrowth} dataKey="users" color={DS.accent.primary}/>
        <LineChartCard t={t} title="Conversion vs retention" sub="% over time" data={MOCK.latencyData.map(function(d,i){return{day:d.day,conv:18+i*0.4,ret:76+i*0.3};})} lines={[{key:"conv",name:"Conversion %",color:DS.accent.primary},{key:"ret",name:"Retention %",color:DS.status.healthy}]}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
        <BarChartCard t={t} title="Traffic sources" sub="Sessions by channel" data={[
          {day:"Organic",ok:48000},{day:"Direct",ok:32000},{day:"Referral",ok:18000},{day:"Social",ok:14000},{day:"Paid",ok:8000}
        ]} bars={[{key:"ok",name:"Sessions",color:DS.accent.primary}]}/>
        <DonutChartCard t={t} title="Device split" sub="Sessions %" data={[
          {name:"Desktop",value:54,color:DS.accent.primary},
          {name:"Mobile", value:38,color:DS.chart[2]},
          {name:"Tablet", value:8, color:DS.chart[1]},
        ]}/>
      </div>
    </div>
  );
}

// GOVERNMENT COMMAND CENTER DASHBOARD
function GovernmentDashboard(){
  var t=useTheme().t;
  var govEvents=[
    {id:"EVT-0041",title:"Cyclone warning issued - Konkan coast",       severity:"critical", status:"active",   phase:"Response",    age:"14 min"},
    {id:"EVT-0040",title:"Industrial fire - Pune industrial zone",       severity:"critical", status:"contained",phase:"Containment", age:"2 hr"},
    {id:"EVT-0039",title:"Flood alert - Sangli district river levels",  severity:"warning",  status:"monitoring",phase:"Monitoring",  age:"4 hr"},
    {id:"EVT-0038",title:"Power grid disruption - 3 districts",         severity:"warning",  status:"restoring", phase:"Recovery",   age:"6 hr"},
  ];
  var resources=[
    {type:"NDRF Teams",     deployed:8,  total:12, unit:"teams"},
    {type:"Medical Units",  deployed:14, total:20, unit:"units"},
    {type:"Relief Camps",   deployed:6,  total:10, unit:"camps"},
    {type:"Helicopters",    deployed:4,  total:6,  unit:"units"},
  ];
  var decisionLog=[
    {id:"DEC-0022",decision:"Evacuate 3 coastal villages - 12,000 residents", by:"DM Ratnagiri", time:"8 min ago",  status:"executed"},
    {id:"DEC-0021",decision:"Deploy 4 additional NDRF teams to Konkan",       by:"SEOC Director", time:"22 min ago", status:"executed"},
    {id:"DEC-0020",decision:"Activate State Emergency Operations Center",      by:"Chief Secretary",time:"1 hr ago",  status:"executed"},
    {id:"DEC-0019",decision:"Request central assistance - NDMA",               by:"CM Office",     time:"2 hr ago",  status:"pending"},
  ];

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,padding:"16px 20px 24px",overflowY:"auto"}}>
      {/* Summary strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <MetricCard t={t} label="Active Events"       value="2"    icon={AlertTriangle} note="2 critical" color={DS.status.critical}/>
        <MetricCard t={t} label="People Affected"     value="18,400" icon={Users}        note="Konkan + Sangli"/>
        <MetricCard t={t} label="Teams Deployed"      value="8/12" icon={ShieldCheck}   note="NDRF on ground" color={DS.status.warning}/>
        <MetricCard t={t} label="Decisions Pending"   value="1"    icon={ClipboardCheck}note="Awaiting CM Office" color={DS.status.warning}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {/* Active events */}
        <div>
          <SectionHeader t={t} title="Active events" sub="Ordered by severity"/>
          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
            {govEvents.map(function(ev){
              return(
                <div key={ev.id} style={{padding:"10px 12px",borderRadius:DS.radius.md,border:"1px solid "+(ev.severity==="critical"?DS.status.critical+"44":t.border),background:ev.severity==="critical"?DS.status.critical+"07":t.surface}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <StatusDot s={ev.severity} pulse={ev.severity==="critical"}/>
                    <span style={{fontSize:9.5,fontFamily:DS.font.mono,color:t.textMuted,flex:1}}>{ev.id} - {ev.age}</span>
                    <StatusBadge status={ev.status}/>
                  </div>
                  <div style={{fontSize:12.5,fontWeight:600,marginBottom:3}}>{ev.title}</div>
                  <div style={{fontSize:10,fontFamily:DS.font.mono,color:t.textMuted}}>Phase: {ev.phase}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resource deployment */}
        <div>
          <SectionHeader t={t} title="Resource deployment" sub="Current deployed vs available"/>
          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
            {resources.map(function(res){
              var pct=Math.round((res.deployed/res.total)*100);
              var c=pct>80?DS.status.critical:pct>60?DS.status.warning:DS.status.healthy;
              return(
                <Card key={res.type} t={t} p={12}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:12,fontWeight:600}}>{res.type}</span>
                    <span style={{fontFamily:DS.font.mono,fontSize:12,fontWeight:700,color:c}}>{res.deployed}/{res.total} {res.unit}</span>
                  </div>
                  <MiniProgress val={pct} t={t} color={c}/>
                  <div style={{fontSize:10,color:t.textMuted,marginTop:4}}>{pct}% utilization</div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Decision log */}
      <SectionHeader t={t} title="Decision log" sub="All commands issued with actor and timestamp - immutable audit"/>
      <Card t={t} p={0}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead>
            <tr style={{borderBottom:"1px solid "+t.border}}>
              {["Decision ID","Decision","Issued by","Time","Status"].map(function(h){return <th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:10,fontWeight:600,color:t.textMuted,fontFamily:DS.font.mono}}>{h.toUpperCase()}</th>;})}
            </tr>
          </thead>
          <tbody>
            {decisionLog.map(function(d,i){
              return(
                <tr key={i} style={{borderBottom:"1px solid "+t.border}}
                  onMouseEnter={function(e){e.currentTarget.style.background=t.surfaceHover;}}
                  onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}>
                  <td style={{padding:"9px 12px",fontFamily:DS.font.mono,color:t.textMuted,fontSize:10}}>{d.id}</td>
                  <td style={{padding:"9px 12px",fontWeight:500}}>{d.decision}</td>
                  <td style={{padding:"9px 12px",color:t.textSub}}>{d.by}</td>
                  <td style={{padding:"9px 12px",fontFamily:DS.font.mono,color:t.textMuted}}>{d.time}</td>
                  <td style={{padding:"9px 12px"}}><StatusBadge status={d.status}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 15. AUDIT LOG TABLE
// ─────────────────────────────────────────────────────────────
function AuditLogTable(){
  var t=useTheme().t;
  var auditLog=useAudit().auditLog;
  var cols=["Command","Target","Status","Actor","Time"];
  return(
    <Card t={t} p={0}>
      <div style={{display:"flex",alignItems:"center",padding:"10px 12px",borderBottom:"1px solid "+t.border}}>
        <History size={13} color={t.textSub} style={{marginRight:5}}/>
        <span style={{fontSize:12,fontWeight:600}}>Audit log</span>
        <span style={{marginLeft:7,fontSize:10.5,color:t.textMuted}}>({auditLog.length} entries)</span>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr style={{borderBottom:"1px solid "+t.border}}>
              {cols.map(function(h){return <th key={h} style={{textAlign:"left",padding:"7px 12px",fontSize:10,fontWeight:600,color:t.textMuted,fontFamily:DS.font.mono,letterSpacing:"0.04em"}}>{h.toUpperCase()}</th>;}) }
            </tr>
          </thead>
          <tbody>
            {auditLog.slice(0,8).map(function(e,i){
              return(
                <tr key={i} style={{borderBottom:"1px solid "+t.border}}
                  onMouseEnter={function(ev){ev.currentTarget.style.background=t.surfaceHover;}}
                  onMouseLeave={function(ev){ev.currentTarget.style.background="transparent";}}>
                  <td style={{padding:"8px 12px",fontWeight:500}}>{e.cmd}</td>
                  <td style={{padding:"8px 12px",fontFamily:DS.font.mono,color:t.textSub}}>{e.target}</td>
                  <td style={{padding:"8px 12px"}}><StatusIcon s={e.status} withLabel/></td>
                  <td style={{padding:"8px 12px",color:t.textSub}}>{e.actor}</td>
                  <td style={{padding:"8px 12px",fontFamily:DS.font.mono,color:t.textMuted}}>{e.time}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// 16. ROOT APP
// ─────────────────────────────────────────────────────────────
export default function BHIVDashboardKit(){
  var themeState=useState("dark"); var theme=themeState[0]; var setTheme=themeState[1];
  var dashState=useState("executive"); var activeDash=dashState[0]; var setActiveDash=dashState[1];
  var logState=useState(MOCK.commandHistory); var auditLog=logState[0]; var setAuditLog=logState[1];
  var panelState=useState(false); var panelOpen=panelState[0]; var setPanelOpen=panelState[1];
  var notifState=useState([
    {id:1,text:"Payment Service critical - P99 breach",       severity:"critical",read:false,time:"6 min ago"},
    {id:2,text:"Microservices mesh warning elevated",          severity:"warning", read:false,time:"42 min ago"},
    {id:3,text:"v4.1.9 deployed to production",               severity:"info",    read:true, time:"1 hr ago"},
    {id:4,text:"Approval pending: APR-0101",                  severity:"info",    read:false,time:"18 min ago"},
  ]);
  var notifs=notifState[0]; var setNotifs=notifState[1];

  var t=DS.color[theme];
  useGlobalCss(t);

  useEffect(function(){
    if(!document.getElementById("bhiv-fonts")){
      var l=document.createElement("link");
      l.id="bhiv-fonts";l.rel="stylesheet";
      l.href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
  },[]);

  var addAudit=useCallback(function(entry){
    setAuditLog(function(prev){
      return [{id:"AUD-"+Date.now(),cmd:entry.label,target:String((entry.target&&entry.target.id)||entry.target||"-"),status:entry.status,actor:"Raghav S.",time:"just now"}].concat(prev);
    });
  },[]);

  var addNotif=useCallback(function(n){
    setNotifs(function(p){return [Object.assign({id:Date.now(),read:false,time:"just now"},n)].concat(p);});
  },[]);

  var markRead=useCallback(function(id){
    setNotifs(function(p){return p.map(function(n){return n.id===id?Object.assign({},n,{read:true}):n;});});
  },[]);

  return(
    <ThemeCtx.Provider value={{theme:theme,t:t,setTheme:setTheme}}>
    <AuditCtx.Provider value={{auditLog:auditLog,addAudit:addAudit}}>
    <PanelCtx.Provider value={{panelOpen:panelOpen,setPanelOpen:setPanelOpen}}>
    <NotifCtx.Provider value={{notifs:notifs,addNotif:addNotif,markRead:markRead}}>
      <div style={{fontFamily:DS.font.body,background:t.bg,color:t.text,minHeight:"100vh",display:"flex",transition:"background .22s,color .22s"}}>
        <Sidebar activeDash={activeDash} setActiveDash={setActiveDash}/>
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
          <Topbar activeDash={activeDash}/>
          <div style={{flex:1,overflowY:"auto"}}>
            {activeDash==="executive"   && <ExecutiveDashboard/>}
            {activeDash==="operations"  && <OperationsDashboard/>}
            {activeDash==="engineering" && <EngineeringDashboard/>}
            {activeDash==="soc"         && <SOCDashboard/>}
            {activeDash==="finance"     && <FinanceDashboard/>}
            {activeDash==="analytics"   && <AnalyticsDashboard/>}
            {activeDash==="government"  && <GovernmentDashboard/>}
            {activeDash==="bucket" && <BucketWidget />}
            {activeDash==="runtime" && <RuntimeServicesWidget />}
          </div>
        </div>
        {panelOpen&&<CommandPanel/>}
      </div>
    </NotifCtx.Provider>
    </PanelCtx.Provider>
    </AuditCtx.Provider>
    </ThemeCtx.Provider>
  );
}
