import { GoogleGenAI, Type } from "@google/genai";
import { ChipArchitecture } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateArchitecture(prompt: string, constraints: any): Promise<ChipArchitecture> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Design a semiconductor architecture based on this request: "${prompt}". 
    Constraints: ${JSON.stringify(constraints)}.
    Provide a structured JSON response. 
    Include a "benchmarks" array with at least 4 metrics (Compute Density, Thermal Efficiency, Signal Integrity, IO Bandwidth) with scores and status (OPTIMAL, WARNING, CRITICAL).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          processNode: { type: Type.STRING },
          estimatedYield: { type: Type.NUMBER },
          totalPower: { type: Type.NUMBER },
          totalArea: { type: Type.NUMBER },
          blocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['cpu', 'memory', 'io', 'power', 'rf', 'analog'] },
                powerConsumption: { type: Type.NUMBER },
                area: { type: Type.NUMBER },
                connections: { type: Type.ARRAY, items: { type: Type.STRING } },
                x: { type: Type.NUMBER, description: "0-100 relative x coordinate for floorplan" },
                y: { type: Type.NUMBER, description: "0-100 relative y coordinate for floorplan" },
                width: { type: Type.NUMBER, description: "0-100 relative width for floorplan" },
                height: { type: Type.NUMBER, description: "0-100 relative height for floorplan" }
              },
              required: ['id', 'name', 'type', 'powerConsumption', 'area', 'connections', 'x', 'y', 'width', 'height']
            }
          },
          benchmarks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                score: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['OPTIMAL', 'WARNING', 'CRITICAL'] }
              },
              required: ['name', 'score', 'unit', 'status']
            }
          }
        },
        required: ['name', 'processNode', 'estimatedYield', 'totalPower', 'totalArea', 'blocks', 'benchmarks']
      }
    }
  });

  return JSON.parse(response.text);
}

export async function updateArchitecture(currentArch: ChipArchitecture, command: string): Promise<ChipArchitecture> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Modify this semiconductor architecture: ${JSON.stringify(currentArch)}. 
    Command: "${command}".
    Return the full updated architecture as JSON.
    Recalculate the "benchmarks" array based on the changes.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          processNode: { type: Type.STRING },
          estimatedYield: { type: Type.NUMBER },
          totalPower: { type: Type.NUMBER },
          totalArea: { type: Type.NUMBER },
          blocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['cpu', 'memory', 'io', 'power', 'rf', 'analog'] },
                powerConsumption: { type: Type.NUMBER },
                area: { type: Type.NUMBER },
                connections: { type: Type.ARRAY, items: { type: Type.STRING } },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                width: { type: Type.NUMBER },
                height: { type: Type.NUMBER }
              },
              required: ['id', 'name', 'type', 'powerConsumption', 'area', 'connections', 'x', 'y', 'width', 'height']
            }
          },
          benchmarks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                score: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['OPTIMAL', 'WARNING', 'CRITICAL'] }
              },
              required: ['name', 'score', 'unit', 'status']
            }
          }
        },
        required: ['name', 'processNode', 'estimatedYield', 'totalPower', 'totalArea', 'blocks', 'benchmarks']
      }
    }
  });

  return JSON.parse(response.text);
}

export async function getBOM(architecture: ChipArchitecture): Promise<any> {
    // Simulated Digi-Key API logic via AI
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a Bill of Materials for this chip architecture: ${JSON.stringify(architecture)}. Include realistic part numbers and costs.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        partNumber: { type: Type.STRING },
                        description: { type: Type.STRING },
                        quantity: { type: Type.INTEGER },
                        unitPrice: { type: Type.NUMBER },
                        availability: { type: Type.STRING, enum: ['In Stock', 'Limited', 'Backorder'] },
                        leadTime: { type: Type.STRING }
                    },
                    required: ['id', 'partNumber', 'description', 'quantity', 'unitPrice', 'availability', 'leadTime']
                }
            }
        }
    });
    return JSON.parse(response.text);
}
