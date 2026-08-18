import type {Task,AgentEvent,ChatMessage} from "@abhi/types";
export class Store { tasks=new Map<string,Task>(); messages:ChatMessage[]=[]; events:AgentEvent[]=[]; listeners=new Set<(e:AgentEvent)=>void>();
 emit(type:string,payload:Record<string,unknown>,taskId?:string){const e={id:crypto.randomUUID(),type,taskId,at:new Date().toISOString(),payload};this.events.push(e); if(this.events.length>500)this.events.shift(); for(const l of this.listeners)l(e);return e}
 updateTask(id:string,patch:Partial<Task>){const old=this.tasks.get(id);if(!old)return;const next={...old,...patch,updatedAt:new Date().toISOString()};this.tasks.set(id,next);this.emit("task.updated",{task:next},id);return next}
}
export const store=new Store();
