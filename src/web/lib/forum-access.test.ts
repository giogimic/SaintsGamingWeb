import { describe, expect, it } from "vitest";
import { PERMISSION_LEVELS } from "./permissions";
import {
  canAccessRestrictedBoard,
  isRestrictedBoard,
} from "./forum-access";

const openBoard = {
  reqWriter: false,
  reqVIP: false,
  reqFounder: false,
  reqTrusted: false,
};

const writerBoard = {
  reqWriter: true,
  reqVIP: false,
  reqFounder: false,
  reqTrusted: false,
};

const vipBoard = {
  reqWriter: false,
  reqVIP: true,
  reqFounder: false,
  reqTrusted: false,
};

describe("forum-access", () => {
  it("detects restricted boards", () => {
    expect(isRestrictedBoard(openBoard)).toBe(false);
    expect(isRestrictedBoard(writerBoard)).toBe(true);
    expect(isRestrictedBoard(vipBoard)).toBe(true);
  });

  it("allows everyone on unrestricted boards", () => {
    expect(canAccessRestrictedBoard(openBoard, null)).toBe(true);
    expect(canAccessRestrictedBoard(openBoard, { permissionLevel: 0 })).toBe(true);
  });

  it("denies anonymous users on restricted boards", () => {
    expect(canAccessRestrictedBoard(writerBoard, null)).toBe(false);
    expect(canAccessRestrictedBoard(writerBoard, undefined)).toBe(false);
  });

  it("grants Head Moderator+ staff bypass", () => {
    expect(
      canAccessRestrictedBoard(writerBoard, {
        permissionLevel: PERMISSION_LEVELS.HEAD_MODERATOR,
      })
    ).toBe(true);
    expect(
      canAccessRestrictedBoard(vipBoard, {
        permissionLevel: PERMISSION_LEVELS.MODERATOR,
      })
    ).toBe(false);
  });

  it("requires matching role flags for members", () => {
    expect(
      canAccessRestrictedBoard(writerBoard, {
        permissionLevel: PERMISSION_LEVELS.USER,
        isWriter: true,
      })
    ).toBe(true);
    expect(
      canAccessRestrictedBoard(writerBoard, {
        permissionLevel: PERMISSION_LEVELS.USER,
        isVIP: true,
      })
    ).toBe(false);
    expect(
      canAccessRestrictedBoard(vipBoard, {
        permissionLevel: PERMISSION_LEVELS.USER,
        isVIP: true,
      })
    ).toBe(true);
  });
});
