import { readFile, writeFile } from "node:fs/promises";

const inputPath = new URL("./places-flat.json", import.meta.url);
const outputPath = new URL("./places-flat.csv", import.meta.url);

const columns = [
  "place_id",
  "city_slug",
  "category_slug",
  "name",
  "description",
  "address",
  "schedule",
  "image",
  "rating",
  "phone",
  "website",
  "maps_url",
];

function toCsvValue(value) {
  const safeValue = value ?? "";
  const stringValue = String(safeValue).replace(/"/g, '""');
  return `"${stringValue}"`;
}

const json = await readFile(inputPath, "utf8");
const places = JSON.parse(json);

const lines = [
  columns.join(","),
  ...places.map((place) => columns.map((column) => toCsvValue(place[column])).join(",")),
];

await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");

console.log("Created places-flat.csv");
