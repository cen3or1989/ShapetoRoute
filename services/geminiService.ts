import { GoogleGenAI, Type } from "@google/genai";
import type { Point, Route, TransportationMode } from '../types';
import { validateApiKey, sanitizeLocation, sanitizeRouteData } from '../utils/security';
import { APIError } from '../types/errors';
import { analyzeShape, generateShapeDescription, normalizePoints } from '../utils/shapeAnalysis';
import { SHAPE_EXAMPLES } from '../constants/shapeExamples';

const API_KEY = process.env.API_KEY;

validateApiKey(API_KEY);

const ai = new GoogleGenAI({ apiKey: API_KEY! });

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

export const findMatchingRoutes = async (
  drawing: Point[][],
  location: string,
  mode: TransportationMode
): Promise<Route[]> => {
  const sanitizedLocation = sanitizeLocation(location);
  
  // Analyze the shape
  const shapeFeatures = analyzeShape(drawing);
  const shapeDescription = generateShapeDescription(shapeFeatures);
  
  // Create normalized path string for the AI
  const normalizedPath = shapeFeatures.normalizedPath
    .map(p => `${(p.x * 100).toFixed(1)},${(p.y * 100).toFixed(1)}`)
    .join(' ');

  const prompt = `
You are an expert route-finding AI that matches user-drawn shapes to real-world routes.

**LOCATION:** ${sanitizedLocation}
**TRANSPORTATION MODE:** ${mode}

**SHAPE ANALYSIS:**
- Type: ${shapeFeatures.type}
- Description: ${shapeDescription}
- Primary Direction: ${shapeFeatures.direction}
- Complexity: ${(shapeFeatures.complexity * 100).toFixed(0)}%
- Curvature: ${(shapeFeatures.curvature * 100).toFixed(0)}%
- Aspect Ratio: ${shapeFeatures.aspectRatio.toFixed(2)}
${shapeFeatures.angles.length > 0 ? `- Key Angles: ${shapeFeatures.angles.join('°, ')}°` : ''}

**NORMALIZED PATH (0-100 scale):**
${normalizedPath}

**YOUR TASK:**
Find ${mode === 'walking' ? 'walking' : mode === 'cycling' ? 'cycling' : 'driving'} routes in ${sanitizedLocation} that match this shape.

**REAL-WORLD EXAMPLES TO INSPIRE YOUR SEARCH:**
${SHAPE_EXAMPLES[shapeFeatures.type] || ''}

**MATCHING CRITERIA:**
${shapeFeatures.type === 'circle' ? `
- Look for circular routes, loops, or routes around landmarks (parks, lakes, stadiums)
- The route should return close to its starting point
- Consider routes around roundabouts or circular roads
` : ''}
${shapeFeatures.type === 'rectangle' ? `
- Find routes that form a rectangular path around city blocks
- Look for grid-based street patterns
- The route should have roughly 90-degree turns at corners
` : ''}
${shapeFeatures.type === 'triangle' ? `
- Search for triangular street patterns or routes connecting three landmarks
- Look for routes with three distinct turning points
- Consider routes around triangular parks or intersections
` : ''}
${shapeFeatures.type === 'zigzag' ? `
- Find routes with multiple sharp turns (${shapeFeatures.angles.filter(a => a > 90).length} sharp angles detected)
- Look for switchback roads, mountain paths, or streets with multiple direction changes
- Match the zigzag pattern's frequency and angle severity
` : ''}
${shapeFeatures.type === 'spiral' ? `
- Search for spiral roads, parking garage routes, or winding paths
- Look for routes that gradually curve inward or outward
- Consider helical or coiled street patterns
` : ''}
${shapeFeatures.type === 'curve' ? `
- Find smoothly curving roads or paths
- Look for routes along rivers, coastlines, or following natural contours
- Match the curve's direction and intensity
` : ''}
${shapeFeatures.type === 'line' ? `
- Find straight or gently curved routes
- Look for main roads, highways, or direct paths
- Match the line's direction (${shapeFeatures.direction})
` : ''}

**IMPORTANT MATCHING RULES:**
1. The route must be actually navigable by ${mode}
2. Prioritize routes that visually resemble the shape when viewed on a map
3. The shape can be rotated, scaled, or slightly distorted - focus on the pattern
4. Consider famous/notable routes that match the pattern
5. Include practical details (actual street names, landmarks)
6. similarityScore should reflect how recognizable the match is (0.6-1.0)

**OUTPUT REQUIREMENTS:**
Return ONLY a valid JSON array with 1-5 routes, prioritizing quality over quantity.
Each route must have all required fields filled with realistic data.
`;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: routeSchema,
            temperature: 0.7, // Balanced for creative but accurate results
            topK: 40,
            topP: 0.95,
        },
    });

    const jsonString = response.text.trim();
    const rawRoutes = JSON.parse(jsonString);
    
    // Basic validation
    if (!Array.isArray(rawRoutes)) {
        console.error("Gemini response is not an array:", rawRoutes);
        throw new APIError("Invalid response format from AI service");
    }
    
    // Sanitize and validate routes
    const sanitizedRoutes = sanitizeRouteData(rawRoutes);
    return sanitizedRoutes.filter(route => route.path && route.path.length > 1) as Route[];

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate routes from AI. Please check the console for details.");
  }
};