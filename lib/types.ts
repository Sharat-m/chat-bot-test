export interface FlightSummary {
  tripType: string;
  airline: string;
  duration: string;
  from: string;
  to: string;
  price: string;
  departureTime: string;
  arrivalTime: string;
  stops: string;
  stopCount: number;
  layover?: string;
  priceRaw: number;
  deeplink: string[];
  layovers: string[];
}

export interface SearchResponse {
  sessionToken?: string;
  refreshSessionToken?: string;
  status?: string;
  content?: any;
  action?: any;
  [key: string]: any;
}

export interface DateObj {
  year: number;
  month: number;
  day: number;
}

// Hardcoded URLs for now
export const BASE_URL = "https://super.staging.net.in/api/v1/ss/v3/flights";
export const IS_LIVE = true;
export const BOOKING_URL = "https://farefirst.com";
export const RESULTS_URL = "https://farefirst.com/flight-results/";

// MCP Specific Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  _meta?: {
    ui?: {
      resourceUri: string;
    };
    "openai/outputTemplate"?: string;
  };
}

export interface MCPRequest {
  method: string;
  params: {
    name?: string;
    arguments?: any;
    _meta?: any;
  };
  id?: string | number;
}

export interface MCPResponse {
  content: Array<{
    type: string;
    text?: string;
  }>;
  structuredContent?: any;
  _meta?: {
    ui?: {
      resourceUri: string;
    };
  };
}