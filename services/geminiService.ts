import { GoogleGenAI, Type } from "@google/genai";
import type { Point, Route, TransportationMode } from '../types';
import { analyzeShape, validateShape, serializeShapeForAI, validateRouteMatch, type ShapeFeatures } from './shapeAnalysis';

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
        description: 'A score from 0.0 to 1.0 indicating how well the route artistically and structurally evokes the drawn shape. 1.0 is a perfect representation.',
      },
      path: {
        type: Type.ARRAY,
        description: "An array of geographic coordinates representing the route path. When plotted, this path should artistically resemble the user's drawing.",
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

// Legacy function - now replaced by enhanced shape analysis
function serializeDrawing(drawing: Point[][]): string {
  return drawing.map(stroke => 
    stroke.map(p => `${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' ')
  ).join(' M '); // Using ' M ' as a separator for multi-stroke paths
}

export const findMatchingRoutes = async (
  drawing: Point[][],
  location: string,
  mode: TransportationMode
): Promise<Route[]> => {
  // Step 1: Validate the shape
  const validation = validateShape(drawing);
  if (!validation.isValid) {
    throw new Error(`Invalid shape: ${validation.issues.join(', ')}. ${validation.recommendations.join(' ')}`);
  }

  // Step 2: Analyze shape geometry
  let shapeFeatures: ShapeFeatures;
  try {
    shapeFeatures = analyzeShape(drawing);
  } catch (error) {
    throw new Error(`Shape analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Step 3: Create enhanced geometric description
  const geometricDescription = serializeShapeForAI(shapeFeatures);

  // Step 4: Generate targeted prompt based on shape characteristics
  const prompt = `
You are a "Precision Geospatial Route Matcher". Your mission is to find real-world routes that GEOMETRICALLY match the provided shape with mathematical precision, not just artistic similarity.

**CRITICAL REQUIREMENT:**
Find navigable routes in "${location}" for "${mode}" transportation that match the GEOMETRIC STRUCTURE of this shape:

${geometricDescription}

**MATCHING CRITERIA (in order of importance):**
1. **Geometric Structure**: The route must preserve the shape's key geometric properties:
   - Same general form (${shapeFeatures.isClosed ? 'closed loop' : 'open path'})
   - Similar aspect ratio (${shapeFeatures.aspectRatio.toFixed(2)})
   - Comparable corner count (${shapeFeatures.corners.length} corners)
   - Matching complexity level (${(shapeFeatures.complexity * 100).toFixed(0)}% complexity)

2. **Structural Matching**: Look for routes that when plotted would have:
   - Similar turning patterns
   - Comparable directional changes
   - Matching overall flow and rhythm

3. **Scale Independence**: The route can be any size but must maintain the proportional relationships

**SIMILARITY SCORING GUIDE:**
- **0.9-1.0**: Perfect geometric match - route structure precisely mirrors the shape
- **0.8-0.89**: Excellent match - clear geometric correspondence with minor deviations
- **0.7-0.79**: Good match - recognizable structure with some geometric differences
- **0.6-0.69**: Acceptable match - shares key structural elements
- **Below 0.6**: DO NOT RETURN - insufficient geometric similarity

**EXAMPLE ANALYSIS:**
If the shape is a circle: Find circular routes, roundabouts, or curved paths that form loops.
If the shape has sharp corners: Find routes with clear turns and angular segments.
If the shape is elongated: Find routes that maintain the same length-to-width proportions.

**OUTPUT REQUIREMENT:**
Return ONLY valid JSON array of route objects. Each route MUST have a path that geometrically corresponds to the input shape structure.
`;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: routeSchema,
            temperature: 0.4, // Lower temperature for more precise geometric matching
        },
    });

    const jsonString = response.text.trim();
    const routes = JSON.parse(jsonString) as Route[];
    
    // Enhanced validation
    if (!Array.isArray(routes)) {
        console.error("Gemini response is not an array:", routes);
        return [];
    }
    
    // Step 5: Validate and enhance each route with geometric analysis
    const validatedRoutes = routes
      .filter(route => route.path && route.path.length > 1)
      .map(route => {
        // Validate geometric similarity
        const validation = validateRouteMatch(route.path, shapeFeatures);
        
        return {
          ...route,
          geometricSimilarity: validation.geometricSimilarity,
          matchingIssues: validation.issues.length > 0 ? validation.issues : undefined
        };
      })
      // Sort by combined similarity (AI + geometric)
      .sort((a, b) => {
        const scoreA = (a.similarityScore + (a.geometricSimilarity || 0)) / 2;
        const scoreB = (b.similarityScore + (b.geometricSimilarity || 0)) / 2;
        return scoreB - scoreA;
      });

    // Step 6: Filter out routes with poor geometric similarity
    const filteredRoutes = validatedRoutes.filter(route => 
      (route.geometricSimilarity || 0) >= 0.3 && route.similarityScore >= 0.6
    );

    if (filteredRoutes.length === 0) {
      console.warn("No routes passed geometric validation. Original count:", routes.length);
      // Return best AI matches if no geometric matches found
      return validatedRoutes.slice(0, 3);
    }

    return filteredRoutes;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate routes from AI. Please check the console for details.");
  }
};