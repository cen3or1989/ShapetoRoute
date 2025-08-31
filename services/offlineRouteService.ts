import type { Point, Route, TransportationMode, CreativityLevel } from '../types';
import { analyzeShape, ShapeFeatures } from './shapeAnalysisService';

interface OSMWay {
  id: string;
  nodes: number[];
  tags: Record<string, string>;
}

interface OSMNode {
  id: number;
  lat: number;
  lon: number;
}

interface OSMData {
  ways: OSMWay[];
  nodes: Map<number, OSMNode>;
}

interface RouteCandidate {
  path: [number, number][];
  way: OSMWay;
  similarity: number;
  distance: number;
  duration: number;
}

/**
 * پیچیده‌ترین الگوریتم تطبیق شکل محلی
 * استفاده از Dynamic Time Warping + Hausdorff Distance + Fourier Analysis
 */
export class OfflineRouteService {
  private static readonly OVERPASS_API = 'https://overpass-api.de/api/interpreter';
  private static readonly NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

  /**
   * پیدا کردن مسیرهای تطبیق یافته با الگوریتم پیچیده
   */
  static async findMatchingRoutes(
    drawing: Point[][],
    location: string,
    mode: TransportationMode,
    creativity: CreativityLevel
  ): Promise<Route[]> {
    try {
      console.log('🔍 شروع جستجوی محلی...');
      
      // 1. تحلیل شکل کشیده شده
      const shapeFeatures = analyzeShape(drawing);
      if (!shapeFeatures) {
        throw new Error('شکل کشیده شده قابل تحلیل نیست');
      }

      // 2. پیدا کردن مختصات منطقه
      const bbox = await this.geocodeLocation(location);
      
      // 3. دریافت داده‌های نقشه
      const osmData = await this.getOSMData(bbox, mode);
      
      // 4. تولید کاندیدهای مسیر
      const candidates = await this.generateRouteCandidates(osmData, shapeFeatures, mode);
      
      // 5. محاسبه شباهت پیشرفته
      const scoredCandidates = await this.calculateAdvancedSimilarity(
        candidates, 
        shapeFeatures, 
        creativity
      );
      
      // 6. فیلتر و رتبه‌بندی نهایی
      const finalRoutes = this.filterAndRankRoutes(scoredCandidates, creativity);
      
      console.log(`✅ ${finalRoutes.length} مسیر پیدا شد`);
      return finalRoutes;
      
    } catch (error) {
      console.error('❌ خطا در جستجوی محلی:', error);
      throw error;
    }
  }

  /**
   * تبدیل آدرس به مختصات جغرافیایی
   */
  private static async geocodeLocation(location: string): Promise<[number, number, number, number]> {
    const response = await fetch(
      `${this.NOMINATIM_API}?format=json&q=${encodeURIComponent(location)}&limit=1&addressdetails=1`
    );
    
    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error(`مکان پیدا نشد: ${location}`);
    }

    const { lat, lon, boundingbox } = data[0];
    return [
      parseFloat(boundingbox[0]), // south
      parseFloat(boundingbox[1]), // north  
      parseFloat(boundingbox[2]), // west
      parseFloat(boundingbox[3])  // east
    ];
  }

  /**
   * دریافت داده‌های OpenStreetMap
   */
  private static async getOSMData(bbox: [number, number, number, number], mode: TransportationMode): Promise<OSMData> {
    const [south, north, west, east] = bbox;
    
    const wayTypes = this.getWayTypesForMode(mode);
    const query = `
      [out:json][timeout:30];
      (
        ${wayTypes.map(type => `way["highway"="${type}"](${south},${west},${north},${east});`).join('')}
      );
      out geom;
    `;

    const response = await fetch(this.OVERPASS_API, {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain' }
    });

    const data = await response.json();
    
    const ways: OSMWay[] = data.elements.filter((el: any) => el.type === 'way');
    const nodes = new Map<number, OSMNode>();
    
    // استخراج نودها
    data.elements.forEach((el: any) => {
      if (el.type === 'node') {
        nodes.set(el.id, { id: el.id, lat: el.lat, lon: el.lon });
      }
    });

    return { ways, nodes };
  }

  /**
   * انواع جاده بر اساس نوع حمل‌ونقل
   */
  private static getWayTypesForMode(mode: TransportationMode): string[] {
    switch (mode) {
      case 'walking':
        return ['footway', 'path', 'pedestrian', 'steps', 'residential', 'living_street'];
      case 'cycling':
        return ['cycleway', 'path', 'residential', 'living_street', 'secondary', 'tertiary'];
      case 'driving':
        return ['primary', 'secondary', 'tertiary', 'residential', 'trunk', 'motorway'];
      default:
        return ['residential', 'path'];
    }
  }

  /**
   * تولید کاندیدهای مسیر
   */
  private static async generateRouteCandidates(
    osmData: OSMData, 
    shapeFeatures: ShapeFeatures,
    mode: TransportationMode
  ): Promise<RouteCandidate[]> {
    const candidates: RouteCandidate[] = [];

    for (const way of osmData.ways) {
      // تبدیل way به path coordinates
      const path: [number, number][] = [];
      
      if ((way as any).geometry) {
        // اگر geometry موجود است (از overpass)
        (way as any).geometry.forEach((point: any) => {
          path.push([point.lat, point.lon]);
        });
      } else if (way.nodes) {
        // اگر فقط node IDs موجود است
        way.nodes.forEach(nodeId => {
          const node = osmData.nodes.get(nodeId);
          if (node) {
            path.push([node.lat, node.lon]);
          }
        });
      }

      if (path.length < 2) continue;

      // محاسبه فاصله و مدت زمان
      const distance = this.calculatePathDistance(path);
      const duration = this.estimateDuration(distance, mode);

      candidates.push({
        path,
        way,
        similarity: 0, // محاسبه می‌شود در مرحله بعد
        distance,
        duration
      });
    }

    return candidates;
  }

  /**
   * محاسبه شباهت پیشرفته با الگوریتم‌های پیچیده
   */
  private static async calculateAdvancedSimilarity(
    candidates: RouteCandidate[],
    shapeFeatures: ShapeFeatures,
    creativity: CreativityLevel
  ): Promise<RouteCandidate[]> {
    
    return candidates.map(candidate => {
      // 1. تبدیل path به normalized coordinates
      const normalizedRoute = this.normalizePathCoordinates(candidate.path);
      const normalizedShape = this.convertShapeToPath(shapeFeatures);

      // 2. محاسبه شباهت‌های مختلف
      const dtwSimilarity = this.calculateDTWSimilarity(normalizedShape, normalizedRoute);
      const hausdorffSimilarity = this.calculateHausdorffSimilarity(normalizedShape, normalizedRoute);
      const fourierSimilarity = this.calculateFourierSimilarity(normalizedShape, normalizedRoute);
      const geometricSimilarity = this.calculateGeometricSimilarity(shapeFeatures, normalizedRoute);

      // 3. ترکیب امتیازها بر اساس creativity level
      let finalSimilarity: number;
      
      switch (creativity) {
        case 'strict':
          // دقت بالا - وزن بیشتر به DTW و Hausdorff
          finalSimilarity = (
            dtwSimilarity * 0.4 +
            hausdorffSimilarity * 0.3 +
            fourierSimilarity * 0.2 +
            geometricSimilarity * 0.1
          );
          break;
          
        case 'balanced':
          // متعادل
          finalSimilarity = (
            dtwSimilarity * 0.3 +
            hausdorffSimilarity * 0.25 +
            fourierSimilarity * 0.25 +
            geometricSimilarity * 0.2
          );
          break;
          
        case 'creative':
          // خلاقانه - وزن بیشتر به ویژگی‌های کلی
          finalSimilarity = (
            dtwSimilarity * 0.2 +
            hausdorffSimilarity * 0.2 +
            fourierSimilarity * 0.3 +
            geometricSimilarity * 0.3
          );
          break;
      }

      return {
        ...candidate,
        similarity: Math.max(0, Math.min(1, finalSimilarity))
      };
    });
  }

  /**
   * Dynamic Time Warping - الگوریتم پیچیده تطبیق دنباله
   */
  private static calculateDTWSimilarity(shape: [number, number][], route: [number, number][]): number {
    const n = shape.length;
    const m = route.length;
    
    // ماتریس DTW
    const dtw: number[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = this.euclideanDistance(shape[i-1], route[j-1]);
        dtw[i][j] = cost + Math.min(
          dtw[i-1][j],     // insertion
          dtw[i][j-1],     // deletion
          dtw[i-1][j-1]    // match
        );
      }
    }

    // نرمال‌سازی نتیجه
    const maxDistance = Math.max(n, m);
    return Math.exp(-dtw[n][m] / maxDistance);
  }

  /**
   * Hausdorff Distance - فاصله هندسی پیشرفته
   */
  private static calculateHausdorffSimilarity(shape: [number, number][], route: [number, number][]): number {
    const h1 = this.directedHausdorffDistance(shape, route);
    const h2 = this.directedHausdorffDistance(route, shape);
    const hausdorffDistance = Math.max(h1, h2);
    
    // تبدیل فاصله به شباهت
    return Math.exp(-hausdorffDistance * 10);
  }

  private static directedHausdorffDistance(setA: [number, number][], setB: [number, number][]): number {
    let maxMinDistance = 0;
    
    for (const pointA of setA) {
      let minDistance = Infinity;
      
      for (const pointB of setB) {
        const distance = this.euclideanDistance(pointA, pointB);
        minDistance = Math.min(minDistance, distance);
      }
      
      maxMinDistance = Math.max(maxMinDistance, minDistance);
    }
    
    return maxMinDistance;
  }

  /**
   * Fourier Transform Similarity - تحلیل فرکانسی شکل
   */
  private static calculateFourierSimilarity(shape: [number, number][], route: [number, number][]): number {
    const shapeSignature = this.computeFourierDescriptors(shape);
    const routeSignature = this.computeFourierDescriptors(route);
    
    // مقایسه descriptorها
    let similarity = 0;
    const minLength = Math.min(shapeSignature.length, routeSignature.length);
    
    for (let i = 0; i < minLength; i++) {
      const diff = Math.abs(shapeSignature[i] - routeSignature[i]);
      similarity += Math.exp(-diff);
    }
    
    return similarity / minLength;
  }

  private static computeFourierDescriptors(path: [number, number][]): number[] {
    // ساده‌سازی شده از Fourier Descriptors
    const descriptors: number[] = [];
    const n = path.length;
    
    // محاسبه چند harmonic اول
    for (let k = 0; k < Math.min(8, n); k++) {
      let real = 0, imag = 0;
      
      for (let i = 0; i < n; i++) {
        const angle = -2 * Math.PI * k * i / n;
        real += path[i][0] * Math.cos(angle) - path[i][1] * Math.sin(angle);
        imag += path[i][0] * Math.sin(angle) + path[i][1] * Math.cos(angle);
      }
      
      descriptors.push(Math.sqrt(real * real + imag * imag) / n);
    }
    
    return descriptors;
  }

  /**
   * محاسبه شباهت هندسی
   */
  private static calculateGeometricSimilarity(shapeFeatures: ShapeFeatures, route: [number, number][]): number {
    // محاسبه ویژگی‌های مسیر
    const routeFeatures = this.extractRouteFeatures(route);
    
    // مقایسه ویژگی‌ها
    const aspectRatioSim = 1 - Math.abs(shapeFeatures.aspectRatio - routeFeatures.aspectRatio) / 
                          Math.max(shapeFeatures.aspectRatio, routeFeatures.aspectRatio);
    
    const complexitySim = 1 - Math.abs(shapeFeatures.complexity - routeFeatures.complexity);
    
    const straightnessSim = 1 - Math.abs(shapeFeatures.straightness - routeFeatures.straightness);
    
    return (aspectRatioSim + complexitySim + straightnessSim) / 3;
  }

  /**
   * استخراج ویژگی‌های مسیر
   */
  private static extractRouteFeatures(route: [number, number][]) {
    if (route.length < 3) {
      return { aspectRatio: 1, complexity: 0, straightness: 1 };
    }

    // محاسبه bounding box
    const lats = route.map(p => p[0]);
    const lons = route.map(p => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    
    const width = maxLon - minLon;
    const height = maxLat - minLat;
    const aspectRatio = width > 0 ? height / width : 1;

    // محاسبه complexity (تعداد تغییر جهت)
    let directionChanges = 0;
    for (let i = 1; i < route.length - 1; i++) {
      const angle1 = Math.atan2(route[i][1] - route[i-1][1], route[i][0] - route[i-1][0]);
      const angle2 = Math.atan2(route[i+1][1] - route[i][1], route[i+1][0] - route[i][0]);
      const angleDiff = Math.abs(angle2 - angle1);
      if (angleDiff > Math.PI / 4) { // بیش از 45 درجه
        directionChanges++;
      }
    }
    const complexity = Math.min(1, directionChanges / (route.length * 0.3));

    // محاسبه straightness
    const totalDistance = this.calculatePathDistance(route);
    const directDistance = this.euclideanDistance(route[0], route[route.length - 1]);
    const straightness = totalDistance > 0 ? directDistance / totalDistance : 1;

    return { aspectRatio, complexity, straightness };
  }

  /**
   * فیلتر و رتبه‌بندی نهایی
   */
  private static filterAndRankRoutes(candidates: RouteCandidate[], creativity: CreativityLevel): Route[] {
    const minSimilarity = {
      'strict': 0.7,
      'balanced': 0.5,
      'creative': 0.3
    }[creativity];

    const filteredCandidates = candidates
      .filter(c => c.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // حداکثر 5 مسیر

    return filteredCandidates.map((candidate, index) => ({
      routeName: this.generateRouteName(candidate.way, index),
      description: this.generateRouteDescription(candidate.way, candidate.distance),
      distance: Math.round(candidate.distance * 100) / 100,
      duration: Math.round(candidate.duration),
      similarityScore: Math.round(candidate.similarity * 100) / 100,
      path: candidate.path
    }));
  }

  /**
   * تولید نام مسیر
   */
  private static generateRouteName(way: OSMWay, index: number): string {
    const name = way.tags?.name || way.tags?.highway || `مسیر ${index + 1}`;
    return name.length > 30 ? name.substring(0, 27) + '...' : name;
  }

  /**
   * تولید توضیحات مسیر
   */
  private static generateRouteDescription(way: OSMWay, distance: number): string {
    const type = way.tags?.highway || 'مسیر';
    const surface = way.tags?.surface || '';
    
    let description = `یک ${type}`;
    if (surface) description += ` با سطح ${surface}`;
    description += ` به طول ${distance.toFixed(1)} کیلومتر`;
    
    return description;
  }

  // Helper methods
  private static euclideanDistance(p1: [number, number], p2: [number, number]): number {
    return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
  }

  private static calculatePathDistance(path: [number, number][]): number {
    let distance = 0;
    for (let i = 1; i < path.length; i++) {
      distance += this.haversineDistance(path[i-1], path[i]);
    }
    return distance;
  }

  private static haversineDistance(p1: [number, number], p2: [number, number]): number {
    const R = 6371; // شعاع زمین به کیلومتر
    const dLat = (p2[0] - p1[0]) * Math.PI / 180;
    const dLon = (p2[1] - p1[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static estimateDuration(distance: number, mode: TransportationMode): number {
    const speeds = {
      'walking': 5,   // km/h
      'cycling': 15,  // km/h  
      'driving': 40   // km/h
    };
    return (distance / speeds[mode]) * 60; // دقیقه
  }

  private static normalizePathCoordinates(path: [number, number][]): [number, number][] {
    if (path.length === 0) return [];
    
    const lats = path.map(p => p[0]);
    const lons = path.map(p => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    
    const latRange = maxLat - minLat || 1;
    const lonRange = maxLon - minLon || 1;
    
    return path.map(([lat, lon]) => [
      (lat - minLat) / latRange,
      (lon - minLon) / lonRange
    ]);
  }

  private static convertShapeToPath(shapeFeatures: ShapeFeatures): [number, number][] {
    // تبدیل normalized path به array of coordinates
    const pathString = shapeFeatures.normalizedPath;
    const coordinates: [number, number][] = [];
    
    const parts = pathString.split(' M ');
    parts.forEach(part => {
      const points = part.split(' ');
      points.forEach(point => {
        const [x, y] = point.split(',').map(Number);
        if (!isNaN(x) && !isNaN(y)) {
          coordinates.push([x, y]);
        }
      });
    });
    
    return coordinates;
  }
}