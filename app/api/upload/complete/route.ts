import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { readFile, rm } from "fs/promises"
import { Readable } from "stream"
import { getSession, updateSession } from "@/lib/session-store"

export async function POST(req: NextRequest) {
  try {
    const { uploadId } = await req.json()

    if (!uploadId) {
      return NextResponse.json({ success: false, error: "Missing upload ID" }, { status: 400 })
    }

    // Get session info
    const session = await getSession(uploadId)
    if (!session) {
      return NextResponse.json({ success: false, error: "Invalid upload session" }, { status: 400 })
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

    // Sort chunks by index
    session.chunks.sort((a, b) => a.index - b.index)

    // Create file metadata
    const fileMetadata = {
      name: session.fileName,
      parents: [session.folderId],
    }

    try {
      // For large files, use resumable upload
      await drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType: session.fileType,
          body: Readable.from(
            (async function* () {
              for (const chunk of session.chunks) {
                try {
                  const chunkBuffer = await readFile(chunk.path)
                  yield chunkBuffer
                } catch (error) {
                  console.error(`Error reading chunk ${chunk.index}:`, error)
                }
              }
            })(),
          ),
        },
        fields: "id",
      })

      // Mark session as completed
      await updateSession(uploadId, (currentSession) => ({
        ...currentSession,
        completed: true,
      }))

      // Clean up chunks
      try {
        await rm(session.uploadDir, { recursive: true, force: true })
      } catch (error) {
        console.error("Error cleaning up chunks:", error)
      }

      return NextResponse.json({
        success: true,
        message: "File uploaded successfully to Google Drive",
      })
    } catch (error) {
      console.error("Error uploading to Google Drive:", error)
      return NextResponse.json({ success: false, error: "Failed to upload file to Google Drive" }, { status: 500 })
    }
  } catch (error) {
    console.error("Complete upload error:", error)
    return NextResponse.json({ success: false, error: "Failed to complete upload" }, { status: 500 })
  }
}

