// import { NextRequest, NextResponse } from "next/server";
// import {
//   fetchFlights,
//   resolveAirportWithLogic,
//   AirportSuggestion,
//   FlightSearchResult,
// } from "../../../lib/flightApi";
// import { formatFlightsAsMarkdown, sortFlights } from "../../../lib/flightUtils";
// import { RESULTS_URL } from "../../../lib/types";
// import { promises as fs } from 'fs';
// import path from 'path';

// interface CacheEntry {
//   key: string;
//   result: FlightSearchResult;
//   markdown: string;
//   structuredData: any;
// }

// interface PendingSession {
//   from: string;
//   to: string;
//   date: string;
//   adults: number;
//   children: number;
//   cabinClass: string;
//   userCountry: string;
//   fromCandidates: AirportSuggestion[] | null;
//   toCandidates: AirportSuggestion[] | null;
//   resolvedFromEntityId?: string;
//   resolvedFromIata?: string;
//   resolvedToEntityId?: string;
//   resolvedToIata?: string;
// }

// let searchCache: CacheEntry | null = null;
// let pendingSession: PendingSession | null = null;

// function makeCacheKey(
//   from: string,
//   to: string,
//   isoDate: string,
//   adults: number,
//   children: number,
//   cabinClass: string,
//   userCountry: string,
// ): string {
//   return [
//     from,
//     to,
//     isoDate,
//     String(adults),
//     String(children),
//     cabinClass,
//     userCountry,
//   ]
//     .join("|")
//     .toUpperCase();
// }

// function mcpResponse(id: string | number | null, result: unknown) {
//   return NextResponse.json({ jsonrpc: "2.0", id, result });
// }

// function formatReadable(iso: string): string {
//   const [y, m, d] = iso.split("-").map(Number);
//   return new Date(y, m - 1, d).toLocaleDateString("en-US", {
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//   });
// }

// function matchFromCandidates(
//   input: string,
//   candidates: AirportSuggestion[],
// ): AirportSuggestion | null {
//   const q = input.trim().toUpperCase();
//   return (
//     candidates.find(
//       (c) =>
//         c.iataCode.toUpperCase() === q ||
//         c.name.toUpperCase() === q ||
//         c.name.toUpperCase().includes(q),
//     ) ?? null
//   );
// }

// function buildAmbiguousBlock(
//   label: string,
//   term: string,
//   airports: AirportSuggestion[],
// ): string {
//   const lines = airports
//     .map((a) => `• ${a.name} (${a.iataCode}) — ${a.cityName}, ${a.countryName}`)
//     .join("\n");
//   return `There are multiple ${label} airports for "${term}" \n${lines}`;
// }

// // Get base URL for widgets
// function getBaseUrl(req: NextRequest): string {
//   const url = new URL(req.url);
//   return `${url.protocol}//${url.host}`;
// }

// // Serve widget HTML
// export async function GET(req: NextRequest) {
//   const url = new URL(req.url);
  
//   // Serve flight cards widget
//   if (url.pathname === '/api/mcp/widgets/flight-cards') {
//     try {
//       const widgetPath = path.join(process.cwd(), 'public/flight-cards.html');
//       const widgetHtml = await fs.readFile(widgetPath, 'utf-8');
      
//       return new Response(widgetHtml, {
//         headers: {
//           'Content-Type': 'text/html+skybridge', // Critical for ChatGPT widgets
//           'Cache-Control': 'public, max-age=3600',
//           'Access-Control-Allow-Origin': '*',
//         },
//       });
//     } catch (error) {
//       console.error('Error serving widget:', error);
//       return new Response('Widget not found', { status: 404 });
//     }
//   }

//   // Health check endpoint
//   if (url.pathname === '/api/mcp/health') {
//     return new Response(JSON.stringify({ status: 'ok' }), {
//       headers: { 'Content-Type': 'application/json' },
//     });
//   }
  
//   return new Response('Not found', { status: 404 });
// }

// // Handle OPTIONS for CORS
// export async function OPTIONS(req: NextRequest) {
//   return new Response(null, {
//     headers: {
//       'Access-Control-Allow-Origin': '*',
//       'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
//       'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//     },
//   });
// }

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { method, id, params } = body;

//     const userCountry = params?.arguments?.userCountry ?? "US";
//     const baseUrl = getBaseUrl(req);
//     const widgetUrl = `${baseUrl}/api/mcp/widgets/flight-cards`;

//     if (method === "initialize") {
//       return mcpResponse(id, {
//         protocolVersion: "2024-11-05",
//         capabilities: { tools: {} },
//         serverInfo: { name: "FareFirst Flights", version: "2.0.0" },
//       });
//     }

//     if (method === "notifications/initialized") {
//       return new Response(null, { status: 204 });
//     }

//     if (method === "tools/list") {
//       return mcpResponse(id, {
//         tools: [
//           {
//             name: "search_flights",
//             description: "Search for one-way flights between two cities. Returns beautiful cards with flight details, prices, and booking links.",
//             annotations: {
//               readOnlyHint: true,
//               destructiveHint: false,
//               openWorldHint: true,
//             },
//             _meta: {
//               ui: {
//                 resourceUri: widgetUrl,
//               },
//               "openai/outputTemplate": widgetUrl,
//             },
//             inputSchema: {
//               type: "object",
//               required: ["from", "to", "date"],
//               properties: {
//                 from: {
//                   type: "string",
//                   description: "Origin city name or IATA code (e.g. 'New York' or 'JFK')",
//                 },
//                 to: {
//                   type: "string",
//                   description: "Destination city name or IATA code (e.g. 'London' or 'LHR')",
//                 },
//                 date: {
//                   type: "string",
//                   description: "Travel date in YYYY-MM-DD format",
//                 },
//                 adults: { type: "number", minimum: 1, maximum: 9, default: 1 },
//                 children: { type: "number", minimum: 0, maximum: 8, default: 0 },
//                 cabinClass: {
//                   type: "string",
//                   enum: [
//                     "CABIN_CLASS_ECONOMY",
//                     "CABIN_CLASS_PREMIUM_ECONOMY",
//                     "CABIN_CLASS_BUSINESS",
//                     "CABIN_CLASS_FIRST",
//                   ],
//                   default: "CABIN_CLASS_ECONOMY",
//                 },
//                 selectedFromIata: {
//                   type: "string",
//                   description: "IATA code chosen from ambiguous list",
//                 },
//                 selectedToIata: {
//                   type: "string",
//                   description: "IATA code chosen from ambiguous list",
//                 },
//               },
//             },
//           },
//         ],
//       });
//     }

//     if (method === "tools/call" && params?.name === "search_flights") {
//       const {
//         from,
//         to,
//         date,
//         adults = 1,
//         children = 0,
//         cabinClass = "CABIN_CLASS_ECONOMY",
//         selectedFromIata,
//         selectedToIata,
//       } = params.arguments ?? {};

//       if (!from || !to || !date) {
//         return mcpResponse(id, {
//           content: [
//             {
//               type: "text",
//               text: "Please provide origin, destination, and travel date.",
//             },
//           ],
//         });
//       }

//       // Simple airport resolution (simplified for now)
//       const fromInput = selectedFromIata ?? from;
//       const toInput = selectedToIata ?? to;

//       // For now, just use the IATA codes directly
//       return await runSearch({
//         id,
//         from: fromInput.toUpperCase(),
//         to: toInput.toUpperCase(),
//         date,
//         adults,
//         children,
//         cabinClass,
//         userCountry,
//         widgetUrl,
//       });
//     }

//     return mcpResponse(id, {
//       error: { code: -32601, message: "Method not found" },
//     });
//   } catch (error) {
//     console.error("MCP Server Error:", error);
//     return mcpResponse(null, {
//       error: {
//         code: -32603,
//         message: error instanceof Error ? error.message : "Internal server error",
//       },
//     });
//   }
// }

// async function runSearch({
//   id,
//   from,
//   to,
//   date,
//   adults,
//   children,
//   cabinClass,
//   userCountry,
//   widgetUrl,
// }: {
//   id: string | number | null;
//   from: string;
//   to: string;
//   date: string;
//   adults: number;
//   children: number;
//   cabinClass: string;
//   userCountry: string;
//   widgetUrl: string;
// }) {
//   const cacheKey = makeCacheKey(
//     from,
//     to,
//     date,
//     adults,
//     children,
//     cabinClass,
//     userCountry,
//   );

//   if (searchCache?.key === cacheKey) {
//     return mcpResponse(id, {
//       content: [{ type: "text", text: searchCache.markdown }],
//       structuredContent: searchCache.structuredData,
//       _meta: {
//         ui: {
//           resourceUri: widgetUrl,
//         },
//       },
//     });
//   }

//   const result: FlightSearchResult = await fetchFlights(
//     from,
//     to,
//     date,
//     adults,
//     children,
//     cabinClass,
//     undefined,
//     undefined,
//     userCountry,
//   );

//   const flights = sortFlights(result.flights);
//   const formattedDate = date.replace(/-/g, "");

//   if (flights.length === 0) {
//     const link = `${RESULTS_URL}${from}-${formattedDate}-${to}?adults=${adults}&children=${children}&ages=&cabin_class=Y&trip_type=oneway`;

//     return mcpResponse(id, {
//       content: [
//         {
//           type: "text",
//           text: `No flights found from ${from} to ${to} on ${date}.\n\n[Search on FareFirst](${link})`,
//         },
//       ],
//     });
//   }

//   const markdown = await formatFlightsAsMarkdown(
//     flights,
//     from,
//     to,
//     date,
//     undefined,
//     undefined,
//     adults,
//     children,
//     userCountry,
//   );

//   const structuredData = {
//     flights: flights.map(f => ({
//       ...f,
//       deeplink: Array.isArray(f.deeplink) ? f.deeplink : [f.deeplink].filter(Boolean)
//     })),
//     searchMetadata: {
//       from: { code: from },
//       to: { code: to },
//       date,
//       passengers: { adults, children },
//       cabinClass,
//       viewAllUrl: `${RESULTS_URL}${from}-${formattedDate}-${to}?adults=${adults}&children=${children}&ages=&cabin_class=Y&trip_type=oneway`
//     }
//   };

//   searchCache = { 
//     key: cacheKey, 
//     result, 
//     markdown,
//     structuredData 
//   };

//   return mcpResponse(id, {
//     content: [{ type: "text", text: markdown }],
//     structuredContent: structuredData,
//     _meta: {
//       ui: {
//         resourceUri: widgetUrl,
//       },
//     },
//   });
// }
import { NextRequest, NextResponse } from "next/server";
import {
  fetchFlights,
  resolveAirportWithLogic,
  AirportSuggestion,
  FlightSearchResult,
} from "../../../lib/flightApi";
import { formatFlightsAsMarkdown, sortFlights } from "../../../lib/flightUtils";
import { RESULTS_URL } from "../../../lib/types";
import { promises as fs } from 'fs';
import path from 'path';

interface CacheEntry {
  key: string;
  result: FlightSearchResult;
  markdown: string;
  structuredData: any;
}

interface PendingSession {
  from: string;
  to: string;
  date: string;
  adults: number;
  children: number;
  cabinClass: string;
  userCountry: string;
  fromCandidates: AirportSuggestion[] | null;
  toCandidates: AirportSuggestion[] | null;
  resolvedFromEntityId?: string;
  resolvedFromIata?: string;
  resolvedToEntityId?: string;
  resolvedToIata?: string;
}

let searchCache: CacheEntry | null = null;
let pendingSession: PendingSession | null = null;

function makeCacheKey(
  from: string,
  to: string,
  isoDate: string,
  adults: number,
  children: number,
  cabinClass: string,
  userCountry: string,
): string {
  return [
    from,
    to,
    isoDate,
    String(adults),
    String(children),
    cabinClass,
    userCountry,
  ]
    .join("|")
    .toUpperCase();
}

function mcpResponse(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function formatReadable(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function matchFromCandidates(
  input: string,
  candidates: AirportSuggestion[],
): AirportSuggestion | null {
  const q = input.trim().toUpperCase();
  return (
    candidates.find(
      (c) =>
        c.iataCode.toUpperCase() === q ||
        c.name.toUpperCase() === q ||
        c.name.toUpperCase().includes(q),
    ) ?? null
  );
}

function buildAmbiguousBlock(
  label: string,
  term: string,
  airports: AirportSuggestion[],
): string {
  const lines = airports
    .map((a) => `• ${a.name} (${a.iataCode}) — ${a.cityName}, ${a.countryName}`)
    .join("\n");
  return `There are multiple ${label} airports for "${term}" \n${lines}`;
}

// Get base URL for widgets
function getBaseUrl(req: NextRequest): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

// Serve widget HTML
// export async function GET(req: NextRequest) {
//   const url = new URL(req.url);
//   console.log("GET request to:", url.pathname); // Add logging
  
//   // Serve flight cards widget - try multiple possible locations
//   if (url.pathname === '/api/mcp/widgets/flight-cards' || url.pathname === '/widgets/flight-cards') {
//     try {
//       // Try multiple possible paths
//       const possiblePaths = [
//         path.join(process.cwd(), 'public', 'widgets', 'flight-cards.html'),
//         path.join(process.cwd(), 'public', 'flight-cards.html'),
//         path.join(process.cwd(), 'app', 'api', 'mcp', 'widgets', 'flight-cards.html'),
//       ];
      
//       let widgetHtml = null;
//       let usedPath = '';
      
//       for (const testPath of possiblePaths) {
//         console.log("Checking path:", testPath);
//         try {
//           await fs.access(testPath);
//           widgetHtml = await fs.readFile(testPath, 'utf-8');
//           usedPath = testPath;
//           console.log("Found widget at:", usedPath);
//           break;
//         } catch (e) {
//           // Path doesn't exist, try next
//         }
//       }
      
//       if (!widgetHtml) {
//         console.error("Widget not found in any location");
//         return new Response('Widget not found. Please ensure flight-cards.html exists in public/widgets/ or public/', { 
//           status: 404,
//           headers: {
//             'Content-Type': 'text/plain',
//           }
//         });
//       }
      
//       return new Response(widgetHtml, {
//         headers: {
//           'Content-Type': 'text/html+skybridge', // Critical for ChatGPT widgets
//           'Cache-Control': 'public, max-age=3600',
//           'Access-Control-Allow-Origin': '*',
//         },
//       });
//     } catch (error) {
//       console.error('Error serving widget:', error);
//       return new Response('Error serving widget: ' + (error instanceof Error ? error.message : String(error)), { 
//         status: 500,
//         headers: {
//           'Content-Type': 'text/plain',
//         }
//       });
//     }
//   }

//   // Health check endpoint
//   if (url.pathname === '/api/mcp/health' || url.pathname === '/health') {
//     return new Response(JSON.stringify({ 
//       status: 'ok',
//       timestamp: new Date().toISOString(),
//       paths: {
//         widget: '/api/mcp/widgets/flight-cards',
//         health: '/api/mcp/health',
//         mcp: '/api/mcp'
//       }
//     }), {
//       headers: { 
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*',
//       },
//     });
//   }
  
//   return new Response('Not found. Available endpoints: /api/mcp/health, /api/mcp/widgets/flight-cards', { 
//     status: 404,
//     headers: {
//       'Content-Type': 'text/plain',
//     }
//   });
// }

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  
  // Only keep health check
  if (url.pathname === '/api/mcp/health') {
    return new Response(JSON.stringify({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      endpoints: {
        mcp: '/api/mcp (POST)',
        widget: '/api/mcp/widgets/flight-cards',
        health: '/api/mcp/health'
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
  
  return new Response('Not found. Use POST for MCP requests.', { status: 404 });
}
// Handle OPTIONS for CORS
// Keep your POST and OPTIONS functions exactly as they were
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("MCP POST request:", JSON.stringify(body, null, 2));
    
    const { method, id, params } = body;

    const userCountry = params?.arguments?.userCountry ?? "US";
    const baseUrl = getBaseUrl(req);
    const widgetUrl = `${baseUrl}/api/mcp/widgets/flight-cards`;

    if (method === "initialize") {
      return mcpResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "FareFirst Flights", version: "2.0.0" },
      });
    }

    if (method === "notifications/initialized") {
      return new Response(null, { status: 204 });
    }

    if (method === "tools/list") {
      return mcpResponse(id, {
        tools: [
          {
            name: "search_flights",
            description: "Search for one-way flights between two cities. Returns beautiful cards with flight details, prices, and booking links.",
            annotations: {
              readOnlyHint: true,
              destructiveHint: false,
              openWorldHint: true,
            },
            _meta: {
              ui: {
                resourceUri: widgetUrl,
              },
              "openai/outputTemplate": widgetUrl,
            },
            inputSchema: {
              type: "object",
              required: ["from", "to", "date"],
              properties: {
                from: {
                  type: "string",
                  description: "Origin city name or IATA code (e.g. 'New York' or 'JFK')",
                },
                to: {
                  type: "string",
                  description: "Destination city name or IATA code (e.g. 'London' or 'LHR')",
                },
                date: {
                  type: "string",
                  description: "Travel date in YYYY-MM-DD format",
                },
                adults: { type: "number", minimum: 1, maximum: 9, default: 1 },
                children: { type: "number", minimum: 0, maximum: 8, default: 0 },
                cabinClass: {
                  type: "string",
                  enum: [
                    "CABIN_CLASS_ECONOMY",
                    "CABIN_CLASS_PREMIUM_ECONOMY",
                    "CABIN_CLASS_BUSINESS",
                    "CABIN_CLASS_FIRST",
                  ],
                  default: "CABIN_CLASS_ECONOMY",
                },
                selectedFromIata: {
                  type: "string",
                  description: "IATA code chosen from ambiguous list",
                },
                selectedToIata: {
                  type: "string",
                  description: "IATA code chosen from ambiguous list",
                },
              },
            },
          },
        ],
      });
    }

    if (method === "tools/call" && params?.name === "search_flights") {
      const {
        from,
        to,
        date,
        adults = 1,
        children = 0,
        cabinClass = "CABIN_CLASS_ECONOMY",
        selectedFromIata,
        selectedToIata,
      } = params.arguments ?? {};

      if (!from || !to || !date) {
        return mcpResponse(id, {
          content: [
            {
              type: "text",
              text: "Please provide origin, destination, and travel date.",
            },
          ],
        });
      }

      // Simple airport resolution (simplified for now)
      const fromInput = selectedFromIata ?? from;
      const toInput = selectedToIata ?? to;

      // For now, just use the IATA codes directly
      return await runSearch({
        id,
        from: fromInput.toUpperCase(),
        to: toInput.toUpperCase(),
        date,
        adults,
        children,
        cabinClass,
        userCountry,
        widgetUrl,
      });
    }

    return mcpResponse(id, {
      error: { code: -32601, message: "Method not found" },
    });
  } catch (error) {
    console.error("MCP Server Error:", error);
    return mcpResponse(null, {
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal server error",
      },
    });
  }
}

async function runSearch({
  id,
  from,
  to,
  date,
  adults,
  children,
  cabinClass,
  userCountry,
  widgetUrl,
}: {
  id: string | number | null;
  from: string;
  to: string;
  date: string;
  adults: number;
  children: number;
  cabinClass: string;
  userCountry: string;
  widgetUrl: string;
}) {
  const cacheKey = makeCacheKey(
    from,
    to,
    date,
    adults,
    children,
    cabinClass,
    userCountry,
  );

  if (searchCache?.key === cacheKey) {
    return mcpResponse(id, {
      content: [{ type: "text", text: searchCache.markdown }],
      structuredContent: searchCache.structuredData,
      _meta: {
        ui: {
          resourceUri: widgetUrl,
        },
      },
    });
  }

  const result: FlightSearchResult = await fetchFlights(
    from,
    to,
    date,
    adults,
    children,
    cabinClass,
    undefined,
    undefined,
    userCountry,
  );

  const flights = sortFlights(result.flights);
  const formattedDate = date.replace(/-/g, "");

  if (flights.length === 0) {
    const link = `${RESULTS_URL}${from}-${formattedDate}-${to}?adults=${adults}&children=${children}&ages=&cabin_class=Y&trip_type=oneway`;

    return mcpResponse(id, {
      content: [
        {
          type: "text",
          text: `No flights found from ${from} to ${to} on ${date}.\n\n[Search on FareFirst](${link})`,
        },
      ],
    });
  }

  const markdown = await formatFlightsAsMarkdown(
    flights,
    from,
    to,
    date,
    undefined,
    undefined,
    adults,
    children,
    userCountry,
  );

  const structuredData = {
    flights: flights.map(f => ({
      ...f,
      deeplink: Array.isArray(f.deeplink) ? f.deeplink : [f.deeplink].filter(Boolean)
    })),
    searchMetadata: {
      from: { code: from },
      to: { code: to },
      date,
      passengers: { adults, children },
      cabinClass,
      viewAllUrl: `${RESULTS_URL}${from}-${formattedDate}-${to}?adults=${adults}&children=${children}&ages=&cabin_class=Y&trip_type=oneway`
    }
  };

  searchCache = { 
    key: cacheKey, 
    result, 
    markdown,
    structuredData 
  };

  return mcpResponse(id, {
    content: [{ type: "text", text: markdown }],
    structuredContent: structuredData,
    _meta: {
      ui: {
        resourceUri: widgetUrl,
      },
    },
  });
}