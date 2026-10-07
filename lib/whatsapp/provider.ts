export type WhatsAppSendInput={to:string;message:string};
export interface WhatsAppProvider{
  sendMessage(input:WhatsAppSendInput,instanceId:string):Promise<{success:boolean;messageId?:string}>;
  getStatus(instanceId:string):Promise<any>;
  getQr(instanceId:string):Promise<any>;
  createInstance(instanceId:string):Promise<any>;
  deleteInstance(instanceId:string):Promise<any>;
  configureWebhook(instanceId:string,url:string):Promise<any>;
}

function jid(phone:string){const digits=phone.replace(/\D/g,"");return digits.endsWith("@s.whatsapp.net")?digits:`${digits}@s.whatsapp.net`;}

export class PapiProvider implements WhatsAppProvider{
  constructor(private baseUrl=process.env.PAPI_BASE_URL||"https://api.papi.api.br",private apiKey=process.env.PAPI_API_KEY||""){}
  private async request(path:string,init:RequestInit={}){
    if(!this.apiKey)throw new Error("PAPI_API_KEY não configurada no servidor.");
    const r=await fetch(this.baseUrl.replace(/\/$/,"")+path,{...init,headers:{"Content-Type":"application/json","x-api-key":this.apiKey,...(init.headers||{})},cache:"no-store"});
    const body=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(body?.error||body?.message||`PAPI retornou HTTP ${r.status}`);
    return body;
  }
  async createInstance(instanceId:string){return this.request("/api/instances",{method:"POST",body:JSON.stringify({id:instanceId})});}
  async getQr(instanceId:string){return this.request(`/api/instances/${encodeURIComponent(instanceId)}/qr`);}
  async getStatus(instanceId:string){return this.request(`/api/instances/${encodeURIComponent(instanceId)}/status`);}
  async deleteInstance(instanceId:string){return this.request(`/api/instances/${encodeURIComponent(instanceId)}`,{method:"DELETE"});}
  async configureWebhook(instanceId:string,url:string){
    return this.request(`/api/instances/${encodeURIComponent(instanceId)}/webhook`,{
      method:"POST",
      body:JSON.stringify({url,enabled:true,events:["messages","status"]})
    });
  }
  async sendMessage(input:WhatsAppSendInput,instanceId:string){
    const d=await this.request(`/api/instances/${encodeURIComponent(instanceId)}/send-text`,{method:"POST",body:JSON.stringify({jid:jid(input.to),text:input.message})});
    return{success:true,messageId:d?.id||d?.messageId||d?.key?.id};
  }
}