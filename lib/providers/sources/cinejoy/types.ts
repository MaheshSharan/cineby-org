export interface WingServer {
  name: string;
  status: string;
  language: string;
  description: string;
  "4k": boolean;
}

export interface WingServersResponse {
  servers: WingServer[];
}

export interface WingCaption {
  type: string;
  id: string;
  url: string;
  language: string;
}

export interface WingStreamItem {
  type: string;
  id: string;
  playlist: string;
  captions?: WingCaption[];
}

export interface WingDecryptedData {
  stream?: WingStreamItem[];
  [key: string]: unknown;
}

export interface WingDecryptedResponse {
  status: number | string;
  data?: WingDecryptedData;
  error?: string;
}
