import fs from "node:fs"
import path from "node:path"

const workspaceRoot = process.cwd()
const packageJsonPath = path.join(workspaceRoot, "package.json")
const packageLockPath = path.join(workspaceRoot, "package-lock.json")
const outputDir = path.join(workspaceRoot, "artifacts")
const outputPath = path.join(outputDir, "sbom-baseline.json")

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
const packageLock = JSON.parse(fs.readFileSync(packageLockPath, "utf8"))

const directProductionDependencies = Object.entries(packageJson.dependencies ?? {})
  .map(([name, version]) => ({ name, version, scope: "production" }))
  .sort((left, right) => left.name.localeCompare(right.name))

const directDevelopmentDependencies = Object.entries(packageJson.devDependencies ?? {})
  .map(([name, version]) => ({ name, version, scope: "development" }))
  .sort((left, right) => left.name.localeCompare(right.name))

const inventoryPackages = Object.entries(packageLock.packages ?? {})
  .filter(([packagePath]) => packagePath !== "")
  .map(([packagePath, metadata]) => {
    const packageName = packagePath.split("node_modules/").pop()

    return {
      name: packageName,
      version: metadata.version ?? null,
      path: packagePath,
      scope: metadata.dev ? "development" : "production",
      resolved: metadata.resolved ?? null,
      integrity: metadata.integrity ?? null,
      license: metadata.license ?? "UNKNOWN",
    }
  })
  .sort((left, right) => {
    if (left.name === right.name) {
      return (left.version ?? "").localeCompare(right.version ?? "")
    }

    return left.name.localeCompare(right.name)
  })

const inventory = {
  schema: "nexuserp.dependency-inventory/v1",
  generatedAt: new Date().toISOString(),
  source: "package-lock.json",
  lockfileVersion: packageLock.lockfileVersion ?? null,
  rootPackage: {
    name: packageJson.name ?? "unknown",
    version: packageJson.version ?? "0.0.0",
    private: Boolean(packageJson.private),
  },
  summary: {
    directProductionDependencies: directProductionDependencies.length,
    directDevelopmentDependencies: directDevelopmentDependencies.length,
    totalResolvedPackages: inventoryPackages.length,
  },
  directDependencies: [
    ...directProductionDependencies,
    ...directDevelopmentDependencies,
  ],
  packages: inventoryPackages,
  notes: [
    "Baseline dependency inventory generated from package-lock.json.",
    "Refresh this artifact whenever package-lock.json changes.",
    "Supplement with a formal SPDX or CycloneDX export before GA sign-off.",
  ],
}

fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(inventory, null, 2)}\n`)

console.log(`Generated ${path.relative(workspaceRoot, outputPath)}`)
