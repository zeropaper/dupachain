import { z } from "zod";
import { DynamicStructuredTool } from "langchain/tools";
import { Callbacks } from "langchain/callbacks";
import { createServiceClient } from "../createServiceClient";

const characteristics = {
  Shape: [
    "Directional",
    "Twin",
    "Asym Twin",
    "Tapered Swallowtail",
    "Directional Twin",
    "Wide Tapered Directional",
    "Directional Splitboard",
    "Powder Surfer",
    "Tapered Winglets Swallowtail",
    "All-Terrain Twin",
    "Tapered Directional Splitboard",
    "Tapered Directional",
    "Tapered Swallowtail Splitboard",
    "Directional Twin Splitboard",
  ],
  Camber: ["Trüe Camber", "Cam-Out Camber", "Rocker"],
  Width: [
    "Progressive",
    "Standard",
    "Mid-Wide",
    "Wide",
    "Standard and Mid-Wide",
  ],
  Flex: ["All-Terrain", "Park", "Urban", "Softride"],
  Sidecut: ["Dual Degressive", "Radial", "Progressive"],
  Rocker: ["Flat-Out Rocker", "Gullwing Rocker"],
};

const characteristicsByBoard = {
  "Alternator X Volcom": {
    Shape: "Directional",
    Camber: "Trüe Camber",
    Width: "Progressive",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  Alternator: {
    Shape: "Directional",
    Camber: "Trüe Camber",
    Width: "Progressive",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  Arial: {
    Shape: "Twin",
    Camber: "Cam-Out Camber",
    Width: "Standard",
    Flex: "All-Terrain",
    Sidecut: "Radial",
  },
  Banker: {
    Shape: "Directional",
    Camber: "Trüe Camber",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  Basher: {
    Shape: "Asym Twin",
    Rocker: "Flat-Out Rocker",
    Width: "Wide",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  Beast: {
    Shape: "Twin",
    Camber: "Trüe Camber",
    Width: "Standard and Mid-Wide",
    Flex: "Park",
    Sidecut: "Radial",
  },
  Beauty: {
    Shape: "Twin",
    Camber: "Trüe Camber",
    Width: "Standard",
    Flex: "Park",
    Sidecut: "Radial",
  },
  Cannon: {
    Shape: "Tapered Swallowtail",
    Camber: "Cam-Out Camber",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  "Cheap Thrills X Wigglestick": {
    Shape: "Twin",
    Rocker: "Flat-Out Rocker",
    Width: "Standard",
    Flex: "Urban",
    Sidecut: "Radial",
  },
  Cinema: {
    Shape: "Directional Twin",
    Rocker: "Gullwing Rocker",
    Width: "Progressive",
    Flex: "All-Terrain",
    Sidecut: "Radial",
  },
  Dinghy: {
    Shape: "Wide Tapered Directional",
    Camber: "Trüe Camber",
    Width: "Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  Doppleganger: {
    Shape: "Directional Splitboard",
    Camber: "Cam-Out Camber",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  Drop: {
    Shape: "Directional",
    Camber: "Cam-Out Camber",
    Width: "Standard",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  Dropout: {
    Shape: "Directional",
    Camber: "Cam-Out Camber",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  Fate: {
    Shape: "Directional Twin",
    Camber: "Cam-Out Camber",
    Width: "Standard",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  Fintwin: {
    Shape: "Tapered Swallowtail",
    Camber: "Cam-Out Camber",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  "Future Team": {
    Shape: "Twin",
    Camber: "Cam-Out Camber",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Radial",
  },
  Highlander: {
    Shape: "Directional",
    Camber: "Trüe Camber",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  Karma: {
    Shape: "Directional",
    Camber: "Trüe Camber",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  "Lectra Brush": {
    Shape: "Directional",
    Rocker: "Flat-Out Rocker",
    Width: "Standard",
    Flex: "All-Terrain",
    Sidecut: "Radial",
  },
  Lectra: {
    Shape: "Directional",
    Rocker: "Flat-Out Rocker",
    Width: "Standard",
    Flex: "All-Terrain",
    Sidecut: "Radial",
  },
  Magnum: {
    Shape: "Directional",
    Camber: "Cam-Out Camber",
    Width: "Wide",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  Mercy: {
    Shape: "Twin",
    Camber: "Cam-Out Camber",
    Width: "Standard",
    Flex: "Urban",
    Sidecut: "Dual Degressive",
  },
  "Mini Thrills X Wigglestick": {
    Shape: "Twin",
    Rocker: "Flat-Out Rocker",
    Width: "Progressive",
    Flex: "Urban",
    Sidecut: "Radial",
  },
  Miniganger: {
    Shape: "Directional Splitboard",
    Camber: "Cam-Out Camber",
    Width: "Standard",
    Flex: "All-Terrain",
    Sidecut: "Radial",
  },
  Mystique: {
    Shape: "Directional Twin",
    Rocker: "Gullwing Rocker",
    Width: "Standard",
    Flex: "All-Terrain",
    Sidecut: "Radial",
  },
  "Nitro X Konvoi Surfer": {
    Shape: "Powder Surfer",
    Camber: "Rocker",
    Width: "Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  Nomad: {
    Shape: "Directional Splitboard",
    Camber: "Cam-Out Camber",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  Optisym: {
    Shape: "Asym Twin",
    Camber: "Cam-Out Camber",
    Width: "Mid-Wide",
    Flex: "Urban",
    Sidecut: "Dual Degressive",
  },
  Pantera: {
    Shape: "Directional",
    Camber: "Trüe Camber",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  Pow: {
    Shape: "Tapered Winglets Swallowtail",
    Camber: "Trüe Camber",
    Width: "Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  "Prime Raw": {
    Shape: "Directional",
    Rocker: "Flat-Out Rocker",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Radial",
  },
  "Prime View": {
    Shape: "Directional",
    Rocker: "Flat-Out Rocker",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Radial",
  },
  "Ripper X Volcom": {
    Shape: "Twin",
    Rocker: "Flat-Out Rocker",
    Width: "Standard",
    Flex: "Softride",
    Sidecut: "Radial",
  },
  Ripper: {
    Shape: "Twin",
    Rocker: "Flat-Out Rocker",
    Width: "Standard",
    Flex: "Softride",
    Sidecut: "Radial",
  },
  Santoku: {
    Shape: "All-Terrain Twin",
    Camber: "Trüe Camber",
    Width: "Progressive",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  "Slash Split": {
    Shape: "Tapered Directional Splitboard",
    Camber: "Trüe Camber",
    Width: "Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  Slash: {
    Shape: "Tapered Directional",
    Camber: "Trüe Camber",
    Width: "Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  SMP: {
    Shape: "Directional",
    Camber: "Cam-Out Camber",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  Spirit: {
    Shape: "Twin",
    Rocker: "Flat-Out Rocker",
    Width: "Standard",
    Flex: "Softride",
    Sidecut: "Radial",
  },
  Squash: {
    Shape: "Tapered Swallowtail",
    Camber: "Trüe Camber",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  "Squash Split": {
    Shape: "Tapered Swallowtail Splitboard",
    Camber: "Trüe Camber",
    Width: "Mid-Wide",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  "T1 X FFF": {
    Shape: "Twin",
    Camber: "Cam-Out Camber",
    Width: "Standard",
    Flex: "Park",
    Sidecut: "Radial",
  },
  "Team Pro Marcus Kleveland": {
    Shape: "Directional Twin",
    Camber: "Trüe Camber",
    Width: "Standard",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  "Team Pro": {
    Shape: "Directional Twin",
    Camber: "Trüe Camber",
    Width: "Standard",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  "Team Split": {
    Shape: "Directional Twin Splitboard",
    Camber: "Trüe Camber",
    Width: "Progressive",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  Team: {
    Shape: "Directional Twin",
    Camber: "Trüe Camber",
    Width: "Standard",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
  Vertical: {
    Shape: "Directional Splitboard",
    Camber: "Trüe Camber",
    Width: "Standard",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  Victoria: {
    Shape: "Directional",
    Camber: "Trüe Camber",
    Width: "Standard",
    Flex: "All-Terrain",
    Sidecut: "Progressive",
  },
  Volta: {
    Shape: "Directional Splitboard",
    Camber: "Cam-Out Camber",
    Width: "Standard",
    Flex: "All-Terrain",
    Sidecut: "Dual Degressive",
  },
};

const characteristicsSchema = z.object({
  ...Object.entries(characteristics).reduce(
    (acc, [key, values]) => {
      acc[key as keyof typeof characteristics] = z
        .string()
        .optional()
        .describe(`can be one of: ${values.map((v) => `"${v}"`).join(", ")}`);
      return acc;
    },
    {} as Record<keyof typeof characteristics, z.ZodOptional<z.ZodString>>,
  ),
});

export function createSnowboardSearchTool(callbacks: Callbacks | undefined) {
  return new DynamicStructuredTool({
    name: "snowboard_characteristics_search",
    description: "Search the snowboards catalog by characteristics",
    schema: characteristicsSchema.extend({
      size: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
        })
        .optional()
        .describe("Size range in cm"),
    }),
    func: async (search) => {
      const metadata = {
        characteristics: Object.entries(search).reduce(
          (acc, [key, value]) => {
            if (!value || key === "size") {
              return acc;
            }
            return acc;
          },
          {} as Record<string, string>,
        ),
      };
      const serviceClient = createServiceClient();
      const { data, error } = await serviceClient
        .from("documents")
        .select("reference, metadata, content")
        .contains("metadata", metadata)
        .limit(5);
      console.info("data", data, error);
      if (error) {
        return "Error";
      }
      return JSON.stringify(data);
    },
    callbacks,
  });
}
