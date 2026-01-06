import { serveDir } from "https://deno.land/std@0.208.0/http/file_server.ts";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs";

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") || "MEILIN1!";
let CACHE_DATA: any[] = [];

// 工具函数：解析 Excel Buffer 并格式化数据
function parseExcelBuffer(buffer: Uint8Array) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet);

  return rawData
    .map((row: any) => {
      const idKey = Object.keys(row).find(
        (k) => k.includes("号") && (k.includes("工") || k.includes("编"))
      );
      const nameKey = Object.keys(row).find((k) => k.includes("名"));
      const seatKey = Object.keys(row).find((k) => k.includes("座"));

      return {
        id: row[idKey || "员工编号"] || "",
        name: row[nameKey || "姓名"] || "",
        seat: row[seatKey || "座位号"] || "",
      };
    })
    .filter((item: any) => item.id && item.name);
}

// 初始化：尝试从本地加载 info.xlsx 数据到内存
async function loadLocalData() {
  try {
    const fileBuffer = await Deno.readFile("info.xlsx");
    CACHE_DATA = parseExcelBuffer(fileBuffer);
    console.log(`[System] 已加载本地数据: ${CACHE_DATA.length} 条记录`);
  } catch (_error) {
    console.log("[System] 本地 info.xlsx 不存在，初始数据为空");
  }
}

// 立即加载一次
await loadLocalData();

// 处理 CORS
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-auth-token",
  };
}

// 验证口令
function checkAuth(req: Request): boolean {
  const token = req.headers.get("x-auth-token");
  return token === ADMIN_PASSWORD;
}

// 处理请求
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // 处理 CORS 预检请求
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // API: 验证口令
  if (pathname === "/api/check-auth" && req.method === "POST") {
    if (!checkAuth(req)) {
      return new Response(
        JSON.stringify({ success: false, message: "口令错误，无权操作" }),
        {
          status: 401,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        }
      );
    }
    return new Response(
      JSON.stringify({ success: true, message: "Verified" }),
      {
        status: 200,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      }
    );
  }

  // API: 获取 Excel 数据
  if (pathname === "/api/data" && req.method === "GET") {
    return new Response(
      JSON.stringify({ success: true, data: CACHE_DATA }),
      {
        status: 200,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      }
    );
  }

  // API: 上传文件
  if (pathname === "/api/upload" && req.method === "POST") {
    if (!checkAuth(req)) {
      return new Response(
        JSON.stringify({ success: false, message: "口令错误，无权操作" }),
        {
          status: 401,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        }
      );
    }

    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return new Response(
          JSON.stringify({ success: false, message: "请选择文件" }),
          {
            status: 400,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          }
        );
      }

      // 读取文件内容
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // 解析并更新内存缓存
      const newData = parseExcelBuffer(buffer);
      if (newData.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "文件为空或格式不正确",
          }),
          {
            status: 400,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          }
        );
      }

      CACHE_DATA = newData;
      console.log(`[Upload] 内存数据已更新: ${newData.length} 条记录`);

      // 尝试写入磁盘（Deno Deploy 上会失败，但不影响功能）
      try {
        await Deno.writeFile("info.xlsx", buffer);
        console.log("[Upload] 文件已持久化到 info.xlsx");
      } catch (_writeErr) {
        console.warn(
          "[Upload Warning] 无法写入磁盘 (只读文件系统)，仅更新了内存数据"
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "更新成功！(实时生效)" }),
        {
          status: 200,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("文件处理失败:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "解析错误: " + (error as Error).message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        }
      );
    }
  }

  // 静态文件服务
  try {
    const response = await serveDir(req, {
      fsRoot: "dist",
      urlRoot: "",
      showDirListing: false,
      enableCors: true,
    });

    // 如果是 404，返回 index.html（SPA 路由）
    if (response.status === 404) {
      const indexHtml = await Deno.readFile("dist/index.html");
      return new Response(indexHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...corsHeaders(),
        },
      });
    }

    return response;
  } catch (_error) {
    // 如果 dist 目录不存在，也返回错误信息
    return new Response("Static files not found. Please run 'npm run build' first.", { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
}

// 使用 Deno.serve（Deno Deploy 推荐的方式）
Deno.serve(handler);
