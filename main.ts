// Deno Deploy 入口文件
// 用于在 Deno Deploy 上运行座位查询系统

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.208.0/http/file_server.ts";

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") || "MEILIN1!";

// 全局内存缓存
let CACHE_DATA: any[] = [];

// 解析 Excel 文件的函数（简化版，实际可能需要使用 Deno 兼容的 xlsx 库）
// 注意：Deno Deploy 是只读文件系统，数据只能存在内存中
const parseExcelBuffer = async (buffer: ArrayBuffer) => {
  // 这里需要使用 Deno 兼容的 xlsx 解析库
  // 暂时返回空数组，需要后续实现
  console.warn("[Warning] Excel 解析功能需要使用 Deno 兼容的库");
  return [];
};

// 处理 API 请求
const handleRequest = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // CORS 头
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-auth-token",
  };

  // 处理 OPTIONS 预检请求
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // API: 获取数据
  if (pathname === "/api/data" && req.method === "GET") {
    return new Response(
      JSON.stringify({ success: true, data: CACHE_DATA }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // API: 验证口令
  if (pathname === "/api/check-auth" && req.method === "POST") {
    const token = req.headers.get("x-auth-token");
    if (token !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ success: false, message: "口令错误，无权操作" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    return new Response(
      JSON.stringify({ success: true, message: "Verified" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // API: 上传文件
  if (pathname === "/api/upload" && req.method === "POST") {
    const token = req.headers.get("x-auth-token");
    if (token !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ success: false, message: "口令错误，无权操作" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const buffer = await file.arrayBuffer();
      const newData = await parseExcelBuffer(buffer);

      if (newData.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "文件为空或格式不正确（注意：Deno Deploy 环境下 Excel 解析功能有限）",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      CACHE_DATA = newData;
      console.log(`[Upload] 内存数据已更新: ${newData.length} 条记录`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "更新成功！(实时生效，仅存储在内存中)",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  // 静态文件服务 - 托管 dist 目录
  try {
    const response = await serveDir(req, {
      fsRoot: "./dist",
      urlRoot: "",
      showDirListing: false,
      enableCors: true,
    });

    // 如果是 404，返回 index.html (SPA fallback)
    if (response.status === 404) {
      try {
        const indexFile = await Deno.readFile("./dist/index.html");
        return new Response(indexFile, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            ...corsHeaders,
          },
        });
      } catch {
        return new Response("Not Found", { status: 404 });
      }
    }

    return response;
  } catch (error) {
    console.error("静态文件服务错误:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

// 启动服务器
console.log("🚀 Server starting on Deno Deploy...");
console.log("📝 Note: 由于 Deno Deploy 限制，Excel 上传功能需要额外配置");

serve(handleRequest, { port: 8000 });
