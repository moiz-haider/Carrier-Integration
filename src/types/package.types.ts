export interface PackageDimension {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface Package {
  weightKg: number;
  dimensions?: PackageDimension;
}
