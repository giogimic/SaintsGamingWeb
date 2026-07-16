import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true }
    });

    // Only OWNER level can do this
    if (!user || user.permissionLevel < 1000) {
      return NextResponse.json({ message: "Forbidden: Only Owners can modify database settings." }, { status: 403 });
    }

    const { url } = await req.json();
    if (!url || !url.startsWith("mysql://")) {
      return NextResponse.json({ message: "Invalid MySQL/MariaDB URL provided." }, { status: 400 });
    }
    if (/[\n\r"'$`]/.test(url)) {
      return NextResponse.json({ message: "URL contains invalid characters." }, { status: 400 });
    }

    // 1. Update .env file
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
      // Replace existing DATABASE_URL
      if (envContent.includes("DATABASE_URL=")) {
        envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL="${url}"`);
      } else {
        envContent += `\nDATABASE_URL="${url}"`;
      }
    } else {
      envContent = `DATABASE_URL="${url}"\n`;
    }
    fs.writeFileSync(envPath, envContent);

    // 2. Update schema.prisma provider
    const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
    if (fs.existsSync(schemaPath)) {
      let schemaContent = fs.readFileSync(schemaPath, "utf-8");
      // Replace provider
      schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/g, `provider = "mysql"`);
      fs.writeFileSync(schemaPath, schemaContent);
    } else {
      return NextResponse.json({ message: "schema.prisma not found." }, { status: 500 });
    }

    // 3. Run Prisma Generate and DB Push in the background
    // We cannot reliably await this and respond in time without hanging the request if it fails,
    // but doing it synchronously gives immediate feedback.
    
    try {
      await execAsync("npx prisma db push --accept-data-loss", { env: { ...process.env, DATABASE_URL: url } });
      await execAsync("npx prisma generate");
    } catch (dbErr: unknown) {
      console.error("Migration error:", dbErr);
      return NextResponse.json({ message: "Failed to push schema to MariaDB. Check connection URL and server access." }, { status: 500 });
    }

    return NextResponse.json({ message: "Successfully migrated to MariaDB! Please restart the Next.js process/container to connect." });

  } catch (error: unknown) {
    console.error("Database Migration Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
