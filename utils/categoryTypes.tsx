export function getButtonCategories(orderType: string): string[] {
  switch (orderType) {
    case "ToPrint":
      return ["White", "Holographic", "Clear", "Roll", "Tile"];
    case "ToCut":
      return ["Regular", "Roll"];
    case "ToPack":
      return ["Regular", "Roll"];
    case "ToShip":
      return ["Regular", "Roll"];
    default:
      return [];
  }
}
