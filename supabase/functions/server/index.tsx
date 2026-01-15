/**
 * ============================================================
 * 🖥️ 백엔드 API 서버 (Backend Server)
 * ============================================================
 * 
 * 파일 위치: /supabase/functions/server/index.tsx
 * 
 * 이 파일만 수정하면 됩니다!
 * 
 * 포함된 API:
 * - 인증 (로그인, 회원가입)
 * - 기관 관리 (생성, 조회, 검색)
 * - 아동 관리 (등록, 조회, 초기화)
 * - 포인트 관리 (추가, 차감)
 * - 순위 (기관별, 전체)
 * 
 * 빠른 찾기:
 * - 관리자 로그인: Ctrl+F → "auth/admin-login"
 * - 기관 생성: Ctrl+F → "institution/create"
 * - 아동 등록: Ctrl+F → "child/register"
 * - 포인트 추가: Ctrl+F → "points/update"
 * ============================================================
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ==================== Auth: ID <-> Email Mapping ====================

// Check ID availability and Register ID mapping
app.post("/make-server-edd517d1/auth/map-id", async (c) => {
  try {
    const { id, email } = await c.req.json();
    
    // Check if ID already exists
    const existingEmail = await kv.get(`auth:id:${id}`);
    if (existingEmail) {
      return c.json({ success: false, message: "이미 사용 중인 아이디입니다." }, 400);
    }
    
    // Save mapping
    await kv.set(`auth:id:${id}`, email);
    
    return c.json({ success: true, message: "ID mapped successfully" });
  } catch (error) {
    console.log(`ID mapping error: ${error}`);
    return c.json({ success: false, message: "Server error during ID mapping" }, 500);
  }
});

// Get Email by ID
app.post("/make-server-edd517d1/auth/get-email-by-id", async (c) => {
  try {
    const { id } = await c.req.json();
    
    const email = await kv.get(`auth:id:${id}`);
    if (!email) {
      return c.json({ success: false, message: "존재하지 않는 아이디입니다." }, 404);
    }
    
    return c.json({ success: true, email });
  } catch (error) {
    console.log(`Get email error: ${error}`);
    return c.json({ success: false, message: "Server error during email lookup" }, 500);
  }
});

// ==================== Admin Authentication ====================
app.post("/make-server-edd517d1/auth/admin-login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    // Hard-coded admin credentials
    if (email === "Separaterecycling@ptu.com" && password === "ptu2025") {
      return c.json({
        success: true,
        role: "admin",
        token: "admin-token-12345" // Simple token for demo
      });
    }
    
    return c.json({ success: false, message: "Invalid credentials" }, 401);
  } catch (error) {
    console.log(`Admin login error: ${error}`);
    return c.json({ success: false, message: "Server error during login" }, 500);
  }
});

// ==================== User Authentication ====================
app.post("/make-server-edd517d1/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    // Check if user already exists
    const existingUser = await kv.get(`user:${email}`);
    if (existingUser) {
      return c.json({ success: false, message: "이미 등록된 이메일입니다." }, 400);
    }
    
    // Create new user
    const userData = {
      email,
      password, // In production, this should be hashed
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
    console.log(`Signup error: ${error}`);
    return c.json({ success: false, message: "회원가입 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-edd517d1/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    // Check if admin
    if (email === "Separaterecycling@ptu.com" && password === "ptu2025") {
      return c.json({
        success: true,
        role: "admin",
        token: "admin-token-12345"
      });
    }
    
    // Check regular user
    const userData = await kv.get(`user:${email}`);
    if (!userData) {
      return c.json({ success: false, message: "등록되지 않은 이메일입니다." }, 404);
    }
    
    if (userData.password !== password) {
      return c.json({ success: false, message: "비밀번호가 일치하지 않습니다." }, 401);
    }
    
    return c.json({
      success: true,
      role: "user",
      user: { email: userData.email, name: userData.name },
      token: `user-token-${Date.now()}`
    });
  } catch (error) {
    console.log(`Login error: ${error}`);
    return c.json({ success: false, message: "로그인 중 오류가 발생했습니다." }, 500);
  }
});

// Update Password (Fallback Auth)
app.post("/make-server-edd517d1/auth/update-password", async (c) => {
  try {
    const { email, oldPassword, newPassword } = await c.req.json();

    const userData = await kv.get(`user:${email}`);
    if (!userData) {
      return c.json({ success: false, message: "사용자를 찾을 수 없습니다." }, 404);
    }

    if (userData.password !== oldPassword) {
      return c.json({ success: false, message: "현재 비밀번호가 일치하지 않습니다." }, 401);
    }

    userData.password = newPassword;
    await kv.set(`user:${email}`, userData);

    return c.json({ success: true, message: "비밀번호가 성공적으로 변경되었습니다." });
  } catch (error) {
    console.log(`Update password error: ${error}`);
    return c.json({ success: false, message: "비밀번호 변경 중 오류가 발생했습니다." }, 500);
  }
});

// ==================== Institution Management ====================
app.post("/make-server-edd517d1/institution/create", async (c) => {
  try {
    // ownerId 추가: 기관을 생성한 사용자의 ID
    const { name, ownerId } = await c.req.json();
    const id = `inst_${Date.now()}`;
    
    // 개별 키에 저장 (prefix 검색을 위해 institution: 사용)
    await kv.set(`institution:${id}`, {
      id,
      name,
      ownerId: ownerId || null, // ownerId가 없으면 null (기존 호환성)
      createdAt: new Date().toISOString()
    });
    
    // Legacy support removal: We no longer maintain "institution:list" array key 
    // because it causes race conditions and data loss.
    // We now use getByPrefix("institution:") to retrieve the list.
    
    return c.json({ success: true, institution: { id, name, ownerId } });
  } catch (error) {
    console.log(`Institution creation error: ${error}`);
    return c.json({ success: false, message: "Failed to create institution" }, 500);
  }
});

// Updated: Filter by ownerId if provided
app.post("/make-server-edd517d1/institution/list", async (c) => {
  try {
    // POST request to send body with ownerId
    const { ownerId } = await c.req.json().catch(() => ({ ownerId: null }));
    
    // Use getByPrefix instead of get("institution:list") to avoid data loss
    const institutions = await kv.getByPrefix("institution:");
    
    // ownerId가 제공된 경우 해당 사용자의 기관만 필터링
    let filteredInstitutions = institutions;
    
    if (ownerId) {
      filteredInstitutions = institutions.filter((inst: any) => inst.ownerId === ownerId);
    }
    
    // Sort by createdAt desc if available, otherwise by id
    filteredInstitutions.sort((a: any, b: any) => {
        if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return b.id.localeCompare(a.id);
    });
    
    return c.json({ success: true, institutions: filteredInstitutions });
  } catch (error) {
    console.log(`Institution list error: ${error}`);
    return c.json({ success: false, message: "Failed to get institutions" }, 500);
  }
});

// Legacy GET support
app.get("/make-server-edd517d1/institution/list", async (c) => {
  try {
     const institutions = await kv.getByPrefix("institution:");
     return c.json({ success: true, institutions });
  } catch (error) {
    return c.json({ success: false, message: "Failed to get institutions" }, 500);
  }
});

// Delete institution
app.delete("/make-server-edd517d1/institution/delete/:institutionId", async (c) => {
  try {
    const institutionId = c.req.param("institutionId");
    
    // Delete institution data
    await kv.del(`institution:${institutionId}`);
    
    // Delete all children for this institution
    // Note: This only deletes the list key, not individual child records if they exist.
    // Ideally we should find all child records and delete them too.
    const allChildren = await kv.getByPrefix("child:");
    const childrenToDelete = allChildren.filter((child: any) => child.institutionId === institutionId);
    
    for (const child of childrenToDelete) {
        await kv.del(`child:${child.qrId}:${institutionId}`);
    }
    
    return c.json({ success: true, message: "Institution deleted successfully" });
  } catch (error) {
    console.log(`Institution deletion error: ${error}`);
    return c.json({ success: false, message: "Failed to delete institution" }, 500);
  }
});

// ==================== Child Management ====================
app.post("/make-server-edd517d1/child/register", async (c) => {
  try {
    const { qrId, name, age, institutionId } = await c.req.json();
    
    // Check if child already exists
    // We fetch all children to check, since we moved away from list keys
    const allChildren = await kv.getByPrefix("child:");
    const existingChild = allChildren.find((child: any) => child.qrId === qrId && child.institutionId === institutionId);
    
    if (existingChild) {
      return c.json({ success: false, message: "이 QR ID는 이미 등록되어 있습니다." }, 400);
    }
    
    // team 파라미터 추가
    const { team } = await c.req.json();

    const childData = {
      qrId,
      name,
      age,
      institutionId,
      team: team || null, // 팀 정보 저장
      points: 0,
      registeredAt: new Date().toISOString()
    };
    
    await kv.set(`child:${qrId}:${institutionId}`, childData);
    
    return c.json({ success: true, child: childData });
  } catch (error) {
    console.log(`Child registration error: ${error}`);
    return c.json({ success: false, message: "Failed to register child" }, 500);
  }
});

app.get("/make-server-edd517d1/child/list/:institutionId", async (c) => {
  try {
    const institutionId = c.req.param("institutionId");
    
    // Use prefix search and filter
    const allChildren = await kv.getByPrefix("child:");
    const children = allChildren.filter((child: any) => child.institutionId === institutionId);
    
    return c.json({ success: true, children });
  } catch (error) {
    console.log(`Child list error: ${error}`);
    return c.json({ success: false, message: "Failed to get children" }, 500);
  }
});

app.post("/make-server-edd517d1/child/reset", async (c) => {
  try {
    const { qrId, currentInstitutionId } = await c.req.json();
    
    // Archive current data
    const childData = await kv.get(`child:${qrId}:${currentInstitutionId}`);
    if (childData) {
      const archiveKey = `archive:${qrId}:${currentInstitutionId}:${Date.now()}`;
      await kv.set(archiveKey, childData);
      
      // Delete current data
      await kv.del(`child:${qrId}:${currentInstitutionId}`);
    }
    
    return c.json({ success: true, message: "Child data reset successfully" });
  } catch (error) {
    console.log(`Child reset error: ${error}`);
    return c.json({ success: false, message: "Failed to reset child data" }, 500);
  }
});

// ==================== Team Management ====================
app.post("/make-server-edd517d1/institution/teams/update", async (c) => {
  try {
    const { institutionId, teams } = await c.req.json();
    await kv.set(`institution:${institutionId}:teams`, teams);
    return c.json({ success: true, teams });
  } catch (error) {
    console.log(`Team update error: ${error}`);
    return c.json({ success: false, message: "Failed to update teams" }, 500);
  }
});

app.post("/make-server-edd517d1/institution/teams/list", async (c) => {
  try {
    const { institutionId } = await c.req.json();
    const teams = await kv.get(`institution:${institutionId}:teams`) || [];
    return c.json({ success: true, teams });
  } catch (error) {
    console.log(`Team list error: ${error}`);
    return c.json({ success: false, message: "Failed to list teams" }, 500);
  }
});

// ==================== Points Management ====================
app.post("/make-server-edd517d1/points/update", async (c) => {
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
    console.log(`Points update error: ${error}`);
    return c.json({ success: false, message: "Failed to update points" }, 500);
  }
});

// Add points endpoint (alternative to points/update)
app.post("/make-server-edd517d1/child/add-points", async (c) => {
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
    console.log(`Add points error: ${error}`);
    return c.json({ success: false, message: "Failed to add points" }, 500);
  }
});

app.get("/make-server-edd517d1/ranking/:institutionId", async (c) => {
  try {
    const institutionId = c.req.param("institutionId");
    
    const allChildren = await kv.getByPrefix("child:");
    const children = allChildren.filter((child: any) => child.institutionId === institutionId);
    
    // Sort by points descending
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
    console.log(`Ranking error: ${error}`);
    return c.json({ success: false, message: "Failed to get ranking" }, 500);
  }
});

// ==================== Global Ranking (all users across all institutions) ====================
app.get("/make-server-edd517d1/ranking/global", async (c) => {
  try {
    // Collect all children using prefix search
    const allChildren = await kv.getByPrefix("child:");
    
    // Sort by points descending and add rank
    const globalRanking = allChildren
      .sort((a: any, b: any) => (b.points || 0) - (a.points || 0))
      .map((child: any, index: number) => ({
        rank: index + 1,
        name: child.name,
        points: child.points || 0,
        qrId: child.qrId
      }));
    
    return c.json({ success: true, ranking: globalRanking });
  } catch (error) {
    console.log(`Global ranking error: ${error}`);
    return c.json({ success: false, message: "Failed to get global ranking" }, 500);
  }
});

// ==================== Institution Lookup (for parents) ====================
app.post("/make-server-edd517d1/institution/lookup", async (c) => {
  try {
    const { institutionName } = await c.req.json();
    const institutions = await kv.getByPrefix("institution:");
    const found = institutions.find((inst: any) => 
      inst.name.toLowerCase().includes(institutionName.toLowerCase())
    );
    
    if (found) {
      return c.json({ success: true, institution: found });
    }
    
    return c.json({ success: false, message: "Institution not found" }, 404);
  } catch (error) {
    console.log(`Institution lookup error: ${error}`);
    return c.json({ success: false, message: "Failed to lookup institution" }, 500);
  }
});

// Health check endpoint
app.get("/make-server-edd517d1/health", (c) => {
  return c.json({ status: "ok" });
});

Deno.serve(app.fetch);
