import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { v4 as uuidv4 } from "uuid"
import { saveSession } from "@/lib/session-store"
import { mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// Temporary directory for chunks
const TEMP_DIR = join(process.cwd(), "tmp", "uploads")

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileSize, fileType, studioName, numSheets } = await req.json()

    if (!fileName || !fileSize || !studioName || numSheets === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Create temp directory if it doesn't exist
    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true })
    }

    // Set up Google Drive authentication
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/drive"],
    })

    const drive = google.drive({ version: "v3", auth })

    // Create a folder for this studio if it doesn't exist
    const folderName = `${studioName} - ${numSheets} sheets - ${new Date().toISOString().split("T")[0]}`

    // Check if folder already exists
    let folderId = ""
    const folderQuery = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    })

    if (folderQuery.data.files && folderQuery.data.files.length > 0) {
      folderId = folderQuery.data.files[0].id as string
    } else {
      // Create new folder
      const folderMetadata = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID as string],
      }

      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: "id",
      })

      folderId = folder.data.id as string
    }

    if (!folderId) {
      throw new Error("Failed to create or find folder in Google Drive")
    }

    // Generate a unique ID for this upload session
    const uploadId = uuidv4()

    // Create upload directory for this session
    const uploadDir = join(TEMP_DIR, uploadId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Store session info
    await saveSession(uploadId, {
      fileName,
      fileSize,
      fileType,
      folderId,
      chunks: [],
      completed: false,
      uploadDir,
    })

    return NextResponse.json({
      success: true,
      uploadId,
      message: "Upload session started",
    })
  } catch (error) {
    console.error("Upload session error:", error)
    return NextResponse.json({ success: false, error: "Failed to start upload session" }, { status: 500 })
  }
}

