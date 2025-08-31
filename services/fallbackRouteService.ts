import type { Point, Route, TransportationMode, CreativityLevel } from '../types';
import { analyzeShape, ShapeFeatures } from './shapeAnalysisService';

/**
 * 🛡️ سرویس Fallback ساده - برای زمانی که الگوریتم اصلی کار نکند
 * این سرویس با روش‌های ساده‌تر مسیرهایی پیدا می‌کند
 */
export class FallbackRouteService {
  private static readonly OVERPASS_API = 'https://overpass-api.de/api/interpreter';
  private static readonly NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

  static async findBasicRoutes(
    drawing: Point[][],
    location: string,
    mode: TransportationMode
  ): Promise<Route[]> {
    try {
      console.log('🛡️ استفاده از الگوریتم fallback ساده...');
      
      // 1. تحلیل ساده شکل
      const shapeFeatures = analyzeShape(drawing);
      if (!shapeFeatures) {
        return this.generateDummyRoutes(location, mode);
      }

      // 2. پیدا کردن مختصات
      const bbox = await this.getSimpleBbox(location);
      
      // 3. دریافت مسیرهای ساده
      const routes = await this.getSimpleRoutes(bbox, mode, shapeFeatures);
      
      console.log(`🛡️ ${routes.length} مسیر ساده پیدا شد`);
      return routes;
      
    } catch (error) {
      console.warn('⚠️ حتی fallback هم کار نکرد:', error);
      return this.generateDummyRoutes(location, mode);
    }
  }

  private static async getSimpleBbox(location: string): Promise<[number, number, number, number]> {
    try {
      const response = await fetch(
        `${this.NOMINATIM_API}?format=json&q=${encodeURIComponent(location)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const radius = 0.01; // ~1km
        return [
          parseFloat(lat) - radius,
          parseFloat(lat) + radius,
          parseFloat(lon) - radius,
          parseFloat(lon) + radius
        ];
      }
    } catch (error) {
      console.warn('خطا در geocoding:', error);
    }
    
    // پیش‌فرض: سان فرانسیسکو
    return [37.7649, 37.7849, -122.4294, -122.4094];
  }

  private static async getSimpleRoutes(
    bbox: [number, number, number, number],
    mode: TransportationMode,
    shapeFeatures: ShapeFeatures
  ): Promise<Route[]> {
    const [south, north, west, east] = bbox;
    const wayType = this.getSimpleWayType(mode);
    
    const query = `
      [out:json][timeout:15];
      (
        way["highway"="${wayType}"](${south},${west},${north},${east});
      );
      out geom;
    `;

    try {
      const response = await fetch(this.OVERPASS_API, {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const ways = data.elements.filter((el: any) => el.type === 'way');
      
      return ways.slice(0, 3).map((way: any, index: number) => {
        const path: [number, number][] = way.geometry?.map((p: any) => [p.lat, p.lon]) || [];
        const distance = this.estimateDistance(path);
        
        return {
          routeName: `مسیر ساده ${index + 1}`,
          description: `یک ${wayType} به طول تقریبی ${distance.toFixed(1)} کیلومتر`,
          distance,
          duration: this.estimateDuration(distance, mode),
          similarityScore: 0.3 + Math.random() * 0.3, // امتیاز تصادفی پایین
          path
        };
      });

    } catch (error) {
      console.warn('خطا در دریافت داده‌های ساده:', error);
      return [];
    }
  }

  private static getSimpleWayType(mode: TransportationMode): string {
    switch (mode) {
      case 'walking': return 'residential';
      case 'cycling': return 'residential';
      case 'driving': return 'secondary';
      default: return 'residential';
    }
  }

  private static estimateDistance(path: [number, number][]): number {
    if (path.length < 2) return 1;
    
    let distance = 0;
    for (let i = 1; i < path.length; i++) {
      const [lat1, lon1] = path[i-1];
      const [lat2, lon2] = path[i];
      
      // فرمول ساده برای فاصله
      const deltaLat = lat2 - lat1;
      const deltaLon = lon2 - lon1;
      const d = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
      distance += d * 111; // تبدیل تقریبی به کیلومتر
    }
    
    return Math.max(0.5, Math.min(10, distance));
  }

  private static estimateDuration(distance: number, mode: TransportationMode): number {
    const speeds = {
      'walking': 5,
      'cycling': 15,
      'driving': 40
    };
    return (distance / speeds[mode]) * 60;
  }

  private static generateDummyRoutes(location: string, mode: TransportationMode): Route[] {
    console.log('🤖 تولید مسیرهای نمونه...');
    
    return [
      {
        routeName: '🔄 مسیر نمونه ۱',
        description: `یک مسیر فرضی در ${location} برای ${mode}`,
        distance: 2 + Math.random() * 3,
        duration: 30 + Math.random() * 60,
        similarityScore: 0.2 + Math.random() * 0.2,
        path: this.generateDummyPath()
      },
      {
        routeName: '🔄 مسیر نمونه ۲',
        description: `مسیر دوم فرضی در ${location}`,
        distance: 1 + Math.random() * 2,
        duration: 20 + Math.random() * 40,
        similarityScore: 0.15 + Math.random() * 0.25,
        path: this.generateDummyPath()
      }
    ];
  }

  private static generateDummyPath(): [number, number][] {
    const centerLat = 37.7749; // San Francisco
    const centerLon = -122.4194;
    const radius = 0.01;
    
    const path: [number, number][] = [];
    const numPoints = 5 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const r = radius * (0.5 + Math.random() * 0.5);
      
      const lat = centerLat + r * Math.cos(angle);
      const lon = centerLon + r * Math.sin(angle);
      
      path.push([lat, lon]);
    }
    
    return path;
  }
}