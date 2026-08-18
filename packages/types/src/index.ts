export type AgentState = "IDLE"|"THINKING"|"WORKING"|"BROWSING"|"CODING"|"WAITING"|"COMPLETED"|"ERROR";
export type TaskStatus = "QUEUED"|"PLANNING"|"RUNNING"|"WAITING_FOR_APPROVAL"|"PAUSED"|"COMPLETED"|"FAILED"|"CANCELLED";
export interface TaskStep { id:string; title:string; status:"pending"|"active"|"done"|"failed"; safeSummary:string }
export interface Task { id:string; userId:string; title:string; description:string; status:TaskStatus; priority:"low"|"normal"|"high"; progress:number; currentActivity:string; steps:TaskStep[]; createdAt:string; updatedAt:string; result?:string; error?:string }
export interface AgentEvent { id:string; type:string; taskId?:string; at:string; payload:Record<string,unknown> }
export interface ChatMessage { id:string; role:"user"|"assistant"; content:string; createdAt:string; taskId?:string; simulated?:boolean }
export interface Approval { id:string; taskId:string; action:string; description:string; risk:"medium"|"high"; status:"pending"|"approved"|"denied" }
