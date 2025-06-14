export interface ServerData {
  id: string;
  name: string;
  status: string;
  pid: number | null;
}

export interface PortData {
  serverName: string;
  ports: string;
  protocol: string;
  notes: string;
  enabled: boolean;
} 