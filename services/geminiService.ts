import { GoogleGenAI, Type } from "@google/genai";
import type { Point, Route, TransportationMode } from '../types';

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
  const serializedShape = serializeDrawing(drawing);

  const prompt = `
You are a "Geospatial Artistry AI". Your mission is to discover real-world routes that artistically and structurally evoke the essence of a user's drawing. Forget pixel-perfect geometric matches; instead, find a route that a human would recognize as a creative, recognizable representation of the drawn shape.

**Your Goal:**
Find a navigable route in "${location}" for the "${mode}" transportation mode that artistically resembles the following shape.

**Shape Data (Normalized SVG-like coordinates):**
"${serializedShape}"

**Artistic Analysis Protocol:**
1.  **Deconstruct the Shape's Essence:** Analyze the drawing not just as lines, but as a concept. What does it represent?
    *   **Structure:** Identify the core structural elements. For a letter 'A', this is two angled lines meeting at a peak with a horizontal crossbar. For a spiral, it's a continuously tightening curve.
    *   **Character:** Is it sharp and angular? Soft and looping? Simple? Complex?
2.  **Find a Structural Analogy:** Search the road network of "${location}" for a route whose structure mirrors the shape's essence. The match can be scaled, rotated, or slightly distorted. The key is preserving the fundamental character.
3.  **Creative Similarity Scoring:** The \`similarityScore\` must reflect how well the route captures the artistic spirit and structural foundation of the drawing.
    *   **0.9+:** An incredibly clever and clear match that is instantly recognizable as the shape.
    *   **0.7-0.89:** A good, creative representation that clearly captures the main elements.
    *   **< 0.7:** A more abstract interpretation that shares some key characteristics. Do not return routes with scores below 0.6.
4.  **Example Task:**
    *   **Input Shape:** A drawing of the letter 'S'.
    *   **Analysis:** Two opposing curves connected smoothly.
    *   **Your Ideal Output:** Find a winding road or a set of connected streets that form a clear 'S' curve.
5.  **Output:** Return ONLY a valid JSON array of route objects. Do not include any explanatory text or markdown.

Now, apply this artistic approach to find the most evocative route for the user's shape.
`;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: routeSchema,
            temperature: 0.6, // Higher temperature for more "creative" but still relevant results.
        },
    });

    const jsonString = response.text.trim();
    const routes = JSON.parse(jsonString) as Route[];
    
    // Basic validation
    if (!Array.isArray(routes)) {
        console.error("Gemini response is not an array:", routes);
        return [];
    }
    
    return routes.filter(route => route.path && route.path.length > 1);

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate routes from AI. Please check the console for details.");
  }
};