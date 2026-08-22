import { GET as getAuthmeOverview } from "../../app/api/authme/overview/route";
import { GET as getAuthmePlayer } from "../../app/api/authme/players/[username]/route";
import { GET as getAuthmePlayers } from "../../app/api/authme/players/route";
import { GET as getAuthmeRecent } from "../../app/api/authme/recent/route";
import { GET as getAuthmeTrend } from "../../app/api/authme/trend/route";
import { GET as getCompanionsOverview } from "../../app/api/companions/overview/route";
import { GET as getCompanionsPlayer } from "../../app/api/companions/players/[uuid]/route";
import { GET as getCompanionsPlayers } from "../../app/api/companions/players/route";
import { GET as getCompanionsRanking } from "../../app/api/companions/ranking/route";
import { PUT as putMysqlConfig } from "../../app/api/mysql/config/route";
import { GET as getMysqlStatus } from "../../app/api/mysql/status/route";
import { POST as postMysqlTest } from "../../app/api/mysql/test/route";
import { GET as getPlayer } from "../../app/api/players/[key]/route";
import { GET as getPlayerTimeline } from "../../app/api/players/[key]/timeline/route";
import { GET as getPlayers } from "../../app/api/players/route";
import { GET as getSignInOverview } from "../../app/api/playersignin/overview/route";
import { GET as getSignInRecords } from "../../app/api/playersignin/players/[uuid]/records/route";
import { GET as getSignInPlayer } from "../../app/api/playersignin/players/[uuid]/route";
import { GET as getSignInPlayers } from "../../app/api/playersignin/players/route";
import { GET as getSignInRanking } from "../../app/api/playersignin/ranking/route";
import { GET as getTodaySignIns } from "../../app/api/playersignin/today/route";
import { GET as getSignInTrend } from "../../app/api/playersignin/trend/route";
import { GET as getOnlinePlayers } from "../../app/api/playertime/online/route";
import { GET as getPlayTimeOverview } from "../../app/api/playertime/overview/route";
import { GET as getPlayTimePlayer } from "../../app/api/playertime/players/[uuid]/route";
import { GET as getPlayerSessions } from "../../app/api/playertime/players/[uuid]/sessions/route";
import { GET as getPlayTimePlayers } from "../../app/api/playertime/players/route";
import { GET as getPlayTimeRanking } from "../../app/api/playertime/ranking/route";
import { GET as getPlayTimeTrend } from "../../app/api/playertime/trend/route";
import { GET as getTitleList } from "../../app/api/playertitle/list/route";
import { GET as getTitleOverview } from "../../app/api/playertitle/overview/route";
import { GET as getTitlePlayer } from "../../app/api/playertitle/players/[uuid]/route";
import { GET as getTitlePlayers } from "../../app/api/playertitle/players/route";
import { GET as getTitleRanking } from "../../app/api/playertitle/ranking/route";
import {
  AUTH_COOKIE_NAME,
  verifySessionToken,
} from "../../lib/server/auth";
import {
  configureRuntimeEnv,
} from "../../lib/server/runtime-env";

const EMPTY_PARAMS = Object.freeze({});

function exact(method, pathname, handler) {
  return {
    method,
    match: (value) => (value === pathname ? EMPTY_PARAMS : null),
    handler,
  };
}

function dynamic(method, pattern, keys, handler) {
  return {
    method,
    match: (pathname) => {
      const match = pattern.exec(pathname);
      if (!match) return null;
      try {
        return Object.fromEntries(
          keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]),
        );
      } catch {
        return null;
      }
    },
    handler,
  };
}

const ROUTES = [
  exact("GET", "/authme/overview", () => getAuthmeOverview()),
  exact("GET", "/authme/players", (request) => getAuthmePlayers(request)),
  dynamic(
    "GET",
    /^\/authme\/players\/([^/]+)$/,
    ["username"],
    (request, params) =>
      getAuthmePlayer(request, {
        params: Promise.resolve({ username: params.username }),
      }),
  ),
  exact("GET", "/authme/recent", () => getAuthmeRecent()),
  exact("GET", "/authme/trend", (request) => getAuthmeTrend(request)),
  exact("GET", "/companions/overview", () => getCompanionsOverview()),
  exact("GET", "/companions/players", (request) =>
    getCompanionsPlayers(request),
  ),
  dynamic(
    "GET",
    /^\/companions\/players\/([^/]+)$/,
    ["uuid"],
    (request, params) =>
      getCompanionsPlayer(request, {
        params: Promise.resolve({ uuid: params.uuid }),
      }),
  ),
  exact("GET", "/companions/ranking", () => getCompanionsRanking()),
  exact("PUT", "/mysql/config", (request) => putMysqlConfig(request)),
  exact("GET", "/mysql/status", () => getMysqlStatus()),
  exact("POST", "/mysql/test", (request) => postMysqlTest(request)),
  exact("GET", "/players", (request) => getPlayers(request)),
  dynamic(
    "GET",
    /^\/players\/([^/]+)\/timeline$/,
    ["key"],
    (request, params) =>
      getPlayerTimeline(request, {
        params: Promise.resolve({ key: params.key }),
      }),
  ),
  dynamic(
    "GET",
    /^\/players\/([^/]+)$/,
    ["key"],
    (request, params) =>
      getPlayer(request, {
        params: Promise.resolve({ key: params.key }),
      }),
  ),
  exact("GET", "/playersignin/overview", () => getSignInOverview()),
  exact("GET", "/playersignin/players", (request) =>
    getSignInPlayers(request),
  ),
  dynamic(
    "GET",
    /^\/playersignin\/players\/([^/]+)\/records$/,
    ["uuid"],
    (request, params) =>
      getSignInRecords(request, {
        params: Promise.resolve({ uuid: params.uuid }),
      }),
  ),
  dynamic(
    "GET",
    /^\/playersignin\/players\/([^/]+)$/,
    ["uuid"],
    (request, params) =>
      getSignInPlayer(request, {
        params: Promise.resolve({ uuid: params.uuid }),
      }),
  ),
  exact("GET", "/playersignin/ranking", () => getSignInRanking()),
  exact("GET", "/playersignin/today", () => getTodaySignIns()),
  exact("GET", "/playersignin/trend", (request) =>
    getSignInTrend(request),
  ),
  exact("GET", "/playertime/online", () => getOnlinePlayers()),
  exact("GET", "/playertime/overview", () => getPlayTimeOverview()),
  exact("GET", "/playertime/players", (request) =>
    getPlayTimePlayers(request),
  ),
  dynamic(
    "GET",
    /^\/playertime\/players\/([^/]+)\/sessions$/,
    ["uuid"],
    (request, params) =>
      getPlayerSessions(request, {
        params: Promise.resolve({ uuid: params.uuid }),
      }),
  ),
  dynamic(
    "GET",
    /^\/playertime\/players\/([^/]+)$/,
    ["uuid"],
    (request, params) =>
      getPlayTimePlayer(request, {
        params: Promise.resolve({ uuid: params.uuid }),
      }),
  ),
  exact("GET", "/playertime/ranking", (request) =>
    getPlayTimeRanking(request),
  ),
  exact("GET", "/playertime/trend", (request) => getPlayTimeTrend(request)),
  exact("GET", "/playertitle/list", (request) => getTitleList(request)),
  exact("GET", "/playertitle/overview", () => getTitleOverview()),
  exact("GET", "/playertitle/players", (request) =>
    getTitlePlayers(request),
  ),
  dynamic(
    "GET",
    /^\/playertitle\/players\/([^/]+)$/,
    ["uuid"],
    (request, params) =>
      getTitlePlayer(request, {
        params: Promise.resolve({ uuid: params.uuid }),
      }),
  ),
  exact("GET", "/playertitle/ranking", () => getTitleRanking()),
];

function cookieValue(request, name) {
  const prefix = `${name}=`;
  const item = request.headers
    .get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));
  if (!item) return undefined;
  try {
    return decodeURIComponent(item.slice(prefix.length));
  } catch {
    return undefined;
  }
}

function apiPath(request) {
  const pathname = new URL(request.url).pathname;
  const value =
    pathname === "/api"
      ? "/"
      : pathname.startsWith("/api/")
        ? pathname.slice(4)
        : pathname;
  return value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;
}

/** EdgeOne Node Cloud Functions 的统一 API 入口。 */
export async function onRequest(context) {
  configureRuntimeEnv(context.env);
  const token = cookieValue(context.request, AUTH_COOKIE_NAME);
  if (!(await verifySessionToken(token))) {
    return Response.json(
      { message: "未登录或登录已失效" },
      { status: 401 },
    );
  }

  const pathname = apiPath(context.request);
  let pathMatched = false;
  for (const route of ROUTES) {
    const params = route.match(pathname);
    if (!params) continue;
    pathMatched = true;
    if (route.method === context.request.method) {
      return route.handler(context.request, params);
    }
  }
  return Response.json(
    { message: pathMatched ? "请求方法不受支持" : "接口不存在" },
    { status: pathMatched ? 405 : 404 },
  );
}
