import { type NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"
import { getSession, updateSession } from "@/lib/session-store"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const chunk = formData.get("chunk") as File
    const uploadId = formData.get("uploadId") as string
    const chunkIndex = Number.parseInt(formData.get("chunkIndex") as string)
    const totalChunks = Number.parseInt(formData.get("totalChunks") as string)

    if (!chunk || !uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Get session info
    const session = await getSession(uploadId)
    if (!session) {
      return NextResponse.json({ success: false, error: "Invalid upload session" }, { status: 400 })
    }

    // Save chunk to disk
    const chunkPath = join(session.uploadDir, `chunk-${chunkIndex}`)
    const buffer = Buffer.from(await chunk.arrayBuffer())
    await writeFile(chunkPath, buffer)

    // Update session
    await updateSession(uploadId, (currentSession) => {
      const chunks = [...currentSession.chunks]
      chunks.push({
        index: chunkIndex,
        path: chunkPath,
      })
      return {
        ...currentSession,
        chunks,
      }
    })

    // Get updated session to check progress
    const updatedSession = await getSession(uploadId)
    const isComplete = updatedSession.chunks.length === totalChunks

    return NextResponse.json({
      success: true,
      isComplete,
      progress: Math.round((updatedSession.chunks.length / totalChunks) * 100),
      message: `Chunk ${chunkIndex + 1} of ${totalChunks} uploaded`,
    })
  } catch (error) {
    console.error("Chunk upload error:", error)
    return NextResponse.json({ success: false, error: "Failed to upload chunk" }, { status: 500 })
  }
}

