import { describe, it, expect } from "vitest";
import { hasPermission, getPermissions, canRead, canWrite, ROLES } from "./permissions";
import type { Role } from "./permissions";

describe("ROLES", () => {
  it("defines four roles", () => {
    expect(Object.keys(ROLES)).toEqual(["owner", "manager", "viewer", "maintenance"]);
  });

  it("owner has highest level", () => {
    expect(ROLES.owner.level).toBe(100);
  });

  it("maintenance has lowest level", () => {
    expect(ROLES.maintenance.level).toBe(10);
  });

  it("each role has label and description", () => {
    for (const role of Object.values(ROLES)) {
      expect(role.label).toBeTruthy();
      expect(role.description).toBeTruthy();
    }
  });
});

describe("hasPermission", () => {
  it("owner has all permissions", () => {
    expect(hasPermission("owner", "properties:read")).toBe(true);
    expect(hasPermission("owner", "properties:write")).toBe(true);
    expect(hasPermission("owner", "team:manage")).toBe(true);
    expect(hasPermission("owner", "settings:write")).toBe(true);
  });

  it("manager can read and write most resources", () => {
    expect(hasPermission("manager", "properties:read")).toBe(true);
    expect(hasPermission("manager", "properties:write")).toBe(true);
    expect(hasPermission("manager", "tenants:write")).toBe(true);
    expect(hasPermission("manager", "transactions:write")).toBe(true);
  });

  it("manager cannot manage team or write settings", () => {
    expect(hasPermission("manager", "team:manage")).toBe(false);
    expect(hasPermission("manager", "settings:write")).toBe(false);
  });

  it("viewer can only read", () => {
    expect(hasPermission("viewer", "properties:read")).toBe(true);
    expect(hasPermission("viewer", "properties:write")).toBe(false);
    expect(hasPermission("viewer", "tenants:read")).toBe(true);
    expect(hasPermission("viewer", "tenants:write")).toBe(false);
  });

  it("maintenance can only access maintenance and basic reads", () => {
    expect(hasPermission("maintenance", "maintenance:read")).toBe(true);
    expect(hasPermission("maintenance", "maintenance:write")).toBe(true);
    expect(hasPermission("maintenance", "properties:read")).toBe(true);
    expect(hasPermission("maintenance", "tenants:read")).toBe(true);
    expect(hasPermission("maintenance", "transactions:read")).toBe(false);
    expect(hasPermission("maintenance", "leases:read")).toBe(false);
  });

  it("returns false for invalid role", () => {
    expect(hasPermission("invalid" as Role, "properties:read")).toBe(false);
  });
});

describe("getPermissions", () => {
  it("returns all permissions for owner", () => {
    const perms = getPermissions("owner");
    expect(perms.length).toBeGreaterThan(15);
    expect(perms).toContain("team:manage");
  });

  it("returns fewer permissions for viewer than owner", () => {
    const ownerPerms = getPermissions("owner");
    const viewerPerms = getPermissions("viewer");
    expect(viewerPerms.length).toBeLessThan(ownerPerms.length);
  });

  it("maintenance has fewest permissions", () => {
    const maintenancePerms = getPermissions("maintenance");
    const viewerPerms = getPermissions("viewer");
    expect(maintenancePerms.length).toBeLessThan(viewerPerms.length);
  });

  it("returns empty array for invalid role", () => {
    expect(getPermissions("invalid" as Role)).toEqual([]);
  });
});

describe("canRead / canWrite", () => {
  it("owner can read and write everything", () => {
    expect(canRead("owner", "properties")).toBe(true);
    expect(canWrite("owner", "properties")).toBe(true);
    expect(canRead("owner", "team")).toBe(true);
  });

  it("viewer can read but not write", () => {
    expect(canRead("viewer", "properties")).toBe(true);
    expect(canWrite("viewer", "properties")).toBe(false);
    expect(canRead("viewer", "transactions")).toBe(true);
    expect(canWrite("viewer", "transactions")).toBe(false);
  });

  it("maintenance can only write maintenance", () => {
    expect(canWrite("maintenance", "maintenance")).toBe(true);
    expect(canWrite("maintenance", "properties")).toBe(false);
    expect(canWrite("maintenance", "transactions")).toBe(false);
  });

  it("manager can write most but not team:manage", () => {
    expect(canWrite("manager", "properties")).toBe(true);
    expect(canWrite("manager", "leases")).toBe(true);
    expect(canWrite("manager", "settings")).toBe(false);
  });
});

describe("Permission consistency", () => {
  it("write implies read for all roles", () => {
    const roles: Role[] = ["owner", "manager", "viewer", "maintenance"];
    const resources = ["properties", "tenants", "leases", "transactions", "maintenance", "listings"];

    for (const role of roles) {
      for (const resource of resources) {
        if (canWrite(role, resource)) {
          expect(canRead(role, resource)).toBe(true);
        }
      }
    }
  });

  it("higher roles have superset of lower role permissions", () => {
    const viewerPerms = new Set(getPermissions("viewer"));
    const managerPerms = new Set(getPermissions("manager"));

    for (const perm of viewerPerms) {
      expect(managerPerms.has(perm)).toBe(true);
    }
  });

  it("owner has superset of manager permissions", () => {
    const managerPerms = new Set(getPermissions("manager"));
    const ownerPerms = new Set(getPermissions("owner"));

    for (const perm of managerPerms) {
      expect(ownerPerms.has(perm)).toBe(true);
    }
  });
});
