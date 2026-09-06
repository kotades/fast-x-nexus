declare module 'open-location-code' {
  export class OpenLocationCode {
    constructor();
    encode(latitude: number, longitude: number, codeLength?: number): string;
    decode(code: string): {
      latitudeCenter: number;
      longitudeCenter: number;
      latitudeLo: number;
      longitudeLo: number;
      latitudeHi: number;
      longitudeHi: number;
      codeLength: number;
    };
    isFull(code: string): boolean;
    isShort(code: string): boolean;
    isValid(code: string): boolean;
    shorten(code: string, latitude: number, longitude: number): string;
    recoverNearest(shortCode: string, referenceLatitude: number, referenceLongitude: number): string;
  }
}
