import { GoogleGenAI, Type } from "@google/genai";
import type { Point, Route, TransportationMode, CreativityLevel } from '../types';
import { analyzeShape, ShapeFeatures } from './shapeAnalysisService';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const routeSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      routeName: {
        type: Type.STRING,
        description: 'A functional name describing the route, e.g., "Parkside Square Loop," "Coastal Zig-Zag Path."',
      },
      description: {
        type: Type.STRING,
        description: 'A brief, engaging description of the route, mentioning key streets or landmarks.',
      },
      distance: {
        type: Type.NUMBER,
        description: 'The total distance of the route in kilometers.',
      },
      duration: {
        type: Type.NUMBER,
        description: 'The estimated time to complete the route in minutes for the specified transportation mode.',
      },
      similarityScore: {
        type: Type.NUMBER,
        description: 'A score from 0.0 to 1.0 indicating how well the route thematically and geometrically matches the drawn shape. 1.0 is a perfect match.',
      },
      path: {
        type: Type.ARRAY,
        description: "An array of geographic coordinates representing the route path. When plotted, this path should geometrically match the user's drawing.",
        items: {
          type: Type.ARRAY,
          description: "A coordinate pair: [latitude, longitude].",
          items: {
             type: Type.NUMBER
          }
        },
      },
    },
    required: ["routeName", "description", "distance", "duration", "similarityScore", "path"],
  },
};

function generatePrompt(features: ShapeFeatures, location: string, mode: TransportationMode, creativity: CreativityLevel): string {
    const straightnessDesc = features.straightness > 0.7 ? 'very straight' : features.straightness > 0.4 ? 'moderately straight' : 'winding and indirect';
    
    const analysisBlock = `
**USER DRAWING ANALYSIS (NORMALIZED):**
- **Shape Type:** ${features.isClosed ? 'Closed Loop' : 'Open Path'}
- **Aspect Ratio:** ${features.aspectRatio.toFixed(2)}
- **Complexity:** ${features.complexity.toFixed(2)} (0=simple, 1=complex)
- **Straightness:** ${straightnessDesc} (${(features.straightness * 100).toFixed(0)}%)
- **Key Features:** ${features.sharpTurns} sharp turns (<90°), ${features.corners.length} total corners (<135°)
- **Curvature:** ${features.averageRadius === Infinity ? 'Composed of straight lines' : `Average curve radius of ${features.averageRadius.toFixed(2)} units`}
- **SVG-like Path Data:** "${features.normalizedPath}"
`;

    let instructions = '';
    switch (creativity) {
        case 'creative':
            const creativeSummary = `
**USER DRAWING ANALYSIS (ARTIST'S INTERPRETATION):**
- **Overall Form:** The user drew a shape that is ${features.isClosed ? 'a closed loop.' : 'an open path.'}
- **Dominant Feel:** It feels ${features.sharpTurns > 3 ? 'very angular and sharp' : features.corners.length > features.totalLength * 0.5 ? 'angular' : 'smooth and curvy'}.
- **Path Character:** The path is generally ${straightnessDesc}.
- **Impression:** It has ${features.complexity > 0.6 ? 'high complexity with many details.' : 'a simple, clean form.'}`;

            instructions = `
You are an expert and artistic "Geospatial Shape Interpreter". Your task is to find real-world routes in "${location}" for "${mode}" that capture the *artistic spirit and overall form* of a user's drawing.

${creativeSummary}

**CREATIVE INSTRUCTIONS:**
1.  **Primary Goal:** Find a real-world route that *feels* like the drawing. This is an artistic and interpretive task. For example, if the user draws a heart, find a plausible heart-shaped route, even if it's not a perfect geometric match.
2.  **Thematic Matching:** Prioritize the overall shape and concept over a literal, point-for-point match. The sequence of turns and general proportions are more important than exact segment lengths or angles.
3.  **Plausibility:** The route must exist within "${location}", be plausible for ${mode}, and use actual streets, paths, or trails.
4.  **Similarity Score:** Your generated \`similarityScore\` must reflect how well the route captures the *essence* of the shape. A score of 0.75 or higher is desirable. If you cannot find a good thematic match, return an empty array.
5.  **Output Format:** Respond with ONLY a valid JSON array of route objects.
`;
            break;
        case 'balanced':
            instructions = `
You are an expert "Geospatial Shape Matching AI". Your task is to find real-world routes in "${location}" for "${mode}" that have a strong geometric similarity to a user's drawing.

${analysisBlock}

**BALANCED INSTRUCTIONS:**
1.  **Primary Goal:** Find a real-world route whose path has a strong geometric resemblance to the user's drawing.
2.  **Geometric Fidelity:** The route should closely follow the general shape, aspect ratio, and sequence of turns from the drawing and SVG path data. Some minor deviations are acceptable.
3.  **Location Context:** The route must exist within "${location}" and be plausible for ${mode}.
4.  **Similarity Score:** Your generated \`similarityScore\` must be an honest assessment of the geometric match. A score of 0.85 or higher is desirable. If you cannot find a route with a score of at least 0.7, return an empty array.
5.  **Output Format:** Respond with ONLY a valid JSON array of route objects.
`;
            break;
        case 'strict':
        default:
            instructions = `
You are a precision "Geospatial Shape Matching AI". Your task is to find real-world routes in "${location}" for "${mode}" that are a near-perfect geometric match to a user's drawing. Precision is paramount.

${analysisBlock}

**STRICT INSTRUCTIONS:**
1.  **Primary Goal:** Find a real-world route whose path, when plotted on a map, is geometrically identical to the user's drawing.
2.  **Geometric Fidelity:** The sequence of turns, the length of straight segments, and the curvature of bends in the route must precisely mirror the provided SVG-like path data. The aspect ratio must be preserved.
3.  **Location Context:** The route must exist within "${location}" and be plausible for ${mode}.
4.  **Similarity Score:** Your generated \`similarityScore\` must be an honest, critical assessment of the geometric match. A score of 0.95 or higher is required for an acceptable match. If you cannot find a route with a score of at least 0.8, return an empty array.
5.  **Output Format:** Respond with ONLY a valid JSON array of route objects.
`;
            break;
    }
    return instructions + "\nFind up to 3 routes that meet these criteria.";
}


export const findMatchingRoutes = async (
  drawing: Point[][],
  location: string,
  mode: TransportationMode,
  creativity: CreativityLevel
): Promise<Route[]> => {
  const features = analyzeShape(drawing);

  if (!features) {
    console.warn("Shape analysis returned null. The drawing may be too simple.");
    return [];
  }

  const prompt = generatePrompt(features, location, mode, creativity);
  
  const modelConfig = {
      'strict':   { temperature: 0.1, topP: 0.95, topK: 40 },
      'balanced': { temperature: 0.4, topP: 0.95, topK: 64 },
      'creative': { temperature: 0.8, topP: 1.0,  topK: 64 },
  }[creativity];


  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: routeSchema,
            ...modelConfig,
        },
    });

    const text = response.text;

    if (!text) {
        console.error("Gemini API response did not contain text.", JSON.stringify(response, null, 2));
        
        const finishReason = response?.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== 'STOP') {
            throw new Error(`Route generation failed. Reason: ${finishReason}. Please try a different shape or location.`);
        }
        
        throw new Error("The AI returned an empty response. Please try drawing a different shape.");
    }

    const jsonString = text.trim();
    const routes = JSON.parse(jsonString) as Route[];
    
    // Basic validation
    if (!Array.isArray(routes)) {
        console.error("Gemini response is not an array:", routes);
        return [];
    }
    
    return routes.filter(route => route.path && route.path.length > 1);

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof SyntaxError) {
        throw new Error("The AI returned a response in an invalid format. Please try again.");
    }
    if (error instanceof Error) {
        throw new Error(error.message); // Pass the specific error message to the UI
    }
    throw new Error("An unknown error occurred while generating routes from the AI.");
  }
};