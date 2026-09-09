// Regenerates .expo/types/router.d.ts from a clean route context.
//
// Expo Router's dev-server watcher corrupts this file on Windows: its
// "is this file inside app/?" guard checks `path.relative(...).startsWith('../')`,
// but path.relative returns "..\\lib\\data.ts" on Windows, so every edit to a file
// OUTSIDE app/ (lib/, components/) gets registered as a route. The resulting
// declaration file breaks `tsc`. Run `npm run gen:routes` to rebuild it.
const path = require("node:path");

process.env.EXPO_ROUTER_APP_ROOT = path.resolve(__dirname, "..", "app");
require("expo-router/build/typed-routes").regenerateDeclarations(
  path.resolve(__dirname, "..", ".expo/types"),
);
console.log("Regenerated .expo/types/router.d.ts");
