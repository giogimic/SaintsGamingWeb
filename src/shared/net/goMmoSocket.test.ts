import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  goMmoPublicUrl,
  isGoMmoSocketEnabled,
  lobbySocketAuth,
  lobbySocketConnect,
} from "./goMmoSocket";

describe("goMmoSocket", () => {
  const prev = process.env.NEXT_PUBLIC_GO_MMO_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_GO_MMO_URL;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_GO_MMO_URL;
    else process.env.NEXT_PUBLIC_GO_MMO_URL = prev;
  });

  it("disabled when env unset", () => {
    expect(goMmoPublicUrl()).toBeUndefined();
    expect(isGoMmoSocketEnabled()).toBe(false);
    const c = lobbySocketConnect("acc1");
    expect(c.url).toBeUndefined();
    expect(c.options.auth).toEqual({ token: "acc1" });
  });

  it("strips trailing slash and enables Go URL", () => {
    process.env.NEXT_PUBLIC_GO_MMO_URL = "http://127.0.0.1:3001/";
    expect(goMmoPublicUrl()).toBe("http://127.0.0.1:3001");
    expect(isGoMmoSocketEnabled()).toBe(true);
    const c = lobbySocketConnect("acc1");
    expect(c.url).toBe("http://127.0.0.1:3001");
    expect(c.options.withCredentials).toBe(true);
    expect(c.options.path).toBe("/socket.io/");
  });

  it("auth token is account id", () => {
    expect(lobbySocketAuth("u42")).toEqual({ token: "u42" });
  });
});
