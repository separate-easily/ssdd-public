/**
 * ============================================================
 * Backend API Server (Supabase Edge Function)
 * ============================================================
 *
 * Project: gnqpjcaxyvqsxqfjfalv
 * Function: server
 *
 * IMPORTANT: Supabase passes the function name as part of the path.
 * When calling /functions/v1/server/auth/signup, Hono receives /server/auth/signup
 * Therefore we use basePath('/server') to match routes correctly.
 * ============================================================
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import bcrypt from "npm:bcryptjs@2.4.3";
import * as kv from "./kv_store.tsx";

const app = new Hono().basePath('/server');

// ==================== Auth Helpers ====================
//
// Admin credentials and the token signing secret are read from Edge
// Function secrets (set with `supabase secrets set`), never hardcoded.
// Required secrets:
//   ADMIN_EMAIL           - admin login email
//   ADMIN_PASSWORD_HASH   - bcrypt hash of the admin password
//   AUTH_JWT_SECRET       - random secret used to sign session tokens

async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
  const adminEmail = Deno.env.get("ADMIN_EMAIL");
  const adminPasswordHash = Deno.env.get("ADMIN_PASSWORD_HASH");
  if (!adminEmail || !adminPasswordHash) {
    console.error("ADMIN_EMAIL / ADMIN_PASSWORD_HASH secrets are not configured");
    return false;
  }
  if (email !== adminEmail) return false;
  return await bcrypt.compare(password, adminPasswordHash);
}

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("AUTH_JWT_SECRET");
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET secret is not configured");
  }
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Issues a signed, expiring session token (JWT-compatible HS256 format). */
async function signToken(payload: Record<string, unknown>, expiresInSeconds = 60 * 60 * 24): Promise<string> {
  const key = await getSigningKey();
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  const encoder = new TextEncoder();
  const headerPart = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadPart = base64UrlEncode(encoder.encode(JSON.stringify(body)));
  const signingInput = `${headerPart}.${payloadPart}`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  const signaturePart = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${signaturePart}`;
}

/** Verifies a token issued by signToken(). Returns the payload, or null if invalid/expired. */
async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const [headerPart, payloadPart, signaturePart] = token.split(".");
    if (!headerPart || !payloadPart || !signaturePart) return null;

    const key = await getSigningKey();
    const encoder = new TextEncoder();
    const signingInput = `${headerPart}.${payloadPart}`;
    const valid = await crypto.subtle.verify("HMAC", key, base64UrlDecode(signaturePart), encoder.encode(signingInput));
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart)));
    if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) return null;

    return payload;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

/** Hono middleware: requires a valid admin session token in the X-Admin-Token header. */
async function requireAdminAuth(c: any, next: () => Promise<void>) {
  const token = c.req.header("X-Admin-Token");
  const payload = token ? await verifyToken(token) : null;

  if (!payload || payload.role !== "admin") {
    return c.json({ success: false, message: "관리자 인증이 필요합니다." }, 401);
  }

  return next();
}

// Enable CORS for all routes
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// ==================== Health Check ====================
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==================== Auth: ID <-> Email Mapping ====================

// POST /auth/map-id
app.post("/auth/map-id", async (c) => {
  try {
    const { id, email } = await c.req.json();

    const existingEmail = await kv.get(`auth:id:${id}`);
    if (existingEmail) {
      return c.json({ success: false, message: "이미 사용 중인 아이디입니다." }, 400);
    }

    await kv.set(`auth:id:${id}`, email);
    return c.json({ success: true, message: "ID mapped successfully" });
  } catch (error) {
    console.error("ID mapping error:", error);
    return c.json({ success: false, message: "Server error during ID mapping" }, 500);
  }
});

// POST /auth/get-email-by-id
app.post("/auth/get-email-by-id", async (c) => {
  try {
    const { id } = await c.req.json();

    const email = await kv.get(`auth:id:${id}`);
    if (!email) {
      return c.json({ success: false, message: "존재하지 않는 아이디입니다." }, 404);
    }

    return c.json({ success: true, email });
  } catch (error) {
    console.error("Get email error:", error);
    return c.json({ success: false, message: "Server error during email lookup" }, 500);
  }
});

// ==================== Admin Authentication ====================

// POST /auth/admin-login
app.post("/auth/admin-login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (await verifyAdminCredentials(email, password)) {
      const token = await signToken({ role: "admin", email });
      return c.json({ success: true, role: "admin", token });
    }

    return c.json({ success: false, message: "Invalid credentials" }, 401);
  } catch (error) {
    console.error("Admin login error:", error);
    return c.json({ success: false, message: "Server error during login" }, 500);
  }
});

// ==================== User Authentication ====================

// POST /auth/signup
app.post("/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    const existingUser = await kv.get(`user:${email}`);
    if (existingUser) {
      return c.json({ success: false, message: "이미 등록된 이메일입니다." }, 400);
    }

    const userData = {
      email,
      passwordHash: await hashPassword(password),
      name,
      createdAt: new Date().toISOString()
    };

    await kv.set(`user:${email}`, userData);

    return c.json({
      success: true,
      user: { email, name },
      message: "회원가입이 완료되었습니다."
    });
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ success: false, message: "회원가입 중 오류가 발생했습니다." }, 500);
  }
});

// POST /auth/login
app.post("/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    // Check if admin
    if (await verifyAdminCredentials(email, password)) {
      const token = await signToken({ role: "admin", email });
      return c.json({ success: true, role: "admin", token });
    }

    // Check regular user
    const userData = await kv.get(`user:${email}`);
    if (!userData) {
      return c.json({ success: false, message: "등록되지 않은 이메일입니다." }, 404);
    }

    if (!(await verifyPassword(password, userData.passwordHash))) {
      return c.json({ success: false, message: "비밀번호가 일치하지 않습니다." }, 401);
    }

    const token = await signToken({ role: "user", email: userData.email });
    return c.json({
      success: true,
      role: "user",
      user: { email: userData.email, name: userData.name },
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ success: false, message: "로그인 중 오류가 발생했습니다." }, 500);
  }
});

// POST /auth/update-password
app.post("/auth/update-password", async (c) => {
  try {
    const { email, oldPassword, newPassword } = await c.req.json();

    const userData = await kv.get(`user:${email}`);
    if (!userData) {
      return c.json({ success: false, message: "사용자를 찾을 수 없습니다." }, 404);
    }

    if (!(await verifyPassword(oldPassword, userData.passwordHash))) {
      return c.json({ success: false, message: "현재 비밀번호가 일치하지 않습니다." }, 401);
    }

    userData.passwordHash = await hashPassword(newPassword);
    await kv.set(`user:${email}`, userData);

    return c.json({ success: true, message: "비밀번호가 성공적으로 변경되었습니다." });
  } catch (error) {
    console.error("Update password error:", error);
    return c.json({ success: false, message: "비밀번호 변경 중 오류가 발생했습니다." }, 500);
  }
});

// ==================== Institution Management ====================

// POST /institution/create
app.post("/institution/create", requireAdminAuth, async (c) => {
  try {
    const { name, ownerId } = await c.req.json();
    const id = `inst_${Date.now()}`;

    await kv.set(`institution:${id}`, {
      id,
      name,
      ownerId: ownerId || null,
      createdAt: new Date().toISOString()
    });

    return c.json({ success: true, institution: { id, name, ownerId } });
  } catch (error) {
    console.error("Institution creation error:", error);
    return c.json({ success: false, message: "Failed to create institution" }, 500);
  }
});

// POST /institution/list
app.post("/institution/list", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const ownerId = body.ownerId || null;

    const institutions = await kv.getByPrefix("institution:");

    let filtered = institutions.filter((inst: any) =>
      inst && inst.id && inst.id.startsWith("inst_")
    );

    if (ownerId) {
      filtered = filtered.filter((inst: any) => inst.ownerId === ownerId);
    }

    filtered.sort((a: any, b: any) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return c.json({ success: true, institutions: filtered });
  } catch (error) {
    console.error("Institution list error:", error);
    return c.json({ success: false, message: "Failed to get institutions" }, 500);
  }
});

// GET /institution/list
app.get("/institution/list", async (c) => {
  try {
    const institutions = await kv.getByPrefix("institution:");
    const filtered = institutions.filter((inst: any) =>
      inst && inst.id && inst.id.startsWith("inst_")
    );
    return c.json({ success: true, institutions: filtered });
  } catch (error) {
    console.error("Institution list error:", error);
    return c.json({ success: false, message: "Failed to get institutions" }, 500);
  }
});

// DELETE /institution/delete/:institutionId
app.delete("/institution/delete/:institutionId", requireAdminAuth, async (c) => {
  try {
    const institutionId = c.req.param("institutionId");

    await kv.del(`institution:${institutionId}`);

    const allChildren = await kv.getByPrefix("child:");
    const childrenToDelete = allChildren.filter((child: any) =>
      child && child.institutionId === institutionId
    );

    for (const child of childrenToDelete) {
      if (child.qrId) {
        await kv.del(`child:${child.qrId}:${institutionId}`);
      }
    }

    return c.json({ success: true, message: "Institution deleted successfully" });
  } catch (error) {
    console.error("Institution deletion error:", error);
    return c.json({ success: false, message: "Failed to delete institution" }, 500);
  }
});

// POST /institution/lookup
app.post("/institution/lookup", async (c) => {
  try {
    const { institutionName } = await c.req.json();
    const institutions = await kv.getByPrefix("institution:");
    const found = institutions.find((inst: any) =>
      inst && inst.name && inst.name.toLowerCase().includes(institutionName.toLowerCase())
    );

    if (found) {
      return c.json({ success: true, institution: found });
    }

    return c.json({ success: false, message: "Institution not found" }, 404);
  } catch (error) {
    console.error("Institution lookup error:", error);
    return c.json({ success: false, message: "Failed to lookup institution" }, 500);
  }
});

// ==================== Team Management ====================

// POST /institution/teams/update
app.post("/institution/teams/update", requireAdminAuth, async (c) => {
  try {
    const { institutionId, teams } = await c.req.json();
    await kv.set(`institution:${institutionId}:teams`, teams);
    return c.json({ success: true, teams });
  } catch (error) {
    console.error("Team update error:", error);
    return c.json({ success: false, message: "Failed to update teams" }, 500);
  }
});

// POST /institution/teams/list
app.post("/institution/teams/list", async (c) => {
  try {
    const { institutionId } = await c.req.json();
    const teams = await kv.get(`institution:${institutionId}:teams`) || [];
    return c.json({ success: true, teams });
  } catch (error) {
    console.error("Team list error:", error);
    return c.json({ success: false, message: "Failed to list teams" }, 500);
  }
});

// ==================== Child Management ====================

// POST /child/register
app.post("/child/register", requireAdminAuth, async (c) => {
  try {
    const { qrId, name, age, institutionId, team } = await c.req.json();

    const allChildren = await kv.getByPrefix("child:");
    const existingChild = allChildren.find((child: any) =>
      child && child.qrId === qrId && child.institutionId === institutionId
    );

    if (existingChild) {
      return c.json({ success: false, message: "이 QR ID는 이미 등록되어 있습니다." }, 400);
    }

    const childData = {
      qrId,
      name,
      age,
      institutionId,
      team: team || null,
      points: 0,
      registeredAt: new Date().toISOString()
    };

    await kv.set(`child:${qrId}:${institutionId}`, childData);

    return c.json({ success: true, child: childData });
  } catch (error) {
    console.error("Child registration error:", error);
    return c.json({ success: false, message: "Failed to register child" }, 500);
  }
});

// GET /child/list/:institutionId
app.get("/child/list/:institutionId", async (c) => {
  try {
    const institutionId = c.req.param("institutionId");

    const allChildren = await kv.getByPrefix("child:");
    const children = allChildren.filter((child: any) =>
      child && child.institutionId === institutionId
    );

    return c.json({ success: true, children });
  } catch (error) {
    console.error("Child list error:", error);
    return c.json({ success: false, message: "Failed to get children" }, 500);
  }
});

// POST /child/reset
app.post("/child/reset", requireAdminAuth, async (c) => {
  try {
    const { qrId, currentInstitutionId } = await c.req.json();

    const childData = await kv.get(`child:${qrId}:${currentInstitutionId}`);
    if (childData) {
      const archiveKey = `archive:${qrId}:${currentInstitutionId}:${Date.now()}`;
      await kv.set(archiveKey, childData);
      await kv.del(`child:${qrId}:${currentInstitutionId}`);
    }

    return c.json({ success: true, message: "Child data reset successfully" });
  } catch (error) {
    console.error("Child reset error:", error);
    return c.json({ success: false, message: "Failed to reset child data" }, 500);
  }
});

// POST /child/add-points
app.post("/child/add-points", async (c) => {
  try {
    const { qrId, institutionId, points } = await c.req.json();

    const childData = await kv.get(`child:${qrId}:${institutionId}`);
    if (!childData) {
      return c.json({ success: false, message: "Child not found" }, 404);
    }

    childData.points = (childData.points || 0) + points;
    await kv.set(`child:${qrId}:${institutionId}`, childData);

    return c.json({ success: true, child: childData });
  } catch (error) {
    console.error("Add points error:", error);
    return c.json({ success: false, message: "Failed to add points" }, 500);
  }
});

// DELETE /child/delete
app.delete("/child/delete", requireAdminAuth, async (c) => {
  try {
    const { qrId, institutionId } = await c.req.json();
    await kv.del(`child:${qrId}:${institutionId}`);
    return c.json({ success: true, message: "Child deleted successfully" });
  } catch (error) {
    console.error("Child deletion error:", error);
    return c.json({ success: false, message: "Failed to delete child" }, 500);
  }
});

// ==================== Points Management ====================

// POST /points/update
app.post("/points/update", async (c) => {
  try {
    const { qrId, institutionId, points } = await c.req.json();

    const childData = await kv.get(`child:${qrId}:${institutionId}`);
    if (!childData) {
      return c.json({ success: false, message: "Child not found" }, 404);
    }

    childData.points = (childData.points || 0) + points;
    await kv.set(`child:${qrId}:${institutionId}`, childData);

    return c.json({ success: true, child: childData, newPoints: childData.points });
  } catch (error) {
    console.error("Points update error:", error);
    return c.json({ success: false, message: "Failed to update points" }, 500);
  }
});

// ==================== Child Update ====================

// POST /child/update - 아동 정보 수정 (이름, 나이, 반, 팀, 포인트 직접 설정)
app.post("/child/update", requireAdminAuth, async (c) => {
  try {
    const { qrId, institutionId, name, age, team, className, points } = await c.req.json();

    const childData = await kv.get(`child:${qrId}:${institutionId}`);
    if (!childData) {
      return c.json({ success: false, message: "Child not found" }, 404);
    }

    // 변경된 필드만 업데이트
    if (name !== undefined) childData.name = name;
    if (age !== undefined) childData.age = age;
    if (team !== undefined) childData.team = team;
    if (className !== undefined) childData.className = className;
    if (points !== undefined) childData.points = points;

    childData.updatedAt = new Date().toISOString();

    await kv.set(`child:${qrId}:${institutionId}`, childData);

    return c.json({ success: true, child: childData });
  } catch (error) {
    console.error("Child update error:", error);
    return c.json({ success: false, message: "Failed to update child" }, 500);
  }
});

// GET /child/get/:qrId/:institutionId - 아동 상세 조회
app.get("/child/get/:qrId/:institutionId", async (c) => {
  try {
    const qrId = c.req.param("qrId");
    const institutionId = c.req.param("institutionId");

    const childData = await kv.get(`child:${qrId}:${institutionId}`);
    if (!childData) {
      return c.json({ success: false, message: "Child not found" }, 404);
    }

    return c.json({ success: true, child: childData });
  } catch (error) {
    console.error("Child get error:", error);
    return c.json({ success: false, message: "Failed to get child" }, 500);
  }
});

// ==================== Activity Log Management ====================

// POST /activity-log/save - 활동 로그 저장
app.post("/activity-log/save", async (c) => {
  try {
    const {
      childQrId,
      institutionId,
      sessionId,
      roundId,
      logType,        // 'login', 'logout', 'trash_correct', 'trash_wrong'
      materialLabel,  // 쓰레기 종류 (trash 타입일 때)
      recommendedBin, // AI 추천 배출통
      chosenBin,      // 실제 선택한 배출통
      pointsDelta,    // 획득 포인트
      isCorrect       // 정답 여부
    } = await c.req.json();

    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const logData = {
      id: logId,
      childQrId,
      institutionId,
      sessionId,
      roundId,
      logType,
      materialLabel: materialLabel || null,
      recommendedBin: recommendedBin || null,
      chosenBin: chosenBin || null,
      pointsDelta: pointsDelta || 0,
      isCorrect: isCorrect ?? null,
      createdAt: new Date().toISOString(),
      modifiedAt: null,
      modifiedReason: null
    };

    await kv.set(`activityLog:${childQrId}:${institutionId}:${logId}`, logData);

    return c.json({ success: true, log: logData });
  } catch (error) {
    console.error("Activity log save error:", error);
    return c.json({ success: false, message: "Failed to save activity log" }, 500);
  }
});

// GET /activity-log/list/:childQrId/:institutionId - 아동별 로그 조회
app.get("/activity-log/list/:childQrId/:institutionId", async (c) => {
  try {
    const childQrId = c.req.param("childQrId");
    const institutionId = c.req.param("institutionId");

    const allLogs = await kv.getByPrefix(`activityLog:${childQrId}:${institutionId}:`);

    // 최신순 정렬
    const sortedLogs = allLogs
      .filter((log: any) => log && log.id)
      .sort((a: any, b: any) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return c.json({ success: true, logs: sortedLogs });
  } catch (error) {
    console.error("Activity log list error:", error);
    return c.json({ success: false, message: "Failed to get activity logs" }, 500);
  }
});

// POST /activity-log/update - 활동 로그 수정 (포인트, 정답여부)
app.post("/activity-log/update", requireAdminAuth, async (c) => {
  try {
    const {
      logId,
      childQrId,
      institutionId,
      pointsDelta,    // 변경할 포인트
      isCorrect,      // 변경할 정답 여부
      modifiedReason  // 수정 사유
    } = await c.req.json();

    const logKey = `activityLog:${childQrId}:${institutionId}:${logId}`;
    const logData = await kv.get(logKey);

    if (!logData) {
      return c.json({ success: false, message: "Activity log not found" }, 404);
    }

    // 기존 포인트 저장 (아이 포인트 조정용)
    const oldPointsDelta = logData.pointsDelta || 0;

    // 로그 데이터 업데이트
    if (pointsDelta !== undefined) logData.pointsDelta = pointsDelta;
    if (isCorrect !== undefined) logData.isCorrect = isCorrect;
    logData.modifiedAt = new Date().toISOString();
    logData.modifiedReason = modifiedReason || null;

    await kv.set(logKey, logData);

    // 아이의 총 포인트도 조정
    const pointsDiff = (pointsDelta || 0) - oldPointsDelta;
    if (pointsDiff !== 0) {
      const childData = await kv.get(`child:${childQrId}:${institutionId}`);
      if (childData) {
        childData.points = (childData.points || 0) + pointsDiff;
        await kv.set(`child:${childQrId}:${institutionId}`, childData);
      }
    }

    return c.json({
      success: true,
      log: logData,
      pointsAdjusted: pointsDiff
    });
  } catch (error) {
    console.error("Activity log update error:", error);
    return c.json({ success: false, message: "Failed to update activity log" }, 500);
  }
});

// DELETE /activity-log/delete - 활동 로그 삭제
app.delete("/activity-log/delete", requireAdminAuth, async (c) => {
  try {
    const { logId, childQrId, institutionId } = await c.req.json();

    const logKey = `activityLog:${childQrId}:${institutionId}:${logId}`;
    const logData = await kv.get(logKey);

    if (!logData) {
      return c.json({ success: false, message: "Activity log not found" }, 404);
    }

    // 아이의 총 포인트에서 해당 로그의 포인트 차감
    const pointsToRemove = logData.pointsDelta || 0;
    if (pointsToRemove !== 0) {
      const childData = await kv.get(`child:${childQrId}:${institutionId}`);
      if (childData) {
        childData.points = (childData.points || 0) - pointsToRemove;
        await kv.set(`child:${childQrId}:${institutionId}`, childData);
      }
    }

    await kv.del(logKey);

    return c.json({
      success: true,
      message: "Activity log deleted",
      pointsRemoved: pointsToRemove
    });
  } catch (error) {
    console.error("Activity log delete error:", error);
    return c.json({ success: false, message: "Failed to delete activity log" }, 500);
  }
});

// ==================== Ranking ====================

// GET /ranking/:institutionId
app.get("/ranking/:institutionId", async (c) => {
  try {
    const institutionId = c.req.param("institutionId");

    const allChildren = await kv.getByPrefix("child:");
    const children = allChildren.filter((child: any) =>
      child && child.institutionId === institutionId
    );

    const ranking = children
      .sort((a: any, b: any) => (b.points || 0) - (a.points || 0))
      .map((child: any, index: number) => ({
        rank: index + 1,
        name: child.name,
        points: child.points || 0,
        qrId: child.qrId
      }));

    return c.json({ success: true, ranking });
  } catch (error) {
    console.error("Ranking error:", error);
    return c.json({ success: false, message: "Failed to get ranking" }, 500);
  }
});

// GET /ranking/global
app.get("/ranking/global", async (c) => {
  try {
    const allChildren = await kv.getByPrefix("child:");

    const validChildren = allChildren.filter((child: any) =>
      child && child.qrId && child.name
    );

    const globalRanking = validChildren
      .sort((a: any, b: any) => (b.points || 0) - (a.points || 0))
      .map((child: any, index: number) => ({
        rank: index + 1,
        name: child.name,
        points: child.points || 0,
        qrId: child.qrId
      }));

    return c.json({ success: true, ranking: globalRanking });
  } catch (error) {
    console.error("Global ranking error:", error);
    return c.json({ success: false, message: "Failed to get global ranking" }, 500);
  }
});

// ==================== 404 Handler ====================
app.notFound((c) => {
  return c.json({
    success: false,
    error: "Route not found",
    path: c.req.path,
    method: c.req.method
  }, 404);
});

// ==================== Error Handler ====================
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({
    success: false,
    error: "Internal server error",
    message: err.message
  }, 500);
});

// Start server
Deno.serve(app.fetch);