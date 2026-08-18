import { z } from "zod";

export type ToolRisk = "low"|"medium"|"high";
export interface ToolContext { userId:string; taskId:string; signal:AbortSignal }
export interface Tool<I=unknown,O=unknown> { name:string; description:string; inputSchema:z.ZodType<I>; risk:ToolRisk; timeoutMs:number; maxRetries:number; execute(input:I, context:ToolContext):Promise<O> }
export class ToolRegistry {
  private tools = new Map<string,Tool>();
  register(tool:Tool){ if(this.tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`); this.tools.set(tool.name,tool); return this; }
  get(name:string){ const tool=this.tools.get(name); if(!tool) throw new Error(`Unknown tool: ${name}`); return tool; }
  list(){ return [...this.tools.values()].map(({name,description,risk})=>({name,description,risk})); }
}
export interface ProviderMessage { role:"system"|"user"|"assistant"|"tool"; content:string }
export interface ProviderRequest { messages:ProviderMessage[]; model?:string; tools?:Array<{name:string;description:string;inputSchema:unknown}>; signal?:AbortSignal }
export interface ProviderChunk { type:"text"|"tool_call"|"usage"; text?:string; name?:string; arguments?:unknown; usage?:{input:number;output:number} }
export interface ModelProvider { readonly id:string; stream(request:ProviderRequest):AsyncIterable<ProviderChunk>; healthCheck():Promise<boolean> }
export interface RuntimeLimits { maxIterations:number; maxDurationMs:number; maxToolCalls:number }
export const DEFAULT_LIMITS:RuntimeLimits={maxIterations:12,maxDurationMs:15*60_000,maxToolCalls:20};
export class ArenaProvider implements ModelProvider {
  readonly id="arena";
  constructor(private config:{apiKey:string;baseUrl:string;model:string}) { if(!config.baseUrl) throw new Error("ARENA_BASE_URL is required; ABHI does not assume undocumented endpoints."); }
  async *stream(_request:ProviderRequest):AsyncIterable<ProviderChunk>{ throw new Error("Arena transport adapter awaits official API schema/configuration. No endpoint has been invented."); }
  async healthCheck(){ return false; }
}
export class DemoProvider implements ModelProvider {
  readonly id="demo";
  async *stream(request:ProviderRequest){ const text=`I’ve completed a safe simulated pass for: “${request.messages.at(-1)?.content ?? "your task"}”. Connect a documented model provider to run this with live sources and tools.`; for(const part of text.split(/(?<=\s)/)){ yield {type:"text" as const,text:part}; await new Promise(r=>setTimeout(r,8)); } }
  async healthCheck(){return true}
}
